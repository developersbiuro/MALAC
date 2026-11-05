import { useEffect, useState } from "react";
import { Download, X, Share, MoreVertical, MousePointerClick } from "lucide-react";

/**
 * "Download App" button — installs the MALAC PWA.
 * - Chromium (Android/desktop): uses the captured `beforeinstallprompt` event.
 * - Everywhere else (iOS Safari, Firefox, prompt already dismissed): opens a
 *   small help modal with per-platform manual install steps.
 * - Renders nothing when the app is already installed / running standalone.
 *
 * variant: "pill" (gradient CTA, header/footer) | "link" (plain text, mobile strip)
 */
export default function InstallAppButton({ variant = "pill", className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
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
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") setDeferredPrompt(null);
      } catch {
        setShowHelp(true);
      }
    } else {
      setShowHelp(true);
    }
  };

  const button =
    variant === "link" ? (
      <button onClick={handleClick} className={`flex items-center gap-1 whitespace-nowrap shrink-0 hover:text-lux-burnt ${className}`}>
        <Download size={13} /> Download App
      </button>
    ) : (
      <button onClick={handleClick} className={`btn-lux text-xs px-4 py-2 shrink-0 ${className}`}>
        <Download size={15} /> Download App
      </button>
    );

  return (
    <>
      {button}
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
              <h3 className="font-serif text-lg font-semibold text-lux-ink">Install the MALAC App</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">No app store needed — MALAC installs straight from your browser in seconds.</p>
            <div className="mt-4 space-y-3.5 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <MoreVertical size={15} className="text-lux-burnt" /> Android (Chrome)
                </p>
                <p className="mt-0.5">Tap the menu (⋮) at the top right, then choose <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Share size={15} className="text-lux-burnt" /> iPhone (Safari)
                </p>
                <p className="mt-0.5">Tap the <strong>Share</strong> button, then choose <strong>“Add to Home Screen”</strong>.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <MousePointerClick size={15} className="text-lux-burnt" /> Computer (Chrome / Edge)
                </p>
                <p className="mt-0.5">Click the <strong>install icon</strong> at the right end of the address bar, then confirm <strong>Install</strong>.</p>
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
