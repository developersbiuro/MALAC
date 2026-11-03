import User from "../models/User.js";
import Settings from "../models/Settings.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import env from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAnalytics } from "../services/analyticsService.js";
import { createResetRequest, issueResetToken } from "../services/passwordResetService.js";

export const analytics = asyncHandler(async (req, res) => {
  res.json(await getAnalytics());
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-__v").sort({ createdAt: -1 }).limit(200).lean();
  // Flag the one owner account so the UI can lock its role: it is the
  // SUPER_ADMIN_EMAIL allowlist entry and can never be demoted or replaced.
  res.json({
    users: users.map((u) => ({ ...u, isSuperAdminOwner: u.email === env.superAdminEmail })),
  });
});

// Super Admin only (route-guarded): create a Vice-Admin account.
// This is the ONLY way staff accounts are created — there is no public
// admin registration. The Super Admin never sets the new staff member's
// password: the account starts "pending_setup" and an approved setup/reset
// link is emailed to the staff member (demo mode returns the link in the
// response so the Super Admin can hand it over personally). A Vice-Admin
// gets the standard vice-admin access (products + orders) and explicitly
// NOT coupons, settings, roles or payment verification.
export const createViceAdmin = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").toLowerCase().trim();
  const phone = String(req.body.phone || "").trim();
  if (!name || !email || !phone) {
    return res.status(400).json({ message: "name, email and phone are required" });
  }
  if (email === env.superAdminEmail) {
    return res.status(400).json({ message: "That email is reserved for the Super Admin account" });
  }
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ message: "A user with this email or phone already exists" });
  const user = await User.create({
    name, email, phone, role: "vice-admin",
    emailVerified: false, phoneVerified: false, accountStatus: "pending_setup",
  });
  const request = await createResetRequest(user, { approvedBy: req.user._id });
  const setup = await issueResetToken(request);
  res.status(201).json({
    user,
    setup: {
      emailed: setup.delivered,
      message: setup.delivered
        ? "Setup link emailed to the new Vice-Admin."
        : "Email is in demo mode — share the setup link with the new Vice-Admin yourself.",
      ...(setup.demoResetLink ? { demoSetupLink: setup.demoResetLink } : {}),
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
  const result = await issueResetToken(request);
  res.json({
    request,
    emailed: result.delivered,
    ...(result.demoResetLink ? { demoResetLink: result.demoResetLink } : {}),
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
