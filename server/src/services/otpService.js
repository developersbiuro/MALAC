import crypto from "crypto";
import OtpToken from "../models/OtpToken.js";
import env from "../config/env.js";
import { sendEmail } from "./emailService.js";
import { sendWhatsApp } from "./whatsappService.js";
import { sendSms } from "./smsService.js";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function newCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Creates, stores (hashed) and dispatches an OTP on the chosen channel.
// Channels: "email" | "whatsapp" | "sms". In demo mode the plain code is
// returned as `demoCode` so the flow can be tested without a live provider.
// `pending` (sign-up only) carries the pending registration — name plus
// the password's scrypt hash — on the token until verification creates
// the account.
export async function requestOtp({ identifier, channel, purpose = "signup", phone, pending }) {
  const code = newCode();
  await OtpToken.deleteMany({ identifier, channel, purpose, consumed: false });
  await OtpToken.create({
    identifier, channel, purpose,
    codeHash: OtpToken.hashCode(code),
    ...(pending ? { pendingName: pending.name, pendingPasswordHash: pending.passwordHash } : {}),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });
  const text = `Your MALAC verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share it.`;
  let result;
  if (channel === "email") {
    result = await sendEmail({ to: identifier, subject: "Your MALAC verification code", text });
  } else if (channel === "whatsapp") {
    result = await sendWhatsApp({ to: phone || identifier, text });
  } else {
    result = await sendSms({ to: phone || identifier, text });
  }
  const demo = env.otpDemoMode || result.demo;
  return { sent: true, channel, demo, ...(demo ? { demoCode: code } : {}) };
}

export async function verifyOtp({ identifier, channel, purpose = "signup", code }) {
  const token = await OtpToken.findOne({
    identifier, channel, purpose, consumed: false,
  }).sort({ createdAt: -1 });
  if (!token) return { ok: false, reason: "No OTP requested for this identifier" };
  if (token.expiresAt < new Date()) return { ok: false, reason: "OTP has expired" };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "Too many attempts" };
  token.attempts += 1;
  if (token.codeHash !== OtpToken.hashCode(code)) {
    await token.save();
    return { ok: false, reason: "Incorrect OTP code" };
  }
  token.consumed = true;
  await token.save();
  return { ok: true };
}
