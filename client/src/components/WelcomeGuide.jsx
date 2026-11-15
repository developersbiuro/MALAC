import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronRight, Search, ShoppingBag, PackageSearch, BadgePercent, UserPlus } from "lucide-react";
import { LOGO_FULL } from "../assets/logo.js";

// New-customer guide (owner, 2026-11-15): a short welcome tour like
// every shopping app has. It shows ONCE per device on the first visit
// (website or app — the app loads this same site, so one build covers
// both), once more right after a fresh sign-up, and any time from
// My Account → "How MALAC Works — Guide". It never interrupts the
// buying flow: on checkout/cart/auth routes it waits quietly until the
// customer reaches a calm page.
const SEEN_KEY = "malac_guide_seen_v1";
const PENDING_KEY = "malac_guide_pending";
const CALM_ROUTES = ["/", "/shop", "/categories", "/about", "/blog", "/faq", "/account", "/track-order"];
const BUSY_PREFIXES = ["/checkout", "/cart", "/order-confirmation", "/login", "/signup", "/forgot-password", "/reset-password", "/product/", "/admin"];

const SLIDES = [
  {
    logo: true,
    title: "Welcome to MALAC",
    text: "M.A Luxury Apparel Collection — Pakistan bhar me online shopping. Original products, sahi qeemat, aur Cash on Delivery ki sahulat.",
  },
  {
    Icon: Search,
    title: "Sab kuch, ek hi jaga",
    text: "Mobiles, electronics, fashion, beauty aur home & living — 9 categories. Upar wale search bar se apni pasandeeda cheez foran dhundhein.",
  },
  {
    Icon: ShoppingBag,
    title: "Order karna bohat asan",
    text: "Product par Add to Cart ya Buy Now dabayein. Payment Cash on Delivery se karein, ya JazzCash / Easypaisa se advance — jesa aap ko easy lage.",
  },
  {
    Icon: PackageSearch,
    title: "Parcel ki har khabar",
    text: "Track Order page se apne parcel ka status kabhi bhi dekhein — aur order k har step par aap ko notification bhi mile gi.",
  },
  {
    Icon: BadgePercent,
    title: "Pehle order par 10% OFF",
    text: "Naye customers k liye khaas offer: checkout par code WELCOME10 lagayein aur apne pehle order par 10% discount payen.",
  },
  {
    Icon: UserPlus,
    title: "Dost ko invite karein, Rs. 100 payen",
    text: "My Account → Invite a Friend se apna link doston ko bhejein. Dost ko pehle order par FREE delivery mile gi — aur dost ka order deliver hote hi aap ko Rs. 100 ka discount coupon mile ga.",
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

export default function WelcomeGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Replay from My Account (or anywhere) via a window event.
  useEffect(() => {
    const openIt = () => { setStep(0); setOpen(true); };
    window.addEventListener("malac:show-guide", openIt);
    return () => window.removeEventListener("malac:show-guide", openIt);
  }, []);

  // First-visit + just-registered triggers.
  useEffect(() => {
    if (open) return undefined;
    if (BUSY_PREFIXES.some((p) => pathname.startsWith(p))) return undefined;
    if (readPending()) {
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
    if (readSeen()) return undefined;
    if (!CALM_ROUTES.includes(pathname) && !pathname.startsWith("/blog/")) return undefined;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [pathname, open]);

  const close = () => {
    setOpen(false);
    markSeen();
    clearPending();
  };
  const last = step === SLIDES.length - 1;
  const finish = () => {
    close();
    navigate("/shop");
  };
  if (!open) return null;
  const slide = SLIDES[step];
  const SlideIcon = slide.Icon;

  return (
    <div className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome to MALAC — a quick guide">
      <div className="w-full max-w-sm bg-[#FFFBF2] rounded-3xl shadow-2xl p-6 relative max-h-[88vh] overflow-y-auto">
        <button onClick={close} aria-label="Guide band karein" className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-600 p-1">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          {slide.logo ? (
            <img src={LOGO_FULL} alt="MALAC" className="h-20 w-auto object-contain" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <SlideIcon size={30} />
            </span>
          )}
          <h2 className="mt-4 text-xl font-bold text-lux-ink">{slide.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{slide.text}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-orange-500" : "w-2 bg-orange-200"}`} />
          ))}
        </div>

        {last ? (
          <button onClick={finish} className="btn-lux w-full mt-5 py-3 text-sm font-semibold rounded-full">
            Shopping Shuru Karein
          </button>
        ) : (
          <div className="flex items-center justify-between mt-5">
            <button onClick={close} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-2 py-2">Skip</button>
            <button onClick={() => setStep(step + 1)} className="btn-lux inline-flex items-center gap-1 px-6 py-2.5 text-sm font-semibold rounded-full">
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
