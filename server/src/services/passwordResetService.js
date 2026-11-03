import crypto from "crypto";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import env from "../config/env.js";
import { sendEmail } from "./emailService.js";

export const RESET_TOKEN_TTL_MINUTES = 60;

// Creates a fresh reset request for a staff user, superseding any earlier
// pending/approved (unused) requests so only one live request exists.
// Options: { autoApproved, approvedBy } — autoApproved is ONLY for the
// Super Admin (owner) account, whose identity is verified by email OTP.
export async function createResetRequest(user, { autoApproved = false, approvedBy = null } = {}) {
  await PasswordResetRequest.updateMany(
    { user: user._id, status: { $in: ["pending", "approved"] } },
    { status: "superseded", resetTokenHash: undefined, resetTokenExpiresAt: undefined }
  );
  return PasswordResetRequest.create({
    user: user._id,
    email: user.email,
    status: autoApproved ? "approved" : "pending",
    autoApproved,
    approvedBy: approvedBy || undefined,
    approvedAt: autoApproved || approvedBy ? new Date() : undefined,
  });
}

// Generates the one-time reset token for an approved request and emails the
// link. The plain token is stored ONLY as a SHA-256 hash and only ever
// leaves the server inside the emailed link — it is never returned in an
// API response. If SMTP is not configured the email sender throws and the
// approval fails honestly instead of leaking the link.
export async function issueResetToken(request) {
  const token = crypto.randomBytes(32).toString("hex");
  request.resetTokenHash = PasswordResetRequest.hashToken(token);
  request.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  if (request.status === "pending") {
    request.status = "approved";
    request.approvedAt = new Date();
  }
  await request.save();
  const link = `${env.clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(request.email)}`;
  const result = await sendEmail({
    to: request.email,
    subject: "MALAC staff password reset",
    text:
      `A password reset for your MALAC staff account was approved by the Super Admin.\n` +
      `Set your new password within ${RESET_TOKEN_TTL_MINUTES} minutes using this link:\n${link}\n` +
      `If you did not request this, ignore this email — your password will not change.`,
  });
  return { link, delivered: result.delivered };
}

export default createResetRequest;
