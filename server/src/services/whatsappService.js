import env from "../config/env.js";

// Sends a WhatsApp template/text message via the WhatsApp Cloud API when
// configured; otherwise DEMO MODE (logs only).
export async function sendWhatsApp({ to, text }) {
  const { accessToken, phoneNumberId } = env.whatsapp;
  if (!accessToken || !phoneNumberId) {
    console.log(`[DEMO WHATSAPP] From: ${env.whatsapp.senderNumber} To: ${to} | ${text}`);
    return { delivered: false, demo: true };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: String(to).replace("+", ""),
      type: "text", text: { body: text },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`);
  return { delivered: true, demo: false };
}
export default sendWhatsApp;
