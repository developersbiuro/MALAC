import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import env from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { requestOtp, verifyOtp } from "../services/otpService.js";
import { verifyGoogleCredential } from "../services/googleAuthService.js";
import { createResetRequest } from "../services/passwordResetService.js";

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
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

const MIN_PASSWORD_LENGTH = 8;
const passwordError = (password) =>
  !password || String(password).length < MIN_PASSWORD_LENGTH
    ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    : null;

// A customer account counts as fully verified only when BOTH sign-up OTPs
// were completed. Google accounts are exempt from the phone half: their
// identity (and email) was verified by Google, and they hold no real phone.
const isFullyVerified = (u) =>
  Boolean(u.googleId) || (u.emailVerified && u.phoneVerified);

// -- Sign-up: step 1, email OTP --
// The customer registers with email + password (owner-specified flow): the
// password is chosen here, validated up front, and re-sent at the final
// step — it is only hashed and stored when the account is created, after
// BOTH OTP verifications (see signupVerifyPhone).
// NOTE: any "role" sent in a sign-up request body is deliberately IGNORED.
// Public sign-up can only ever produce a customer — see signupVerifyPhone.
export const signupEmailOtp = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ message: "name, email and phone are required" });
  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ message: "An account with this email or phone already exists" });
  const result = await requestOtp({ identifier: email, channel: "email", purpose: "signup" });
  res.json({ step: "verify-email", ...result });
});

// -- Sign-up: step 2, verify email OTP, then request phone OTP --
export const signupVerifyEmail = asyncHandler(async (req, res) => {
  const { email, code, channel } = req.body; // channel: "whatsapp" | "sms"
  const check = await verifyOtp({ identifier: email, channel: "email", purpose: "signup", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  res.json({ step: "phone-otp-required", message: "Email verified. Now verify your phone.", channel: channel || "whatsapp" });
});

export const signupPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, channel = "whatsapp" } = req.body;
  if (!["whatsapp", "sms"].includes(channel)) return res.status(400).json({ message: "channel must be whatsapp or sms" });
  const result = await requestOtp({ identifier: phone, channel, purpose: "signup", phone });
  res.json({ step: "verify-phone", ...result });
});

// -- Sign-up: step 3, verify phone OTP -> create the account --
// ROLE RULE (the only place a public flow can yield a staff role): the role
// is "admin" ONLY when the verified email is exactly the configured
// SUPER_ADMIN_EMAIL allowlist entry — i.e. the store owner proving ownership
// of that email AND phone via both OTPs. Every other sign-up is a customer.
export const signupVerifyPhone = asyncHandler(async (req, res) => {
  const { name, email, phone, password, code, channel = "whatsapp" } = req.body;
  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const check = await verifyOtp({ identifier: phone, channel, purpose: "signup", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ message: "An account with this email or phone already exists" });
  const isOwnerAllowlist = String(email).toLowerCase() === env.superAdminEmail;
  // The account is created ONLY NOW — after email OTP (step 2) and phone
  // OTP (this step) have both verified — so an unverified sign-up never
  // leaves behind an account that could sign in or order. The password
  // chosen at step 1 is stored as a scrypt hash, never in plain text.
  // The allowlist account gets its password exactly the same way.
  const user = await User.create({
    name, email, phone, emailVerified: true, phoneVerified: true,
    passwordHash: hashPassword(password),
    role: isOwnerAllowlist ? "admin" : "customer",
  });
  res.status(201).json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: one-time code (email or phone) — the passwordless alternative
// to email+password sign-in, kept working alongside it. --
export const loginOtp = asyncHandler(async (req, res) => {
  const { identifier, channel = "email" } = req.body;
  const user = await User.findOne(channel === "email" ? { email: identifier } : { phone: identifier });
  if (!user) return res.status(404).json({ message: "No account found. Please sign up first." });
  const result = await requestOtp({
    identifier, channel, purpose: "login", phone: channel === "email" ? user.phone : identifier,
  });
  res.json(result);
});

export const loginVerify = asyncHandler(async (req, res) => {
  const { identifier, channel = "email", code } = req.body;
  const check = await verifyOtp({ identifier, channel, purpose: "login", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const user = await User.findOne(channel === "email" ? { email: identifier } : { phone: identifier });
  if (!user) return res.status(404).json({ message: "No account found. Please sign up first." });
  // Defense in depth: a non-Google customer whose sign-up OTPs were never
  // both verified must not be able to sign in. (Accounts are only created
  // after both verifications, so this can only trip on partial/legacy rows.)
  if (!isStaffUser(user) && !isFullyVerified(user)) {
    return res.status(403).json({ message: "Please complete sign-up verification (email and phone) before signing in." });
  }
  res.json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: password (CUSTOMERS only) --
// The customer counterpart of the staff endpoint below, kept strictly
// separate: this one REFUSES staff accounts (staff must use the Admin
// Login), and the staff one refuses customers. A customer signs in with
// the password chosen at sign-up — but only once the account is fully
// verified (email OTP + phone OTP). Customers who signed up via Google
// have no password and keep using Google / OTP sign-in.
export const loginCustomerPassword = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: "identifier and password are required" });
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select("+passwordHash");
  if (user && isStaffUser(user)) {
    return res.status(403).json({ message: "Staff accounts must sign in from the Admin Login." });
  }
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "No password is set for this account. Sign in with OTP or Google instead." });
  }
  if (!isFullyVerified(user)) {
    return res.status(403).json({ message: "Please complete sign-up verification (email and phone) before signing in." });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: "Incorrect password" });
  }
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
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select("+passwordHash");
  if (!user || !isStaffUser(user)) {
    return res.status(401).json({ message: "Password sign-in here is for MALAC staff accounts. Customers sign in from the customer Login page." });
  }
  if (!user.passwordHash) {
    return res.status(401).json({ message: "No password is set for this account yet. Use OTP sign-in, or use Forgot password to set one." });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: "Incorrect password" });
  }
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

// -- Login with Google --
// SECURITY: Google sign-in is for CUSTOMERS only. A Google identity whose
// email matches a staff account is refused here — staff must use the Admin
// Login (OTP or password). This also closes the demo-mode hole where an
// unverified typed profile could claim the owner's email.
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
  res.json({ user: publicUser(user), token: generateToken(user), demo: profile.demo });
});

export const me = asyncHandler(async (req, res) => {
  // Re-fetch with the password hash selected so hasPassword is accurate
  // (passwordHash is select:false and `protect` does not load it).
  const full = await User.findById(req.user._id).select("+passwordHash");
  res.json({ user: publicUser(full || req.user) });
});

// -- Profile settings (signed-in users, own account only) --
// Only the display name is editable here. Email and phone are the
// account's OTP-verified identities, so they are deliberately NOT
// changeable through this endpoint.
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
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }
  user.passwordHash = hashPassword(newPassword);
  await user.save();
  res.json({ message: "Password updated." });
});

// -- Address book: add is above (addAddress); edit/delete below. Every
// handler operates only on req.user's own address subdocuments. --
const ADDRESS_FIELDS = ["label", "fullName", "phone", "city", "area", "street", "postalCode"];

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  for (const field of ADDRESS_FIELDS) {
    if (req.body[field] !== undefined) address[field] = req.body[field];
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
  req.user.addresses.push(req.body);
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});
