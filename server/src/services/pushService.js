import crypto from "node:crypto";
import PushDevice from "../models/PushDevice.js";

// Real mobile push for the MALAC Admin app via Firebase Cloud Messaging
// HTTP v1 — implemented with Node's built-in crypto/fetch ONLY (no
// firebase-admin dependency): mint a short-lived OAuth2 access token
// from the service-account JSON in the FIREBASE_SERVICE_ACCOUNT_JSON
// env var (set in Vercel by the owner; never stored in the repo), then
// POST to the FCM v1 endpoint per device token.
//
// Everything is best-effort: callers fire-and-forget; a push failure must
// never fail or delay an order/staff action. Before the env var exists
// (or if the JSON is malformed) the service logs once and no-ops.

let cached = { token: null, expiresAt: 0 };
let warnedUnconfigured = false;

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("[MALAC] push disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    }
    return null;
  }
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error("missing fields");
    return sa;
  } catch (err) {
    console.error(`[MALAC] push disabled: service-account JSON invalid (${err.message})`);
    return null;
  }
}

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken(sa) {
  if (cached.token && Date.now() < cached.expiresAt - 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = b64url(signer.sign(sa.private_key));
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) throw new Error(`oauth token exchange failed (${res.status})`);
  const data = await res.json();
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cached.token;
}

async function sendToToken(sa, auth, deviceToken, title, body, data) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v ?? "")])),
        android: { priority: "high" },
      },
    }),
  });
  if (res.status === 404 || res.status === 400) {
    // UNREGISTERED / invalid token — deactivate so we stop trying it.
    const text = await res.text().catch(() => "");
    if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/i.test(text)) {
      await PushDevice.updateOne({ token: deviceToken }, { active: false }).catch(() => {});
    }
    throw new Error(`fcm send failed (${res.status})`);
  }
  if (!res.ok) throw new Error(`fcm send failed (${res.status})`);
}

// Fan out to every active staff device. No tokens yet = quiet no-op.
export async function sendPushToStaff({ title, body, data } = {}) {
  try {
    const sa = serviceAccount();
    if (!sa) return { sent: 0, skipped: "unconfigured" };
    const devices = await PushDevice.find({ active: true }).select("token").lean();
    if (!devices.length) return { sent: 0, skipped: "no_devices" };
    const auth = await accessToken(sa);
    let sent = 0;
    for (const d of devices) {
      try { await sendToToken(sa, auth, d.token, title, body, data); sent += 1; }
      catch (err) { console.error(`[MALAC] push to a device failed: ${err.message}`); }
    }
    return { sent };
  } catch (err) {
    console.error(`[MALAC] push failed: ${err.message}`);
    return { sent: 0, error: err.message };
  }
}
