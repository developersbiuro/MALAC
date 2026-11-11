import api from "../api/client.js";

// Registers this phone's FCM token with the server for the signed-in
// customer, from the WEB layer.
//
// Why this exists (bug found 2026-11-11): the native shell only tried
// to register the token on full page loads (onPageFinished). A customer
// who installs the app, signs up and orders in the SAME session never
// triggers another full load — the SPA navigates in-page — so their
// phone was never registered and NO customer push (placed / shipped /
// delivered / cancelled) could ever arrive. Staff pushes worked only
// because the admin app is relaunched constantly.
//
// The native bridge (window.MalacPush.getToken, shipped in app v1.3)
// already exposes the token to the page, so this fix reaches installed
// apps through the live site with NO APK update. Outside the app (plain
// browser) there is no bridge and this quietly does nothing.
let registeredFor = "";
let timer = null;

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null; }
}

export function registerPushToken(userId) {
  if (!userId || registeredFor === userId) return;
  const bridge = window.MalacPush;
  if (!bridge || typeof bridge.getToken !== "function") return; // not in the app
  let attempts = 0;
  const attempt = async () => {
    if (registeredFor === userId) { stopPolling(); return; }
    attempts += 1;
    let token = "";
    try { token = bridge.getToken() || ""; } catch { token = ""; }
    if (token) {
      stopPolling();
      registeredFor = userId;
      try { await api.post("/push/register", { token, platform: "android" }); }
      catch { registeredFor = ""; /* a later launch/session retries */ }
      return;
    }
    // FCM sometimes hands the token to the app a few seconds after
    // first launch — poll briefly, then give up until the next session.
    if (attempts >= 10) stopPolling();
  };
  attempt();
  stopPolling();
  timer = setInterval(attempt, 3000);
}

export function resetPushRegistration() {
  registeredFor = "";
  stopPolling();
}
