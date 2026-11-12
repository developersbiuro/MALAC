import { randomUUID } from "node:crypto";
import env from "../config/env.js";

// WhatsApp sends ride the ZapClaw REST API (api.zapclaw.app), which
// forwards them to Meta's WhatsApp Cloud API as the store's Tech
// Provider. Route changed 2026-11-12 at the owner's decision: before
// this, sends went directly to Meta with the owner's own app token —
// but the MALAC app sits in Development mode with only Standard
// access, so Meta refused every recipient outside the app's 5-number
// test list (error 131030) and OTPs arrived ONLY on the owner's own
// number. ZapClaw's approved app carries no recipient list, so sends
// reach any customer number, and no App Review / developer-console
// verification is needed on the owner's side. The number, the WABA and
// the approved templates are unchanged; only the sending gateway moved.
//
// Sends use APPROVED templates. Template messages are required outside
// a conversation: a plain text message is only delivered inside the
// 24-hour service window that opens when the customer messages the
// business first, so new customers would never receive a plain-text
// OTP or confirmation.
//
// There is NO demo/log-only fallback: without the API key the senders
// throw a NOT_CONFIGURED-style error so flows fail honestly instead of
// pretending a message was sent. (Order confirmations are the one
// best-effort exception — notifyService catches their failures so a
// messaging problem can never break ordering.)

// Meta/ZapClaw want international digits with no "+". Pakistani
// numbers are stored as "+92…" by the phone inputs; a locally typed
// "03…" number gets its leading 0 swapped for the country code.
export function toWhatsAppDigits(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = `92${d.slice(1)}`;
  return d;
}

async function sendTemplateMessage({ to, templateName, lang, components }) {
  const { zapclawApiKey, senderNumber } = env.whatsapp;
  if (!zapclawApiKey) {
    const err = new Error("WhatsApp is not configured on the server");
    err.code = "WHATSAPP_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch("https://api.zapclaw.app/api/v1/send/template", {
    method: "POST",
    headers: {
      "X-API-Key": zapclawApiKey,
      "Content-Type": "application/json",
      // One key per logical send: if this exact call is ever repeated
      // within 10 minutes, ZapClaw returns the stored answer instead
      // of messaging the customer twice.
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      from: toWhatsAppDigits(senderNumber),
      to: toWhatsAppDigits(to),
      templateName,
      language: lang,
      components,
    }),
  });
  if (res.status === 202) {
    // DELIVERY_INDETERMINATE: Meta neither accepted nor refused the
    // send. Treat it as accepted — re-sending could deliver it twice.
    console.warn("[whatsapp] ZapClaw send indeterminate (202); treating as accepted");
    return { delivered: true, indeterminate: true };
  }
  if (!res.ok) {
    // Surface ZapClaw's own error code/message (never the API key) so a
    // failure is diagnosable instead of a bare status number.
    let detail = "";
    try {
      const body = await res.json();
      if (body) detail = ` — ${body.error || "unknown error"} (code ${body.code || "?"})`;
    } catch { /* body unreadable; status alone will have to do */ }
    throw new Error(`WhatsApp API error: ${res.status}${detail}`);
  }
  return { delivered: true };
}

// OTP via the approved AUTHENTICATION template (body code + copy-code
// button parameter).
export async function sendWhatsAppOtp({ to, code }) {
  const { otpTemplate, otpTemplateLang } = env.whatsapp;
  return sendTemplateMessage({
    to,
    templateName: otpTemplate,
    lang: otpTemplateLang,
    components: [
      { type: "body", parameters: [{ type: "text", text: code }] },
      // Copy-code / OTP button of the authentication template.
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
    ],
  });
}

// Order-placed confirmation via the approved UTILITY template
// malac_order_confirm: body parameters are {{1}} customer name,
// {{2}} order ID, {{3}} total (formatted). Best-effort by contract —
// the caller catches failures.
export async function sendWhatsAppOrderConfirmation({ to, name, orderId, total }) {
  const { orderTemplate, orderTemplateLang } = env.whatsapp;
  return sendTemplateMessage({
    to,
    templateName: orderTemplate,
    lang: orderTemplateLang,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: String(name || "Customer") },
          { type: "text", text: String(orderId || "") },
          { type: "text", text: Number(total || 0).toLocaleString("en-PK") },
        ],
      },
    ],
  });
}

export default sendWhatsAppOtp;
