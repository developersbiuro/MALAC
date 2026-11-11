import nodemailer from "nodemailer";
import env from "../config/env.js";

// Sends email via SMTP. There is NO demo/log-only fallback: without SMTP
// credentials this throws a NOT_CONFIGURED error so flows fail honestly
// instead of pretending a code or link was sent.
//
// Two sending paths (owner's rule, 2026-11-11):
// - sendEmail      → Gmail SMTP. Account-access mail ONLY: email OTP and
//                    password-reset links. Never reroute these.
// - sendStoreEmail → Zoho SMTP (info@malac.pp.ua) for store mail: order
//                    lifecycle emails and review invites. If Zoho is not
//                    configured or a send fails, it falls back to Gmail
//                    so a store email never dies silently.
export async function sendEmail({ to, subject, text, html }) {
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
    from: `"${env.otpSenderName}" <${env.otpSenderEmail}>`, to, subject, text, ...(html ? { html } : {}),
  });
  return { delivered: true };
}

export async function sendStoreEmail({ to, subject, text, html }) {
  const z = env.zohoSmtp;
  if (z.user && z.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: z.host, port: z.port, secure: z.port === 465, auth: { user: z.user, pass: z.pass },
      });
      await transporter.sendMail({
        from: `"${z.senderName}" <${z.senderEmail}>`, to, subject, text, ...(html ? { html } : {}),
      });
      return { delivered: true, via: "zoho" };
    } catch (err) {
      console.error(`[MALAC] Zoho store email to ${to} failed (${err.message}) — falling back to Gmail`);
    }
  }
  const result = await sendEmail({ to, subject, text, html });
  return { ...result, via: "gmail" };
}
export default sendEmail;
