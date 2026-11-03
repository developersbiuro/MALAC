import env from "../config/env.js";

// Sends SMS via Twilio's REST API when configured; otherwise DEMO MODE.
export async function sendSms({ to, text }) {
  const { accountSid, authToken, fromNumber } = env.twilio;
  if (!accountSid || !authToken) {
    console.log(`[DEMO SMS] From: ${fromNumber} To: ${to} | ${text}`);
    return { delivered: false, demo: true };
  }
  const body = new URLSearchParams({ From: fromNumber, To: to, Body: text });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  if (!res.ok) throw new Error(`Twilio API error: ${res.status}`);
  return { delivered: true, demo: false };
}
export default sendSms;
