import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { requestOtp, verifyOtp } from "../services/otpService.js";
import { verifyGoogleCredential } from "../services/googleAuthService.js";

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses, emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified, avatar: u.avatar || "",
});

// -- Sign-up: step 1, email OTP --
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
export const signupVerifyPhone = asyncHandler(async (req, res) => {
  const { name, email, phone, code, channel = "whatsapp" } = req.body;
  const check = await verifyOtp({ identifier: phone, channel, purpose: "signup", code });
  if (!check.ok) return res.status(400).json({ message: check.reason });
  const user = await User.create({
    name, email, phone, emailVerified: true, phoneVerified: true, role: "customer",
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

// -- Login with Google --
export const googleLogin = asyncHandler(async (req, res) => {
  const profile = await verifyGoogleCredential(req.body);
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
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
