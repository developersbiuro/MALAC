// Google Identity Services (GIS) loader.
//
// The client ID comes from the Vite build env: VITE_GOOGLE_CLIENT_ID in
// client/.env — it MUST match the server's GOOGLE_CLIENT_ID. When it is
// empty the Google button shows as unavailable (see GoogleButton in
// pages/Login.jsx) and nothing here is loaded — there is no fallback
// sign-in.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisPromise = null;

// Loads the GIS script exactly once and resolves with window.google.
// Rejects if the script fails to load (offline, blocked, etc.) so callers
// can show an error instead of a dead button.
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else reject(new Error("Google Identity Services did not initialize"));
    };
    script.onerror = () => {
      gisPromise = null; // allow a later retry
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}
