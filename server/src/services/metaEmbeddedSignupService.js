import env from "../config/env.js";

// One-off onboarding helpers for Meta Embedded Signup (coexistence).
//
// Background: the owner's WhatsApp number lives in his WhatsApp
// Business APP account. Linking that account into the Business
// portfolio from Business Settings only *claims* it — it does not
// convert it into a Cloud-API Messaging account, so templates and API
// sends stay blocked. The conversion happens only when the number is
// onboarded through Embedded Signup with
// extras.featureType = "whatsapp_business_app_onboarding" (see
// client/public/whatsapp-connect.html and
// docs/whatsapp-embedded-signup-runbook.md).
//
// After the owner completes that flow in the browser, this service:
//   1. exchanges the returned code for a business access token,
//   2. subscribes THIS app to the converted WhatsApp Business account
//      (without the subscription Meta does not route the account's
//      sends/events through the app), and
//   3. reads back the account's phone numbers + registration health so
//      the operator can copy the IDs into the deployment env vars.
//
// Same conventions as whatsappService.js: no demo fallback (missing
// credentials throw a coded NOT_CONFIGURED error) and Meta's own error
// message/code is surfaced — never the app secret or a token.
const GRAPH = "https://graph.facebook.com/v20.0";

function notConfigured() {
  const err = new Error("Meta app credentials are not configured on the server (META_APP_ID / META_APP_SECRET)");
  err.code = "META_NOT_CONFIGURED";
  err.status = 503;
  err.expose = true;
  return err;
}

async function graphError(res, label) {
  let detail = "";
  try {
    const body = await res.json();
    const e = body && body.error;
    if (e) detail = ` — ${e.message || "unknown error"} (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})`;
  } catch { /* body unreadable; status alone will have to do */ }
  const err = new Error(`${label}: ${res.status}${detail}`);
  err.status = 502;
  err.expose = true;
  return err;
}

// Step 1 — exchange the Embedded Signup authorization code for a
// business access token. The code is single-use and short-lived, so
// this must happen server-side, immediately after the flow completes.
export async function exchangeSignupCode(code) {
  const { appId, appSecret } = env.meta;
  if (!appId || !appSecret) throw notConfigured();
  const url = `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  if (!res.ok) throw await graphError(res, "Meta code exchange failed");
  const body = await res.json();
  if (!body.access_token) {
    const err = new Error("Meta code exchange returned no access token");
    err.status = 502;
    err.expose = true;
    throw err;
  }
  return body.access_token;
}

// Step 2 — subscribe this app to the (now converted) WhatsApp Business
// account. This is the API equivalent of "connecting" the app to the
// account; Embedded Signup returns success to the browser BEFORE this
// is done, so the endpoint must do it explicitly.
export async function subscribeAppToWaba(wabaId, accessToken) {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await graphError(res, "Subscribing the app to the WhatsApp account failed");
  const body = await res.json().catch(() => ({}));
  return body.success !== false;
}

// Read-back helpers (best-effort diagnostics for the operator): the
// account's phone numbers, and whether a number is coexistence-healthy
// (is_on_biz_app=true + platform_type=CLOUD_API means the number can
// use the Cloud API AND the WhatsApp Business app at the same time).
export async function listWabaPhoneNumbers(wabaId, accessToken) {
  const res = await fetch(`${GRAPH}/${wabaId}/phone_numbers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await graphError(res, "Listing the WhatsApp account's phone numbers failed");
  const body = await res.json();
  return (body.data || []).map((n) => ({
    id: n.id,
    display_phone_number: n.display_phone_number || "",
    verified_name: n.verified_name || "",
    status: n.status || "",
  }));
}

export async function getPhoneNumberHealth(phoneNumberId, accessToken) {
  const res = await fetch(`${GRAPH}/${phoneNumberId}?fields=is_on_biz_app,platform_type,status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await graphError(res, "Reading the phone number's registration state failed");
  const body = await res.json();
  return {
    is_on_biz_app: body.is_on_biz_app === true,
    platform_type: body.platform_type || "",
    status: body.status || "",
  };
}
