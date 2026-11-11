import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import "./index.css";
import { LOGO_MARK } from "./assets/logo.js";

// Favicon = the MALAC monogram (set from the bundled logo artwork).
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/png";
favicon.href = LOGO_MARK;
document.head.appendChild(favicon);

// Every image on the site falls back to the MALAC placeholder
// (Abdullah, 2026-11-07: "hr image ka placeholder MALAC hi ho"). One
// capture-phase listener covers every <img> — product photos, cart,
// orders, reviews, avatars — including images added later; a failed
// image swaps to the monogram tile instead of a broken-image icon.
// The endsWith guard stops any loop if the placeholder itself fails.
document.addEventListener("error", (e) => {
  const t = e.target;
  if (t && t.tagName === "IMG" && !String(t.src || "").endsWith("/icons/icon.svg")) {
    t.src = "/icons/icon.svg";
  }
}, true);

// Auto-recovery from stale page chunks (owner's white-screen report,
// 2026-11-12): pages are code-split, so after a new deploy a tab or
// app left open on the old build can request code files that no longer
// exist — the page then fails to open and stays blank. Vite fires
// "vite:preloadError" for exactly this, and lazy-import failures also
// surface as unhandled rejections. Either way: reload ONCE to pick up
// the fresh build (a timestamp guard stops any reload loop).
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i;
function reloadOnceForFreshBuild() {
  try {
    const last = Number(sessionStorage.getItem("malac_fresh_reload_at") || 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem("malac_fresh_reload_at", String(Date.now()));
  } catch {
    /* storage unavailable — reload anyway */
  }
  window.location.reload();
}
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnceForFreshBuild();
});
window.addEventListener("unhandledrejection", (e) => {
  if (CHUNK_ERROR.test(String(e.reason?.message || e.reason || ""))) reloadOnceForFreshBuild();
});

// PWA: register the service worker (production builds only). Progressive
// enhancement — the store works exactly the same if registration fails.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    try {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {
      /* service worker unsupported — ignore */
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
