import User from "../models/User.js";
import Settings from "../models/Settings.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import env from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAnalytics } from "../services/analyticsService.js";
import { createResetRequest, issueResetToken } from "../services/passwordResetService.js";
import { effectivePermissions, sanitizePermissions } from "../utils/permissions.js";
import { normalizePhone, phoneLast10 } from "../utils/phone.js";

// Shape a user record for the Roles & Users panel: same fields as stored,
// plus the EFFECTIVE permissions (Super Admin = all; a Vice-Admin's
// explicitly saved set — empty included — or the legacy default when
// no choice was ever saved) so the Access editor shows what the
// account can actually do.
const panelUser = (u) => ({ ...u, permissions: effectivePermissions(u) });

export const analytics = asyncHandler(async (req, res) => {
  res.json(await getAnalytics());
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-__v").sort({ createdAt: -1 }).limit(200).lean();
  // Flag the one owner account so the UI can lock its role: it is the
  // SUPER_ADMIN_EMAIL allowlist entry and can never be demoted or replaced.
  res.json({
    users: users.map((u) => ({ ...panelUser(u), isSuperAdminOwner: u.email === env.superAdminEmail })),
  });
});

// Super Admin only (route-guarded): create a Vice-Admin account.
// This is the ONLY way staff accounts are created — there is no public
// admin registration. The Super Admin never sets the new staff member's
// password: the account starts "pending_setup" and an approved setup/reset
// link is emailed to the staff member — the link only ever travels by
// email and is never returned in an API response. The Super Admin picks
// the new Vice-Admin's section access (permissions); when none is sent,
// the standard access (products + orders — explicitly NOT coupons,
// settings, roles or payment verification) is stored.
export const createViceAdmin = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").toLowerCase().trim();
  const phone = String(req.body.phone || "").trim();
  if (!name || !email || !phone) {
    return res.status(400).json({ message: "name, email and phone are required" });
  }
  let permissions = ["products", "orders"];
  if (req.body.permissions !== undefined) {
    permissions = sanitizePermissions(req.body.permissions);
    if (!permissions) {
      return res.status(400).json({ message: "permissions must be an array of: products, categories, orders, payments, coupons" });
    }
  }
  if (email === env.superAdminEmail) {
    return res.status(400).json({ message: "That email is reserved for the Super Admin account" });
  }
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ message: "A user with this email or phone already exists" });
  const user = await User.create({
    // permissionsSet: the create form's checkboxes are an explicit
    // choice by the Super Admin, so the stored array is authoritative
    // from day one (the form pre-checks products + orders, so a plain
    // submission keeps the standard access).
    name, email, phone, role: "vice-admin", permissions, permissionsSet: true,
    emailVerified: false, phoneVerified: false, accountStatus: "pending_setup",
  });
  const request = await createResetRequest(user, { approvedBy: req.user._id });
  const setup = await issueResetToken(request);
  // issueResetToken throws when email cannot be sent (e.g. SMTP not
  // configured), so reaching this line means the setup link was emailed.
  res.status(201).json({
    user,
    setup: {
      emailed: setup.delivered,
      message: "Setup link emailed to the new Vice-Admin.",
    },
  });
});

// Super Admin only (route-guarded): change a user's role, with hard limits —
//  * the owner (SUPER_ADMIN_EMAIL) account's role can never be changed;
//  * nobody can be promoted to "admin": there is exactly one Super Admin.
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["admin", "vice-admin", "customer"].includes(role))
    return res.status(400).json({ message: "Invalid role" });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.email === env.superAdminEmail) {
    return res.status(400).json({ message: "The Super Admin (owner) account's role cannot be changed" });
  }
  if (role === "admin") {
    return res.status(400).json({ message: "Only the configured SUPER_ADMIN_EMAIL account can be Super Admin" });
  }
  target.role = role;
  await target.save();
  res.json({ user: target });
});

// Super Admin only (route-guarded): set a Vice-Admin's section access.
// Saving here is an explicit choice: permissionsSet is stamped true, so
// the stored array is authoritative afterwards — an empty array means
// the Vice-Admin gets NO sections (effectivePermissions resolves it).
export const updateUserPermissions = asyncHandler(async (req, res) => {
  const permissions = sanitizePermissions(req.body.permissions);
  if (!permissions) {
    return res.status(400).json({ message: "permissions must be an array of: products, categories, orders, payments, coupons" });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role === "admin") {
    return res.status(400).json({ message: "The Super Admin always has full access — permissions cannot be limited" });
  }
  if (target.role !== "vice-admin") {
    return res.status(400).json({ message: "Permissions apply to Vice-Admin accounts only" });
  }
  target.permissions = permissions;
  target.permissionsSet = true;
  await target.save();
  res.json({ user: panelUser(target.toObject()) });
});

// Super Admin only (route-guarded): manually verify a Vice-Admin whose
// Verified column is incomplete — marks BOTH channels verified (the
// Super Admin is vouching for the staff member they created in-panel).
export const verifyUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role !== "vice-admin") {
    return res.status(400).json({ message: "Only Vice-Admin accounts can be verified here" });
  }
  target.emailVerified = true;
  target.phoneVerified = true;
  await target.save();
  res.json({ user: panelUser(target.toObject()) });
});

// Super Admin only (route-guarded): re-send the setup email to a
// Vice-Admin who has not set a password yet (accountStatus
// "pending_setup"). Reuses the exact staff-creation machinery — a fresh
// reset request + issueResetToken — so the new link supersedes the old
// one and travels only by email, never through this response.
export const resendSetupEmail = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role !== "vice-admin") {
    return res.status(400).json({ message: "Setup emails apply to Vice-Admin accounts only" });
  }
  if (target.accountStatus !== "pending_setup") {
    return res.status(400).json({ message: "This account has already set a password — use the password reset flow instead" });
  }
  const request = await createResetRequest(target, { approvedBy: req.user._id });
  const setup = await issueResetToken(request);
  // issueResetToken throws when email cannot be sent, so reaching this
  // line means the fresh setup link was emailed.
  res.json({ emailed: setup.delivered, message: "Setup link re-emailed to the Vice-Admin." });
});

// Super Admin only (route-guarded): set or clear an account's alternate
// phone (secondaryPhone). The number is stored normalized (+92…) and is
// matched by every phone-identifier login path alongside the primary
// phone. An empty value clears it.
export const updateUserPhones = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  const raw = String(req.body.secondaryPhone ?? "").trim();
  if (!raw) {
    target.secondaryPhone = "";
    await target.save();
    return res.json({ user: panelUser(target.toObject()) });
  }
  const phone = normalizePhone(raw);
  if (phoneLast10(phone).length < 10 || !/^\+923\d{9}$/.test(phone)) {
    return res.status(400).json({ message: "Please enter a valid Pakistani mobile number" });
  }
  if (phone === target.phone) {
    return res.status(400).json({ message: "That is already the account's primary phone number" });
  }
  const clash = await User.findOne({
    _id: { $ne: target._id },
    $or: [{ phone }, { secondaryPhone: phone }],
  });
  if (clash) {
    return res.status(409).json({ message: "That number is already used by another account" });
  }
  target.secondaryPhone = phone;
  await target.save();
  res.json({ user: panelUser(target.toObject()) });
});

// Super Admin only (route-guarded): permanently delete a Vice-Admin
// account. Hard limits: the Super Admin can never be deleted here, an
// admin can never delete themself through this endpoint, and customers
// are NOT deletable here (this is a staff-management action only).
export const deleteUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.role === "admin") {
    return res.status(400).json({ message: "The Super Admin account cannot be deleted" });
  }
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }
  if (target.role === "customer") {
    return res.status(400).json({ message: "Only Vice-Admin accounts can be deleted here" });
  }
  // Drop the account's outstanding staff reset requests so the approval
  // queue never points at a user that no longer exists.
  await PasswordResetRequest.deleteMany({ user: target._id });
  await User.findByIdAndDelete(target._id);
  res.json({ message: "Vice-Admin deleted", id: target._id });
});

// -- Staff password-reset approvals (Super Admin only, route-guarded) --
export const listPasswordResets = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const requests = await PasswordResetRequest.find(filter)
    .populate("user", "name email phone role")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ requests });
});

// Approving is the moment the reset token is generated and emailed —
// before approval, a request cannot change any password.
export const approvePasswordReset = asyncHandler(async (req, res) => {
  const request = await PasswordResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Reset request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: `Request is already ${request.status}` });
  }
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  // issueResetToken throws when email cannot be sent (e.g. SMTP not
  // configured), so reaching this line means the reset link was emailed.
  const result = await issueResetToken(request);
  res.json({
    request,
    emailed: result.delivered,
  });
});

export const rejectPasswordReset = asyncHandler(async (req, res) => {
  const request = await PasswordResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Reset request not found" });
  if (!["pending", "approved"].includes(request.status)) {
    return res.status(400).json({ message: `Request is already ${request.status}` });
  }
  request.status = "rejected";
  request.resetTokenHash = undefined;
  request.resetTokenExpiresAt = undefined;
  await request.save();
  res.json({ request });
});

// Super Admin only (route-guarded): store + OTP sender + wallet settings
export const getSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await Settings.getStore() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getStore();
  const allowed = ["storeName", "otpSenderEmail", "otpSenderPhone", "whatsappSenderNumber",
    "defaultShippingFee", "expressShippingFee", "freeShippingThreshold",
    "codEnabled", "cardPaymentsEnabled",
    "jazzcashAccountTitle", "jazzcashAccountNumber",
    "easypaisaAccountTitle", "easypaisaAccountNumber"];
  for (const key of allowed) if (req.body[key] !== undefined) settings[key] = req.body[key];
  await settings.save();
  res.json({ settings });
});

// Public (no auth): only the safe checkout subset defined by the model.
export const publicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getStore();
  res.json({ payments: settings.publicPayments() });
});
