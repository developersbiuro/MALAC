import crypto from "crypto";
import OtpToken from "../models/OtpToken.js";
import { sendEmail } from "./emailService.js";
import { sendWhatsAppOtp } from "./whatsappService.js";
import { sendSms } from "./smsService.js";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function newCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Creates, stores (hashed) and dispatches an OTP on the chosen channel.
// Channels: "email" | "whatsapp" | "sms". Delivery is ALWAYS real — there
// is no demo mode and the plain code is never returned to the client. If
// the channel's provider is not configured, the sender throws a clear
// not-configured error and the request fails honestly.
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
  if (channel === "email") {
    try {
      await sendEmail({ to: identifier, subject: "Your MALAC verification code", text });
    } catch (err) {
      if (err.code === "EMAIL_NOT_CONFIGURED") throw new Error("Email OTP is not configured");
      throw err;
    }
  } else if (channel === "whatsapp") {
    await sendWhatsAppOtp({ to: phone || identifier, code });
  } else {
    try {
      await sendSms({ to: phone || identifier, text });
    } catch (err) {
      if (err.code === "SMS_NOT_CONFIGURED") throw new Error("SMS OTP is not configured");
      throw err;
    }
  }
  return { sent: true, channel };
}

export async function verifyOtp({ identifier, channel, purpose = "signup", code }) {
  const token = await OtpToken.findOne({
    identifier, channel, purpose, consumed: false,
  }).sort({ createdAt: -1 });
  // Failure wording is deliberately GENERIC for the no-token, expired and
  // wrong-code cases: distinct messages would let an unauthenticated
  // caller probe whether a code was ever issued for an identifier (i.e.
  // whether the account exists). Only the attempt-cap message differs —
  // it fires solely after repeated wrong guesses against a live code.
  const GENERIC = "Invalid or expired verification code";
  if (!token) return { ok: false, reason: GENERIC };
  if (token.expiresAt < new Date()) return { ok: false, reason: GENERIC };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "Too many incorrect attempts. Please request a new code." };
  token.attempts += 1;
  if (token.codeHash !== OtpToken.hashCode(code)) {
    await token.save();
    return { ok: false, reason: GENERIC };
  }
  token.consumed = true;
  await token.save();
  return { ok: true };
}
