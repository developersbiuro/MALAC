import nodemailer from "nodemailer";
import env from "../config/env.js";

// Sends email via SMTP. There is NO demo/log-only fallback: without SMTP
// credentials this throws a NOT_CONFIGURED error so flows fail honestly
// instead of pretending a code or link was sent.
export async function sendEmail({ to, subject, text }) {
  const { host, port, user, pass } = env.smtp;
  if (!host || !user || !pass) {
    const err = new Error("Email is not configured on the server (SMTP settings are missing)");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"${env.otpSenderName}" <${env.otpSenderEmail}>`, to, subject, text,
  });
  return { delivered: true };
}
export default sendEmail;
