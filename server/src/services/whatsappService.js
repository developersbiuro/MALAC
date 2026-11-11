import env from "../config/env.js";

// WhatsApp sends go through the Meta WhatsApp Cloud API with APPROVED
// templates. Template messages are required outside a conversation: a
// plain text message is only delivered inside the 24-hour service
// window that opens when the customer messages the business first, so
// new customers would never receive a plain-text OTP or confirmation.
//
// There is NO demo/log-only fallback: without credentials the senders
// throw a NOT_CONFIGURED error so flows fail honestly instead of
// pretending a message was sent. (Order confirmations are the one
// best-effort exception — notifyService catches their failures so an
// unapproved template can never break ordering.)
//
// The access token must be a System User token for this app whose system
// user has the WhatsApp account that owns WHATSAPP_PHONE_NUMBER_ID
// assigned — a token without that asset is rejected by Meta with
// 401 / code 190 even when the token itself is valid.

// Meta wants international digits with no "+". Pakistani numbers are
// stored as "+92…" by the phone inputs; a locally typed "03…" number
// gets its leading 0 swapped for the country code.
export function toWhatsAppDigits(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = `92${d.slice(1)}`;
  return d;
}

async function sendTemplateMessage({ to, templateName, lang, components }) {
  const { accessToken, phoneNumberId } = env.whatsapp;
  if (!accessToken || !phoneNumberId) {
    const err = new Error("WhatsApp is not configured on the server");
    err.code = "WHATSAPP_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toWhatsAppDigits(to),
      type: "template",
      template: { name: templateName, language: { code: lang }, components },
    }),
  });
  if (!res.ok) {
    // Surface Meta's own error message/code (never the access token) so a
    // failure is diagnosable instead of a bare status number.
    let detail = "";
    try {
      const body = await res.json();
      const e = body && body.error;
      if (e) detail = ` — ${e.message || "unknown error"} (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})`;
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
