import mongoose from "mongoose";
import crypto from "crypto";

// A CUSTOMER "forgot password" reset token — the self-service counterpart
// of the staff flow (models/PasswordResetRequest.js), kept in its OWN
// collection on purpose: staff requests are approval-gated and listed in
// Admin -> Roles & Users, so customer tokens must never land in that
// queue or be consumable by the staff endpoints (and vice versa).
//
// There is NO approval step for customers: whoever controls the email
// inbox owns the account identity, so requesting a reset immediately
// emails a one-time link. Only the token's SHA-256 hash is stored; the
// plain token exists only inside the emailed link. A token is single-use
// and expires 60 minutes after issue (see authController), and requesting
// a new link deletes the previous unused ones, so at most one live token
// exists per customer.
const customerPasswordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  // SHA-256 hash of the one-time reset token (same helper style as
  // PasswordResetRequest.hashToken). Never store or return the plain token.
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  // Set when the token has been consumed; also stamped on tokens that were
  // superseded — a used/superseded token can never reset a password.
  usedAt: { type: Date },
}, { timestamps: true });

customerPasswordResetSchema.statics.hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export default mongoose.model("CustomerPasswordReset", customerPasswordResetSchema);
