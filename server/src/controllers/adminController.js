import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAnalytics } from "../services/analyticsService.js";

export const analytics = asyncHandler(async (req, res) => {
  res.json(await getAnalytics());
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-__v").sort({ createdAt: -1 }).limit(200);
  res.json({ users });
});

// Super Admin only (route-guarded): assign admin / vice-admin / customer
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["admin", "vice-admin", "customer"].includes(role))
    return res.status(400).json({ message: "Invalid role" });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
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
