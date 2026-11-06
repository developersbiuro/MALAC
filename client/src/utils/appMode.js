import { useState } from "react";

// "App mode" = MALAC running inside the Android app (WebView) instead of a
// browser. Detection, first hit wins:
//   (a) the native bridge the APK injects (window.MalacApp),
//   (b) the app's WebView user agent containing "MALACApp",
//   (c) an ?app=1 query param — persisted to sessionStorage so SPA
//       navigation (which drops the query) stays in app mode,
//   (d) that sessionStorage flag from an earlier ?app=1 in this session,
//   (e) installed PWA / home-screen launch: display-mode standalone
//       (or iOS navigator.standalone) — "browser = website, installed
//       = app", per the owner's rule.
// Evaluated once and cached: the answer can't change mid-session.
let cached = null;

export function isAppMode() {
  if (cached !== null) return cached;
  try {
    if (typeof window !== "undefined") {
      if (window.MalacApp) return (cached = true);
      if (navigator.userAgent.includes("MALACApp")) return (cached = true);
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return (cached = true);
      if (navigator.standalone === true) return (cached = true);
      if (new URLSearchParams(window.location.search).get("app") === "1") {
        sessionStorage.setItem("malac-app-mode", "1");
        return (cached = true);
      }
      if (sessionStorage.getItem("malac-app-mode") === "1") return (cached = true);
    }
  } catch {
    /* storage can throw in odd WebView/privacy setups — treat as web */
  }
  return (cached = false);
}

export function useAppMode() {
  const [appMode] = useState(isAppMode);
  return appMode;
}
