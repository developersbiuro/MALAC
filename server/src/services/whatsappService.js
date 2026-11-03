import env from "../config/env.js";

// Sends a WhatsApp OTP via the Meta WhatsApp Cloud API using an approved
// AUTHENTICATION template. Template messages are required for OTPs: a
// plain text message is only delivered inside the 24-hour service window
// that opens when the customer messages the business first, so new
// customers would never receive a text OTP.
//
// There is NO demo/log-only fallback: without credentials this throws a
// NOT_CONFIGURED error so sign-up/login fail honestly instead of
// pretending a code was sent.
//
// The access token must be a System User token for this app whose system
// user has the WhatsApp account that owns WHATSAPP_PHONE_NUMBER_ID
// assigned — a token without that asset is rejected by Meta with
// 401 / code 190 even when the token itself is valid.
export async function sendWhatsAppOtp({ to, code }) {
  const { accessToken, phoneNumberId, otpTemplate, otpTemplateLang } = env.whatsapp;
  if (!accessToken || !phoneNumberId) {
    const err = new Error("WhatsApp OTP is not configured on the server");
    err.code = "WHATSAPP_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: String(to).replace(/\D/g, ""),
      type: "template",
      template: {
        name: otpTemplate,
        language: { code: otpTemplateLang },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // Copy-code / OTP button of the authentication template.
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
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
export default sendWhatsAppOtp;
