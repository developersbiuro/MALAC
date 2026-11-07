import { asyncHandler } from "../utils/asyncHandler.js";
import {
  exchangeSignupCode,
  subscribeAppToWaba,
  listWabaPhoneNumbers,
  getPhoneNumberHealth,
} from "../services/metaEmbeddedSignupService.js";

// POST /api/whatsapp/embedded-signup — Super Admin only (see routes).
//
// Receives the Embedded Signup result from
// client/public/whatsapp-connect.html after the owner finishes the
// coexistence flow: { code, waba_id, phone_number_id, event }.
// The `code` comes from FB.login's response; `waba_id` /
// `phone_number_id` come from the WA_EMBEDDED_SIGNUP session event
// (FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING).
//
// The response intentionally CONTAINS the exchanged access token: this
// is an operator tool, gated to the Super Admin, and the operator
// needs the token + IDs to paste into the deployment env vars
// (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID). It is never
// logged and never stored — if it is lost, the documented recovery is
// a permanent System User token (see the runbook), not a re-run.
export const embeddedSignup = asyncHandler(async (req, res) => {
  const { code, waba_id: wabaId, phone_number_id: phoneNumberId } = req.body || {};
  if (!code) {
    return res.status(400).json({ message: "Missing Embedded Signup code — run the connect flow again." });
  }
  if (!wabaId) {
    return res.status(400).json({
      message: "Missing waba_id — the signup session event did not arrive. Re-run the flow and keep the tab open until it finishes.",
    });
  }

  // Hard step: without the token nothing else can proceed.
  const accessToken = await exchangeSignupCode(code);

  // Soft steps: the token + IDs are valuable even if one of these
  // fails, so failures are reported in the response instead of
  // throwing away the whole exchange.
  let subscribed = false;
  let subscribeError = "";
  try {
    subscribed = await subscribeAppToWaba(wabaId, accessToken);
  } catch (err) {
    subscribeError = err.message;
  }

  let phoneNumbers = [];
  try {
    phoneNumbers = await listWabaPhoneNumbers(wabaId, accessToken);
  } catch { /* diagnostics only — the IDs from the session event stand */ }

  const resolvedPhone =
    phoneNumbers.find((n) => n.id === String(phoneNumberId || "")) || phoneNumbers[0] || null;
  const resolvedPhoneNumberId = phoneNumberId || (resolvedPhone && resolvedPhone.id) || "";

  let health = null;
  if (resolvedPhoneNumberId) {
    try {
      health = await getPhoneNumberHealth(resolvedPhoneNumberId, accessToken);
    } catch { /* diagnostics only */ }
  }

  res.json({
    ok: true,
    waba_id: wabaId,
    phone_number_id: resolvedPhoneNumberId,
    display_phone_number: resolvedPhone ? resolvedPhone.display_phone_number : "",
    access_token: accessToken,
    token_note:
      "Exchanged from the Embedded Signup code. For production you may replace it later with a permanent System User token (runbook step 6) — either way it must go into WHATSAPP_ACCESS_TOKEN on the deployment.",
    app_subscribed: subscribed,
    ...(subscribeError ? { subscribe_error: subscribeError } : {}),
    phone_numbers: phoneNumbers,
    health,
    next_steps: [
      "On the deployment (Vercel) set WHATSAPP_PHONE_NUMBER_ID to phone_number_id above and WHATSAPP_ACCESS_TOKEN to access_token above, then redeploy.",
      "In WhatsApp Manager for this account, create + submit the AUTHENTICATION template named malac_otp (language en) and wait for approval.",
      "Send exactly ONE test OTP from /admin (phone OTP) and confirm the code arrives in the WhatsApp Business app.",
      "Add a payment method to this Messaging account in Meta Business Suite — required before template messages can actually be sent/billed.",
    ],
  });
});
