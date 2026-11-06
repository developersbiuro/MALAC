import crypto from "crypto";
import User from "../models/User.js";
import OtpToken from "../models/OtpToken.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import CustomerPasswordReset from "../models/CustomerPasswordReset.js";
import env from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { normalizePhone, phoneLast10 } from "../utils/phone.js";
import { isVerifiedCustomer } from "../utils/verification.js";
import { effectivePermissions } from "../utils/permissions.js";
import { requestOtp, verifyOtp } from "../services/otpService.js";
import { loginLockStatus, recordLoginFailure, clearLoginFailures } from "../utils/loginGuard.js";
import { verifyGoogleCredential } from "../services/googleAuthService.js";
import { createResetRequest, RESET_TOKEN_TTL_MINUTES } from "../services/passwordResetService.js";
import { sendEmail } from "../services/emailService.js";
import { actionLinkEmail } from "../services/emailTemplates.js";

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  // Effective section permissions (utils/permissions.js): Super Admin =
  // all keys, Vice-Admin = their explicitly granted set (the legacy
  // default only when no choice was ever saved), customers = [].
  // The admin client gates sidebar/pages/buttons on this.
  permissions: effectivePermissions(u),
  // Alternate phone on the same account ("" when unset); every
  // phone-identifier login path matches it as well as `phone`.
  secondaryPhone: u.secondaryPhone || "",
  addresses: u.addresses, emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified, avatar: u.avatar || "",
  accountStatus: u.accountStatus || "active",
  // True only when a password credential is loaded on the document (the
  // /me handler re-fetches with +passwordHash); lets the Profile Settings
  // page decide whether to offer "change password" at all.
  hasPassword: Boolean(u.passwordHash),
});

const STAFF_ROLES = ["admin", "vice-admin"];
const isStaffUser = (u) => u && STAFF_ROLES.includes(u.role);

// A typed phone identifier resolves to an account when it matches the
// PRIMARY phone or the ALTERNATE phone (secondaryPhone), in the raw
// shape typed or normalized (+92…). Both numbers sign in to the same
// account; an OTP requested with the alternate number is sent to it.
const phoneIdentifierLookup = (raw) => {
  const normalized = normalizePhone(raw);
  return {
    $or: [
      { phone: raw }, { phone: normalized },
      { secondaryPhone: raw }, { secondaryPhone: normalized },
    ],
  };
};

// -- Credential-attack defences shared by the password sign-ins --
// Failure answers are UNIFIED: unknown identifier, account without a
// password, wrong-role account and wrong password all return the same
// status and message, so the endpoints cannot be used to enumerate
// which emails/phones have accounts or how they sign in. A throwaway
// scrypt verification runs on the no-account paths so response timing
// does not leak the difference either. Repeated failures additionally
// trip the per-account lockout (utils/loginGuard.js); the lock answer
// is 429 and points at OTP sign-in, which is never locked.
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(16).toString("hex"));
const burnPasswordCycle = (password) => { verifyPassword(password || "", DUMMY_PASSWORD_HASH); };
const lockedResponse = (res, lock) => res.status(429).json({
  message: `Too many failed sign-in attempts. This account is temporarily locked — try again in about ${Math.max(1, Math.ceil(lock.retryAfterSec / 60))} minute(s), or sign in with a one-time code.`,
});

const MIN_PASSWORD_LENGTH = 8;
const passwordError = (password) =>
  !password || String(password).length < MIN_PASSWORD_LENGTH
    ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    : null;

// Customer verification is ONE-method (see utils/verification.js): the
// single channel chosen at sign-up — email OTP or WhatsApp OTP — or a
// Google identity. The shared predicate is isVerifiedCustomer.

// -- Sign-up (Daraz-style, ONE method) --
// The customer picks exactly ONE way to register and verifies ONLY that
// one channel:
//   method "email": name + email + password      -> code emailed to them
//   method "phone": name + phone + password      -> code sent on WhatsApp
// ("Continue with Google" is the third way — see googleLogin; it creates
// the account instantly with no OTP at all.)
// NOTE: any "role" sent in a sign-up request body is deliberately IGNORED.
// Public sign-up can only ever produce a customer — see signupVerify.
export const signupStart = asyncHandler(async (req, res) => {
  const { method, password } = req.body;
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });
  if (!["email", "phone"].includes(method)) {
    return res.status(400).json({ message: "method must be 'email' or 'phone'" });
  }
  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  // The pending registration rides on the OTP record (models/OtpToken):
  // the password is stored there ONLY as its scrypt hash, and the record
  // TTL-expires if the code is never verified — no account exists yet.
  const pending = { name, passwordHash: hashPassword(password) };

  if (method === "email") {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "email is required" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "An account with this email already exists. Please log in." });
    const result = await requestOtp({ identifier: email, channel: "email", purpose: "signup", pending });
    return res.json({ step: "verify", method, channel: "email", identifier: email, ...result });
  }

  const phone = normalizePhone(req.body.phone);
  if (phoneLast10(phone).length < 10) {
    return res.status(400).json({ message: "Please enter a valid phone number" });
  }
  const channel = req.body.channel === "sms" ? "sms" : "whatsapp";
  const existing = await User.findOne({ phone });
  if (existing) return res.status(409).json({ message: "An account with this phone number already exists. Please log in." });
  const result = await requestOtp({ identifier: phone, channel, purpose: "signup", phone, pending });
  res.json({ step: "verify", method, channel, identifier: phone, ...result });
});

// -- Sign-up: verify the ONE code -> create the account --
// ROLE RULE (the only place a public flow can yield a staff role): the
// role is "admin" ONLY when the verified EMAIL is exactly the configured
// SUPER_ADMIN_EMAIL allowlist entry — elevation is possible solely via
// the email method, where the owner proves ownership of that mailbox.
// Phone-method sign-ups are always customers. The account is created
// ONLY NOW, after the single chosen OTP verifies, with ONLY that
// channel marked verified — so an abandoned sign-up never leaves behind
// an account that could sign in or order. The User schema requires both
// an email and a phone, so the identifier the customer did NOT register
// with is a clearly synthetic placeholder, exactly like Google accounts
// already store "google-<id>" as their phone.
export const signupVerify = asyncHandler(async (req, res) => {
  const { method, code } = req.body;
  if (!["email", "phone"].includes(method)) {
    return res.status(400).json({ message: "method must be 'email' or 'phone'" });
  }
  const isEmail = method === "email";
  const identifier = isEmail
    ? String(req.body.email || "").toLowerCase().trim()
    : normalizePhone(req.body.phone);
  const channel = isEmail ? "email" : req.body.channel === "sms" ? "sms" : "whatsapp";
  if (!identifier) return res.status(400).json({ message: `${method} is required` });

  const check = await verifyOtp({ identifier, channel, purpose: "signup", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  // The token verifyOtp just consumed carries the pending registration.
  const token = await OtpToken.findOne({ identifier, channel, purpose: "signup" }).sort({ createdAt: -1 });
  if (!token?.pendingName || !token?.pendingPasswordHash) {
    return res.status(400).json({ message: "Sign-up session expired. Please start sign-up again." });
  }
  const existing = await User.findOne(isEmail ? { email: identifier } : { phone: identifier });
  if (existing) return res.status(409).json({ message: "An account with this email or phone already exists" });

  const isOwnerAllowlist = isEmail && identifier === env.superAdminEmail;
  const user = await User.create({
    name: token.pendingName,
    email: isEmail ? identifier : `phone-${identifier.replace(/\D/g, "")}@malac.local`,
    phone: isEmail ? `email-${crypto.randomBytes(8).toString("hex")}` : identifier,
    emailVerified: isEmail,
    phoneVerified: !isEmail,
    passwordHash: token.pendingPasswordHash,
    role: isOwnerAllowlist ? "admin" : "customer",
  });
  res.status(201).json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: one-time code (email or phone) — the passwordless alternative
// to email+password sign-in, kept working alongside it. --
export const loginOtp = asyncHandler(async (req, res) => {
  const { identifier, channel = "email" } = req.body;
  const user = await User.findOne(channel === "email" ? { email: identifier } : phoneIdentifierLookup(identifier));
  // No account: answer with the SAME success shape as a real send (and
  // create/send nothing) so this endpoint cannot be used to enumerate
  // registered emails/phones. A code entered for such an identifier
  // then fails verification with the generic invalid-code message.
  if (!user) return res.json({ sent: true, channel });
  const result = await requestOtp({
    // On a phone channel the code is delivered to the number the user
    // typed — when that is the account's alternate number, the code goes
    // to the alternate number, not the primary.
    identifier, channel, purpose: "login", phone: channel === "email" ? user.phone : normalizePhone(identifier),
  });
  res.json(result);
});

export const loginVerify = asyncHandler(async (req, res) => {
  const { identifier, channel = "email", code } = req.body;
  const check = await verifyOtp({ identifier, channel, purpose: "login", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const user = await User.findOne(channel === "email" ? { email: identifier } : phoneIdentifierLookup(identifier));
  if (!user) return res.status(404).json({ message: "No account found. Please sign up first." });
  // Defense in depth: a customer whose one sign-up verification was never
  // completed must not be able to sign in. (Accounts are only created
  // after that verification, so this can only trip on partial/legacy rows.)
  if (!isStaffUser(user) && !isVerifiedCustomer(user)) {
    return res.status(403).json({ message: "Please complete sign-up verification before signing in." });
  }
  res.json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: password (CUSTOMERS only) --
// The customer counterpart of the staff endpoint below, kept strictly
// separate: this one REFUSES staff accounts (staff must use the Admin
// Login), and the staff one refuses customers. A customer signs in with
// the password chosen at sign-up, using EITHER identifier they registered
// with — their email or their phone number ({ identifier, password };
// { email, password } is also accepted for older clients). Customers who
// signed up via Google have no password and keep using Google / OTP.
export const loginCustomerPassword = asyncHandler(async (req, res) => {
  const rawIdentifier = String(req.body.identifier || req.body.email || "").trim();
  const { password } = req.body;
  if (!rawIdentifier || !password) return res.status(400).json({ message: "identifier and password are required" });
  const isEmailId = rawIdentifier.includes("@");
  const lookup = isEmailId
    ? { email: rawIdentifier.toLowerCase() }
    : phoneIdentifierLookup(rawIdentifier);
  const user = await User.findOne(lookup).select("+passwordHash");
  // Unified failure (see the defences note above): unknown identifier,
  // staff account, password-less account and wrong password are
  // indistinguishable. Staff are still refused here — just without a
  // message that confirms the account is a staff one.
  const fail = () => res.status(401).json({
    message: "Invalid credentials. If you usually sign in with Google or a one-time code, please use that method instead.",
  });
  if (!user || !user.passwordHash || isStaffUser(user)) {
    burnPasswordCycle(password);
    return fail();
  }
  const lockKey = `user:${user._id}`;
  const lock = loginLockStatus(lockKey);
  if (lock.locked) return lockedResponse(res, lock);
  if (!verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(lockKey);
    return fail();
  }
  // The verification gate is checked only AFTER the password proves
  // out — before that, revealing it would confirm the account exists.
  if (!isVerifiedCustomer(user)) {
    return res.status(403).json({ message: "Please complete sign-up verification before signing in." });
  }
  clearLoginFailures(lockKey);
  res.json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: password (STAFF accounts only) --
// Staff passwords are set exclusively through the approval-gated reset
// flow below — there is no public "set password" or admin-registration
// endpoint for staff. Customers use /login/customer-password instead;
// this endpoint keeps refusing them.
export const loginPassword = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: "identifier and password are required" });
  const user = await User.findOne({
    $or: [{ email: identifier }, ...phoneIdentifierLookup(identifier).$or],
  }).select("+passwordHash");
  // Unified failure (see the defences note above): unknown identifier,
  // customer account, password-less staff account and wrong password
  // are indistinguishable — this endpoint no longer confirms that an
  // identifier belongs to a staff account. The hint in the message is
  // generic guidance, identical in every failure case.
  const fail = () => res.status(401).json({
    message: "Invalid credentials. If you have not set a password yet, sign in with a one-time code or use Forgot password.",
  });
  if (!user || !isStaffUser(user) || !user.passwordHash) {
    burnPasswordCycle(password);
    return fail();
  }
  const lockKey = `user:${user._id}`;
  const lock = loginLockStatus(lockKey);
  if (lock.locked) return lockedResponse(res, lock);
  if (!verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(lockKey);
    return fail();
  }
  clearLoginFailures(lockKey);
  res.json({ user: publicUser(user), token: generateToken(user) });
});

// -- Forgot password (staff): request -> Super Admin approval -> reset --
// Step 1: a staff member submits their email. For Vice-Admins this only
// creates a PENDING request — nothing can change their password until the
// Super Admin approves it in Admin -> Roles & Users (the token is generated
// at approval time and emailed). For the Super Admin himself there is no
// other approver: his request is auto-approved and completed with a
// verified email OTP sent to SUPER_ADMIN_EMAIL (step 2a). This
// approval-gated flow stays STAFF-only: nothing is created for customer
// emails (a customer who forgets their password can always sign in with
// OTP instead — no approval gate applies to customers). The response is
// generic so it does not reveal whether an account exists.
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ message: "email is required" });
  const generic = {
    message: "If this email belongs to a MALAC staff account, the password reset process has started.",
  };
  const user = await User.findOne({ email });
  if (!user || !isStaffUser(user)) return res.json(generic);

  if (user.role === "admin" && email === env.superAdminEmail) {
    // Owner self-service: auto-approved record + verified email OTP.
    await createResetRequest(user, { autoApproved: true });
    const result = await requestOtp({ identifier: email, channel: "email", purpose: "password_reset" });
    return res.json({
      ...generic,
      flow: "owner-otp",
      message: "Super Admin account: enter the verification code sent to your email to set a new password.",
      ...result,
    });
  }

  await createResetRequest(user);
  res.json({
    ...generic,
    flow: "approval",
    message: "Reset request submitted. The Super Admin must approve it in the Admin Panel before a reset link is sent to your email.",
  });
});

// Step 2a (Super Admin only): verify the email OTP + set the new password.
export const verifyOwnerPasswordReset = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const { code, newPassword } = req.body;
  if (email !== env.superAdminEmail) {
    return res.status(403).json({ message: "This flow is only for the Super Admin account" });
  }
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }
  const user = await User.findOne({ email, role: "admin" });
  if (!user) return res.status(404).json({ message: "Super Admin account not found" });
  const request = await PasswordResetRequest.findOne({
    user: user._id, status: "approved", autoApproved: true,
  }).sort({ createdAt: -1 });
  if (!request) return res.status(400).json({ message: "No active reset request. Please request a reset first." });
  const check = await verifyOtp({ identifier: email, channel: "email", purpose: "password_reset", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  user.passwordHash = hashPassword(newPassword);
  user.accountStatus = "active";
  await user.save();
  request.status = "used";
  await request.save();
  res.json({ message: "Password updated. You can now sign in to the Admin Panel with your new password." });
});

// Step 2b (Vice-Admin, after Super Admin approval): consume the emailed
// one-time token and set the new password. Unapproved, rejected, expired
// or already-used requests can never change a password.
export const completePasswordReset = asyncHandler(async (req, res) => {
  const { token, email, newPassword } = req.body;
  if (!token) return res.status(400).json({ message: "Reset token is required" });
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }
  const request = await PasswordResetRequest.findOne({
    resetTokenHash: PasswordResetRequest.hashToken(token),
  });
  if (!request || request.status !== "approved") {
    return res.status(400).json({ message: "This reset link is invalid, not approved, or has already been used" });
  }
  if (email && request.email !== String(email).toLowerCase().trim()) {
    return res.status(400).json({ message: "This reset link does not belong to that email" });
  }
  if (!request.resetTokenExpiresAt || request.resetTokenExpiresAt < new Date()) {
    return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
  }
  const user = await User.findById(request.user);
  if (!user) return res.status(404).json({ message: "Account not found" });
  user.passwordHash = hashPassword(newPassword);
  user.accountStatus = "active";
  await user.save();
  request.status = "used";
  request.resetTokenHash = undefined;
  request.resetTokenExpiresAt = undefined;
  await request.save();
  res.json({ message: "Password updated. You can now sign in to the Admin Panel with your new password." });
});

// -- Forgot password (CUSTOMERS): emailed reset link, self-service --
// The customer counterpart of the staff flow above, deliberately separate:
// staff resets stay approval-gated (Super Admin approves before any token
// exists), while a customer proves account ownership by controlling the
// email inbox, so their link is issued immediately — no approval, and no
// staff record is ever created here (tokens live in CustomerPasswordReset,
// never in the staff PasswordResetRequest queue).
// Step 1: accept an email and ALWAYS answer with the same generic message
// so the endpoint cannot be used to probe which emails have accounts. A
// link is emailed only when a CUSTOMER account with that exact email
// exists. Google-only customers (no password yet) also get the link —
// the token itself proves email ownership, and setting a first password
// with it is safe. Phone-method customers have a synthetic
// "phone-<digits>@malac.local" mailbox that can never receive mail; those
// addresses are skipped (they sign in with a one-time code instead).
export const forgotCustomerPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ message: "email is required" });
  const generic = {
    message: "If an account exists for this email, a password reset link has been sent.",
  };
  if (email.endsWith("@malac.local")) return res.json(generic);
  const user = await User.findOne({ email });
  if (!user || isStaffUser(user)) return res.json(generic);

  // Only the newest link may live: drop any earlier unused tokens.
  await CustomerPasswordReset.deleteMany({ user: user._id, usedAt: null });
  const token = crypto.randomBytes(32).toString("hex");
  await CustomerPasswordReset.create({
    user: user._id,
    email,
    tokenHash: CustomerPasswordReset.hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  });
  const link = `${env.clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}&type=customer`;
  try {
    const mail = actionLinkEmail({
      heading: "Reset your password",
      intro: "You requested a password reset for your MALAC account.",
      buttonLabel: "Reset my password",
      url: link,
      expiryNote: `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
      text:
        `You requested a password reset for your MALAC account.\n` +
        `Set a new password within ${RESET_TOKEN_TTL_MINUTES} minutes using this link:\n${link}\n` +
        `If you did not request this, ignore this email — your password will not change.`,
    });
    await sendEmail({
      to: email,
      subject: "Reset your MALAC password",
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    // Email not configured / send failed: log honestly server-side, but
    // the response stays generic so it never reveals account existence.
    console.error(`Customer password reset email to ${email} failed: ${err.message}`);
  }
  res.json(generic);
});

// Step 2: consume the emailed one-time token and set the new password.
// Mirrors completePasswordReset (hash lookup, expiry check, single-use,
// scrypt via hashPassword). Sessions here are stateless JWTs with no
// revocation list — the existing password flows do not revoke them
// either, so neither does this one; the old password simply stops working.
export const resetCustomerPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token) return res.status(400).json({ message: "Reset token is required" });
  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const record = await CustomerPasswordReset.findOne({
    tokenHash: CustomerPasswordReset.hashToken(token),
  });
  if (!record || record.usedAt) {
    return res.status(400).json({ message: "This reset link is invalid or has already been used" });
  }
  if (!record.expiresAt || record.expiresAt < new Date()) {
    return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
  }
  const user = await User.findById(record.user);
  if (!user) return res.status(404).json({ message: "Account not found" });
  // Defense in depth: this endpoint can never reset a staff password —
  // staff resets stay on the approval-gated flow above.
  if (isStaffUser(user)) {
    return res.status(400).json({ message: "This reset link is invalid or has already been used" });
  }
  user.passwordHash = hashPassword(password);
  await user.save();
  record.usedAt = new Date();
  await record.save();
  res.json({ message: "Password updated. You can now log in with your new password." });
});

// -- Login with Google --
// SECURITY: Google sign-in is for CUSTOMERS only. A Google identity whose
// email matches a staff account is refused here — staff must use the Admin
// Login (OTP or password). Only a verified Google ID token is accepted —
// an unverified typed profile can never claim the owner's email.
export const googleLogin = asyncHandler(async (req, res) => {
  const profile = await verifyGoogleCredential(req.body);
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
  if (user && isStaffUser(user)) {
    return res.status(403).json({ message: "Staff accounts cannot sign in with Google. Please use the Admin Login." });
  }
  if (!user) {
    user = await User.create({
      name: profile.name, email: profile.email,
      phone: `google-${profile.googleId}`.slice(0, 30),
      googleId: profile.googleId, avatar: profile.avatar,
      emailVerified: true, phoneVerified: false, role: "customer",
    });
  } else if (!user.googleId) {
    user.googleId = profile.googleId; user.emailVerified = true; await user.save();
  }
  res.json({ user: publicUser(user), token: generateToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  // Re-fetch with the password hash selected so hasPassword is accurate
  // (passwordHash is select:false and `protect` does not load it).
  const full = await User.findById(req.user._id).select("+passwordHash");
  res.json({ user: publicUser(full || req.user) });
});

// -- Profile settings (signed-in users, own account only) --
// Only the display name is editable through THIS endpoint. Email and
// phone are the account's OTP-verified identities: they change only
// through the OTP-verified change flows further below, never by simply
// typing a new value here.
export const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Name cannot be empty" });
  req.user.name = name;
  await req.user.save();
  const full = await User.findById(req.user._id).select("+passwordHash");
  res.json({ user: publicUser(full || req.user) });
});

// Change password: only for accounts that HAVE one (customers who chose
// a password at sign-up; staff who set one via the approval-gated reset).
// Google / OTP-only accounts have no passwordHash and get a clear 400 —
// they keep signing in with Google or a one-time code.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ message: "Current password is required" });
  const pwErr = passwordError(newPassword);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user || !user.passwordHash) {
    return res.status(400).json({
      message: "No password is set for this account. You sign in with Google or a one-time code instead.",
    });
  }
  // Wrong-current-password guesses feed the same per-account lockout as
  // the sign-in endpoints (a stolen session must not become an offline-
  // speed password oracle either).
  const lockKey = `user:${user._id}`;
  const lock = loginLockStatus(lockKey);
  if (lock.locked) return lockedResponse(res, lock);
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    recordLoginFailure(lockKey);
    return res.status(401).json({ message: "Current password is incorrect" });
  }
  user.passwordHash = hashPassword(newPassword);
  await user.save();
  clearLoginFailures(lockKey);
  res.json({ message: "Password updated." });
});

// -- Address book: add is above (addAddress); edit/delete below. Every
// handler operates only on req.user's own address subdocuments. --
// lat/lng/mapsUrl carry the optional live-location pin. Coordinates are
// range-checked and invalid values are dropped (never stored, never an
// error); an explicit null clears a previously saved pin.
const ADDRESS_FIELDS = ["label", "fullName", "phone", "province", "city", "area", "street", "postalCode", "lat", "lng", "mapsUrl"];

const validCoord = (value, min, max) => {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

// Whitelisted, sanitized copy of the address fields present in `body`.
function pickAddressFields(body) {
  const out = {};
  for (const field of ADDRESS_FIELDS) {
    if (body[field] === undefined) continue;
    if (field === "lat" || field === "lng") {
      if (body[field] === null) { out[field] = null; continue; } // explicit clear
      const n = validCoord(body[field], field === "lat" ? -90 : -180, field === "lat" ? 90 : 180);
      if (n !== undefined) out[field] = n;
    } else if (field === "mapsUrl") {
      if (body[field] === null) out[field] = null;
      else if (typeof body[field] === "string") out[field] = body[field].slice(0, 500);
    } else {
      out[field] = body[field];
    }
  }
  return out;
}

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  for (const [field, value] of Object.entries(pickAddressFields(req.body))) {
    address[field] = value === null ? undefined : value;
  }
  if (req.body.isDefault !== undefined) {
    address.isDefault = Boolean(req.body.isDefault);
    if (address.isDefault) {
      req.user.addresses.forEach((a) => { if (!a._id.equals(address._id)) a.isDefault = false; });
    }
  }
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  address.deleteOne();
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  const fields = pickAddressFields(req.body);
  for (const field of ["lat", "lng", "mapsUrl"]) if (fields[field] === null) delete fields[field];
  req.user.addresses.push({ ...fields, isDefault: Boolean(req.body.isDefault) });
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});

// -- Profile photo (avatar) --
// The photo is stored ON the user record as a base64 data URI: the
// server runs on serverless infrastructure with an ephemeral
// filesystem, so a file written to disk (the catalog/screenshot model)
// could vanish with the function instance — the same reasoning that
// ships the brand logo as data URIs. The route's memory-storage multer
// caps the upload at 400 KB and verifyImageBufferMagicBytes has already
// confirmed the bytes really are a PNG/JPEG/WebP and recorded the
// detected type; the client downscales to at most 512×512 JPEG before
// sending, so the stored string stays small.
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file received" });
  const mime = req.file.detectedImage?.mime || "image/jpeg";
  req.user.avatar = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
  await req.user.save();
  const full = await User.findById(req.user._id).select("+passwordHash");
  res.json({ user: publicUser(full || req.user) });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  req.user.avatar = "";
  await req.user.save();
  const full = await User.findById(req.user._id).select("+passwordHash");
  res.json({ user: publicUser(full || req.user) });
});

// -- Change phone / email: OTP-verified (signed-in users, own account) --
// Email and phone are sign-in identities, so changing one takes the
// same proof as registering it: a one-time code sent to the NEW value
// (WhatsApp for a phone, email for an email) through the same OTP
// machinery as sign-up (hashed codes, 10-minute expiry, attempt caps —
// services/otpService.js), under its own purposes so a sign-up/login
// code can never be replayed here. The pending token is also BOUND to
// the requesting account (OtpToken.userId): even if two accounts race
// to claim the same new identifier, only the account that requested
// its code can complete the change with it. Uniqueness is re-checked
// at verify time, immediately before the value is applied. Neither
// flow touches the other identifier, so a synthetic placeholder
// (phone-<digits>@malac.local / email-<hex>) simply stays in place.
const OTP_CODE_INVALID = "Invalid or expired verification code";

// A channel whose provider is not configured must fail HONESTLY (503)
// — never a fake "code sent". requestOtp preserves the WhatsApp
// sender's coded error (WHATSAPP_NOT_CONFIGURED) and folds the email
// one into a "… OTP is not configured" message; both shapes land here.
const otpSendFailure = (res, err, channelLabel) => {
  if (err?.code?.endsWith("_NOT_CONFIGURED") || /is not configured/i.test(err?.message || "")) {
    return res.status(503).json({
      code: "OTP_NOT_CONFIGURED",
      message: `${channelLabel} OTP is not available right now. Please try again later.`,
    });
  }
  throw err;
};

// The pending-change token for (identifier, channel, purpose) must
// exist AND belong to the signed-in account; anything else answers
// with the generic code error so the check leaks nothing.
const pendingChangeBelongsTo = async ({ identifier, channel, purpose, userId }) => {
  const token = await OtpToken.findOne({
    identifier, channel, purpose, consumed: false,
  }).sort({ createdAt: -1 });
  return Boolean(token) && String(token.userId || "") === String(userId);
};

// Another account already holding this phone — as its primary OR its
// alternate number (both are login identifiers for that account).
const phoneHeldByOther = (phone, userId) =>
  User.findOne({ _id: { $ne: userId }, $or: [{ phone }, { secondaryPhone: phone }] });

export const changePhoneStart = asyncHandler(async (req, res) => {
  const newPhone = normalizePhone(req.body.newPhone);
  if (phoneLast10(newPhone).length < 10) {
    return res.status(400).json({ message: "Please enter a valid phone number" });
  }
  if (newPhone === req.user.phone) {
    return res.status(400).json({ message: "This is already your phone number" });
  }
  if (await phoneHeldByOther(newPhone, req.user._id)) {
    return res.status(409).json({ message: "An account with this phone number already exists." });
  }
  try {
    const result = await requestOtp({
      identifier: newPhone, channel: "whatsapp", purpose: "phone_change",
      phone: newPhone, userId: req.user._id,
    });
    return res.json({ step: "verify", channel: "whatsapp", identifier: newPhone, ...result });
  } catch (err) {
    return otpSendFailure(res, err, "WhatsApp");
  }
});

export const changePhoneVerify = asyncHandler(async (req, res) => {
  const newPhone = normalizePhone(req.body.newPhone);
  if (phoneLast10(newPhone).length < 10) {
    return res.status(400).json({ message: "Please enter a valid phone number" });
  }
  if (!await pendingChangeBelongsTo({
    identifier: newPhone, channel: "whatsapp", purpose: "phone_change", userId: req.user._id,
  })) {
    return res.status(400).json({ message: OTP_CODE_INVALID });
  }
  if (await phoneHeldByOther(newPhone, req.user._id)) {
    return res.status(409).json({ message: "An account with this phone number already exists." });
  }
  const check = await verifyOtp({
    identifier: newPhone, channel: "whatsapp", purpose: "phone_change", code: req.body.code,
  });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const user = await User.findById(req.user._id).select("+passwordHash");
  user.phone = newPhone;
  user.phoneVerified = true;
  // The new primary must not linger as the same account's alternate.
  if (user.secondaryPhone === newPhone) user.secondaryPhone = "";
  await user.save();
  res.json({ user: publicUser(user) });
});

const emailHeldByOther = (email, userId) =>
  User.findOne({ _id: { $ne: userId }, email });

export const changeEmailStart = asyncHandler(async (req, res) => {
  const newEmail = String(req.body.newEmail || "").toLowerCase().trim();
  // The synthetic @malac.local mailboxes are internal placeholders that
  // can never receive mail, so they are not valid change targets either.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.endsWith("@malac.local")) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }
  if (newEmail === req.user.email) {
    return res.status(400).json({ message: "This is already your email address" });
  }
  if (await emailHeldByOther(newEmail, req.user._id)) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }
  try {
    const result = await requestOtp({
      identifier: newEmail, channel: "email", purpose: "email_change", userId: req.user._id,
    });
    return res.json({ step: "verify", channel: "email", identifier: newEmail, ...result });
  } catch (err) {
    return otpSendFailure(res, err, "Email");
  }
});

export const changeEmailVerify = asyncHandler(async (req, res) => {
  const newEmail = String(req.body.newEmail || "").toLowerCase().trim();
  if (!newEmail) return res.status(400).json({ message: OTP_CODE_INVALID });
  if (!await pendingChangeBelongsTo({
    identifier: newEmail, channel: "email", purpose: "email_change", userId: req.user._id,
  })) {
    return res.status(400).json({ message: OTP_CODE_INVALID });
  }
  if (await emailHeldByOther(newEmail, req.user._id)) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }
  const check = await verifyOtp({
    identifier: newEmail, channel: "email", purpose: "email_change", code: req.body.code,
  });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const user = await User.findById(req.user._id).select("+passwordHash");
  user.email = newEmail;
  user.emailVerified = true;
  await user.save();
  res.json({ user: publicUser(user) });
});
