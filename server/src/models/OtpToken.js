import mongoose from "mongoose";
import crypto from "crypto";

const otpTokenSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true }, // email or phone
  channel: { type: String, enum: ["email", "whatsapp", "sms"], required: true },
  purpose: { type: String, enum: ["signup", "login", "password_reset"], default: "signup" },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  consumed: { type: Boolean, default: false },
}, { timestamps: true });

otpTokenSchema.statics.hashCode = (code) =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

export default mongoose.model("OtpToken", otpTokenSchema);
