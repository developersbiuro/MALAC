import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

// The customer Android app, served by our own server (see
// server/src/routes/appAssetRoutes.js). Pressing "Download App"
// downloads this .apk file; the customer installs it from their file
// manager — the owner explicitly chose real-APK distribution over the
// browser's PWA install prompt.
const APK_URL = "/download/malac-app.apk";

/**
 * "Download App" button.
 * - Android / desktop: a plain download link to the MALAC .apk file.
 *   When the browser ALSO offers a PWA install prompt, a small secondary
 *   "browser install" text link appears next to the pill variant — the
 *   APK download stays the primary action.
 * - iPhone / iPad: APKs cannot run on iOS, so the button opens the
 *   Add-to-Home-Screen instructions instead of downloading a useless file.
 * - Renders nothing when the site is already running installed
 *   (standalone display mode).
 *
 * variant: "pill" (gradient CTA, header/footer) | "link" (plain text, mobile strip)
 */
export default function InstallAppButton({ variant = "pill", className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true;
    if (standalone) {
      setIsStandalone(true);
      return;
    }
    const ua = window.navigator.userAgent || "";
    // iPadOS 13+ reports a desktop Mac UA — the touch-points check catches it.
    setIsIOS(
      /iphone|ipad|ipod/i.test(ua) ||
        (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
    );
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const handleBrowserInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") setDeferredPrompt(null);
    } catch {
      /* prompt dismissed/unavailable — the APK link remains the main path */
    }
  };

  // iOS gets a button that opens the instructions; everyone else gets the
  // direct APK download link.
  const button = isIOS ? (
    variant === "link" ? (
      <button onClick={() => setShowHelp(true)} className={`flex items-center gap-1 whitespace-nowrap shrink-0 hover:text-lux-burnt ${className}`}>
        <Download size={13} /> Download App
      </button>
    ) : (
      <button onClick={() => setShowHelp(true)} className={`btn-lux text-xs px-4 py-2 shrink-0 ${className}`}>
        <Download size={15} /> Download App
      </button>
    )
  ) : variant === "link" ? (
    <a href={APK_URL} download className={`flex items-center gap-1 whitespace-nowrap shrink-0 hover:text-lux-burnt ${className}`}>
      <Download size={13} /> Download App
    </a>
  ) : (
    <a href={APK_URL} download className={`btn-lux text-xs px-4 py-2 shrink-0 ${className}`}>
      <Download size={15} /> Download App
    </a>
  );

  return (
    <>
      {/* The pill and its secondary link form ONE centred column, so the
          link hugs the pill's underside instead of stretching the flex row
          it sits in (which pushed the pill up against the top bar). */}
      <span className="flex flex-col items-center">
        {button}
        {!isIOS && variant === "pill" && deferredPrompt && (
          <button
            onClick={handleBrowserInstall}
            className="mt-0.5 text-[11px] leading-tight text-gray-400 underline underline-offset-2 hover:text-lux-burnt"
          >
            or install in browser
          </button>
        )}
      </span>
      {showHelp && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Install the MALAC app"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 text-left normal-case tracking-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-lux-ink">Get the MALAC App</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3.5 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Share size={15} className="text-lux-burnt" /> iPhone / iPad (Safari)
                </p>
                <p className="mt-0.5">
                  Tap the <strong>Share</strong> button, then choose <strong>“Add to Home Screen”</strong> — MALAC
                  will sit on your home screen like an app. (Android app files can&apos;t install on iOS.)
                </p>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className="btn-lux w-full mt-5 py-2.5 text-sm">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
