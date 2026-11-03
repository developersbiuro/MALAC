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
    // Status only — never log or surface the access token.
    throw new Error(`WhatsApp API error: ${res.status}`);
  }
  return { delivered: true };
}
export default sendWhatsAppOtp;
