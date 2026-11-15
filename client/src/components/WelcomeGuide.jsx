import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { LOGO_FULL } from "../assets/logo.js";

// New-customer APP TOUR (owner, 2026-11-15): not slides — a guided
// tour that highlights the REAL buttons one by one (search, categories,
// cart, track order, account, assistant) with a spotlight and a tip
// card, the way shopping apps onboard new users. Shows ONCE per device
// on the first visit (website or app — the app loads this same site),
// once more right after a fresh sign-up, and any time from My Account
// → "How MALAC Works — Guide". Anchors live in Header / MobileBottomNav
// / ChatWidget via data-tour attributes; a step whose button is not on
// screen (e.g. the assistant for guests) is skipped automatically.
const SEEN_KEY = "malac_guide_seen_v1";
const PENDING_KEY = "malac_guide_pending";
const CALM_ROUTES = ["/", "/shop", "/categories", "/about", "/blog", "/faq", "/account", "/track-order"];
const BUSY_PREFIXES = ["/checkout", "/cart", "/order-confirmation", "/login", "/signup", "/forgot-password", "/reset-password", "/product/", "/admin"];

const STEPS = [
  {
    title: "Welcome to MALAC",
    text: "Khush amdeed! Aaiye, aap ko MALAC ka chhota sa tour karwayein — har button khud highlight ho kar samjhaya jaye ga.",
    logo: true,
  },
  {
    targets: ["[data-tour='search']"],
    title: "Search Bar",
    text: "Apni cheez ka naam yahan likhein — mobile, kapre ya shoes — product foran hazir ho jaye ga.",
  },
  {
    targets: ["[data-tour='categories']", "[data-tour='tab-categories']"],
    title: "Categories",
    text: "9 categories — Mobiles & Tablets, Fashion, Electronics, Beauty & Health aur bohat kuch. Apni pasand ki category chunain.",
  },
  {
    targets: ["[data-tour='cart']", "[data-tour='tab-cart']"],
    title: "Cart",
    text: "Pasandeeda cheezain cart me dal kar ek sath order karein. Jaldi ho to product page se Buy Now bhi kar sakte hain.",
  },
  {
    targets: ["[data-tour='track']", "[data-tour='tab-track-order']"],
    title: "Track Order",
    text: "Order k baad apna parcel yahan track karein — aur order k har step par aap ko notification bhi mile gi.",
  },
  {
    targets: ["[data-tour='account']", "[data-tour='tab-account']"],
    title: "My Account",
    text: "Aap k orders, address book aur settings yahan hain. Yahi se Invite a Friend kar k dost ko bulayein — dost account banaye to aap ko Rs. 100, dost pehla order Rs. 1,500+ ka kare to Rs. 300 discount, aur dost ko FREE delivery mile gi.",
  },
  {
    targets: ["[data-tour='chat']"],
    title: "MALAC Assistant",
    text: "Koi sawal ya masla ho to yahan chat karein — foran jawab mile ga.",
  },
  {
    title: "🎉 Tour Mukammal!",
    text: "Pehle order par 10% OFF ka code hai: WELCOME10 — checkout par lagana na bhoolein. Khush kharidari!",
    finish: true,
  },
];

const readSeen = () => {
  try { return Boolean(localStorage.getItem(SEEN_KEY)); } catch { return true; }
};
const markSeen = () => {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
};
const readPending = () => {
  try { return sessionStorage.getItem(PENDING_KEY) === "1"; } catch { return false; }
};
const clearPending = () => {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
};

const findTarget = (selectors) => {
  for (const sel of selectors || []) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden") return el;
  }
  return null;
};

export default function WelcomeGuide() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const targetRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setRect(null);
    targetRef.current = null;
    markSeen();
    clearPending();
  }, []);

  const start = useCallback(() => {
    // Resolve which steps have a visible button right now; welcome and
    // finish cards are always included.
    const resolved = STEPS.filter((s) => !s.targets || findTarget(s.targets));
    setSteps(resolved.length >= 2 ? resolved : STEPS.filter((s) => !s.targets));
    setIdx(0);
    setOpen(true);
  }, []);

  // Replay from My Account (or anywhere) via a window event.
  useEffect(() => {
    const openIt = () => start();
    window.addEventListener("malac:show-guide", openIt);
    return () => window.removeEventListener("malac:show-guide", openIt);
  }, [start]);

  // First-visit + just-registered triggers (same rules as before).
  useEffect(() => {
    if (open) return undefined;
    if (BUSY_PREFIXES.some((p) => pathname.startsWith(p))) return undefined;
    if (readPending()) {
      const t = setTimeout(start, 700);
      return () => clearTimeout(t);
    }
    if (readSeen()) return undefined;
    if (!CALM_ROUTES.includes(pathname) && !pathname.startsWith("/blog/")) return undefined;
    const t = setTimeout(start, 1200);
    return () => clearTimeout(t);
  }, [pathname, open, start]);

  const step = steps[idx];

  // Measure the current step's target (scroll it into view first).
  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ x: r.x, y: r.y, w: r.width, h: r.height });
  }, []);

  useEffect(() => {
    if (!open || !step) return undefined;
    if (!step.targets) { targetRef.current = null; setRect(null); return undefined; }
    const el = findTarget(step.targets);
    targetRef.current = el;
    if (!el) { setRect(null); return undefined; }
    // Scroll only when the button is actually off-screen — header and
    // bottom-nav anchors are sticky/fixed and already visible, and
    // scrolling for them would yank the page around for nothing.
    const r0 = el.getBoundingClientRect();
    if (r0.top < 0 || r0.bottom > window.innerHeight) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const t = setTimeout(measure, 480);
    const t2 = setTimeout(measure, 900);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [open, step, measure]);

  // Keep the spotlight glued to its button on scroll / resize.
  useEffect(() => {
    if (!open) return undefined;
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, measure]);

  if (!open || !step) return null;
  const last = idx === steps.length - 1;
  const finish = () => { close(); navigate("/shop"); };

  // Tip-card placement: under the spotlight when it sits in the top
  // half, above it otherwise; centered cards for target-less steps.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(330, vw - 24);
  let tipStyle;
  if (rect) {
    const centerX = rect.x + rect.w / 2;
    const left = Math.max(12, Math.min(centerX - tipW / 2, vw - tipW - 12));
    tipStyle = rect.y + rect.h / 2 < vh * 0.52
      ? { top: Math.min(rect.y + rect.h + 16, vh - 190), left, width: tipW }
      : { top: Math.max(rect.y - 176, 12), left, width: tipW };
  }

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="MALAC app tour">
      {rect ? (
        <>
          <div className="absolute rounded-2xl pointer-events-none transition-all duration-300"
            style={{
              left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12,
              boxShadow: "0 0 0 9999px rgba(10, 10, 20, 0.62)",
              outline: "2.5px solid #F59E0B", outlineOffset: 2,
            }} />
          <div className="absolute bg-[#FFFBF2] rounded-2xl shadow-2xl p-5" style={tipStyle}>
            <TourCard step={step} idx={idx} total={steps.length} last={last}
              onClose={close} onBack={() => setIdx(idx - 1)} onNext={() => setIdx(idx + 1)} onFinish={finish} />
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-[rgba(10,10,20,0.62)] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFFBF2] rounded-3xl shadow-2xl p-6 relative">
            <TourCard step={step} idx={idx} total={steps.length} last={last} centered
              onClose={close} onBack={() => setIdx(idx - 1)} onNext={() => setIdx(idx + 1)} onFinish={finish} />
          </div>
        </div>
      )}
    </div>
  );
}

function TourCard({ step, idx, total, last, centered, onClose, onBack, onNext, onFinish }) {
  return (
    <>
      <button onClick={onClose} aria-label="Tour band karein" className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1">
        <X size={18} />
      </button>
      <div className={centered ? "flex flex-col items-center text-center" : ""}>
        {step.logo && <img src={LOGO_FULL} alt="MALAC" className="h-16 w-auto object-contain mb-2" />}
        <h3 className="text-base font-bold text-lux-ink pr-5">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{step.text}</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] font-medium text-gray-400">{idx + 1} / {total}</span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-orange-500" : "w-1.5 bg-orange-200"}`} />
          ))}
        </div>
      </div>
      {last ? (
        <button onClick={onFinish} className="btn-lux w-full mt-3.5 py-2.5 text-sm font-semibold rounded-full">
          Shopping Shuru Karein
        </button>
      ) : (
        <div className="flex items-center justify-between mt-3.5">
          <button onClick={onClose} className="text-[13px] font-medium text-gray-500 hover:text-gray-700 px-1 py-1.5">Skip Tour</button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={onBack} className="inline-flex items-center gap-0.5 px-3.5 py-2 text-[13px] font-semibold rounded-full border border-cream-line text-gray-600">
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button onClick={onNext} className="btn-lux inline-flex items-center gap-0.5 px-5 py-2 text-[13px] font-semibold rounded-full">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
