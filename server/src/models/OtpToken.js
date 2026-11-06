import mongoose from "mongoose";
import crypto from "crypto";

const otpTokenSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true }, // email or phone
  channel: { type: String, enum: ["email", "whatsapp", "sms"], required: true },
  purpose: { type: String, enum: ["signup", "login", "password_reset", "phone_change", "email_change"], default: "signup" },
  codeHash: { type: String, required: true },
  // Pending sign-up payload (purpose "signup" only): the registration is
  // ONE-method (email OR phone), so the name and the password — stored
  // ONLY as its scrypt hash, never plain text — ride on the OTP record
  // until the code verifies and the account is created from them. The
  // expiresAt TTL index deletes abandoned registrations automatically,
  // so an unverified sign-up never leaves a usable account behind.
  pendingName: { type: String },
  pendingPasswordHash: { type: String },
  // Account binding for the signed-in change flows (purposes
  // "phone_change" / "email_change" only): the user who requested the
  // change. Verification refuses a code whose token is bound to a
  // different account, so a code sent for one user's pending change can
  // never apply the change to another account that happens to request
  // the same new identifier. Sign-up / login / reset tokens leave this
  // unset — those flows predate accounts or key off the identifier.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  consumed: { type: Boolean, default: false },
}, { timestamps: true });

otpTokenSchema.statics.hashCode = (code) =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

export default mongoose.model("OtpToken", otpTokenSchema);
