import nodemailer from "nodemailer";
import env from "../config/env.js";

// Sends email via SMTP when configured; otherwise DEMO MODE (logs only).
export async function sendEmail({ to, subject, text }) {
  const { host, port, user, pass } = env.smtp;
  if (!host || !user || !pass) {
    console.log(`[DEMO EMAIL] From: ${env.otpSenderEmail} To: ${to} | ${subject} | ${text}`);
    return { delivered: false, demo: true };
  }
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"${env.otpSenderName}" <${env.otpSenderEmail}>`, to, subject, text,
  });
  return { delivered: true, demo: false };
}
export default sendEmail;
