import env from "../config/env.js";

// Sends SMS via Twilio's REST API. There is NO demo/log-only fallback:
// without Twilio credentials this throws a NOT_CONFIGURED error so flows
// fail honestly instead of pretending a code was sent.
export async function sendSms({ to, text }) {
  const { accountSid, authToken, fromNumber } = env.twilio;
  if (!accountSid || !authToken) {
    const err = new Error("SMS is not configured on the server (Twilio settings are missing)");
    err.code = "SMS_NOT_CONFIGURED";
    throw err;
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
  return { delivered: true };
}
export default sendSms;
