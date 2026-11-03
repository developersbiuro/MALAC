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
});

const STAFF_ROLES = ["admin", "vice-admin"];
const isStaffUser = (u) => u && STAFF_ROLES.includes(u.role);

// -- Sign-up: step 1, email OTP --
// NOTE: any "role" sent in a sign-up request body is deliberately IGNORED.
// Public sign-up can only ever produce a customer — see signupVerifyPhone.
export const signupEmailOtp = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ message: "name, email and phone are required" });
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
  const { name, email, phone, code, channel = "whatsapp" } = req.body;
  const check = await verifyOtp({ identifier: phone, channel, purpose: "signup", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ message: "An account with this email or phone already exists" });
  const isOwnerAllowlist = String(email).toLowerCase() === env.superAdminEmail;
  const user = await User.create({
    name, email, phone, emailVerified: true, phoneVerified: true,
    role: isOwnerAllowlist ? "admin" : "customer",
  });
  res.status(201).json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: passwordless OTP (email or phone) --
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
  res.json({ user: publicUser(user), token: generateToken(user) });
});

// -- Login: password (STAFF accounts only) --
// Passwords exist only for staff (see User.passwordHash). They are set
// exclusively through the approval-gated reset flow below — there is no
// public "set password" or admin-registration endpoint.
export const loginPassword = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: "identifier and password are required" });
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select("+passwordHash");
  if (!user || !isStaffUser(user)) {
    return res.status(401).json({ message: "Password sign-in is for MALAC staff accounts. Customers sign in with OTP or Google." });
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
// verified email OTP sent to SUPER_ADMIN_EMAIL (step 2a). Customers have
// no password, so nothing is created for them. The response is generic so
// it does not reveal whether an account exists.
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

export const me = asyncHandler(async (req, res) => res.json({ user: publicUser(req.user) }));

export const addAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  req.user.addresses.push(req.body);
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});
