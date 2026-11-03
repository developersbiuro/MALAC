import mongoose from "mongoose";
import crypto from "crypto";

const otpTokenSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true }, // email or phone
  channel: { type: String, enum: ["email", "whatsapp", "sms"], required: true },
  purpose: { type: String, enum: ["signup", "login", "password_reset"], default: "signup" },
  codeHash: { type: String, required: true },
  // Pending sign-up payload (purpose "signup" only): the registration is
  // ONE-method (email OR phone), so the name and the password — stored
  // ONLY as its scrypt hash, never plain text — ride on the OTP record
  // until the code verifies and the account is created from them. The
  // expiresAt TTL index deletes abandoned registrations automatically,
  // so an unverified sign-up never leaves a usable account behind.
  pendingName: { type: String },
  pendingPasswordHash: { type: String },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  consumed: { type: Boolean, default: false },
}, { timestamps: true });

otpTokenSchema.statics.hashCode = (code) =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

export default mongoose.model("OtpToken", otpTokenSchema);
