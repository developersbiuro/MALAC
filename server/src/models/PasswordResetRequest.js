import mongoose from "mongoose";
import crypto from "crypto";

// A staff "forgot password" request. Nothing here can change a password by
// itself: a request starts as "pending" and only becomes usable after the
// Super Admin approves it inside Admin -> Roles & Users (which is when the
// reset token is generated and emailed). The Super Admin's own requests are
// auto-approved (autoApproved: true) and are completed instead with a
// verified email OTP sent to SUPER_ADMIN_EMAIL — see authController.
const passwordResetRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "used", "superseded"],
    default: "pending",
    index: true,
  },
  autoApproved: { type: Boolean, default: false }, // Super Admin (owner) requests only
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  // SHA-256 hash of the one-time reset token. The plain token only ever
  // exists in the emailed link (or, in demo mode, in the approval response
  // so the Super Admin can hand it to the staff member personally).
  resetTokenHash: { type: String, index: true },
  resetTokenExpiresAt: { type: Date },
}, { timestamps: true });

passwordResetRequestSchema.statics.hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export default mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
