import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Gem, ShieldCheck, Truck, Headphones } from "lucide-react";
import api from "../api/client.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import InviteBanner from "../components/InviteBanner.jsx";
import FlashSale from "../components/FlashSale.jsx";
import CategoryGrid from "../components/CategoryGrid.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { DESIGN_ABOUT_STORE, FEATURED_TILES } from "../assets/design.js";
import { useSeo } from "../utils/seo.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// Homepage layout — Abdullah's final reference designs (2026-11-16 night),
// section order per his word (23:43): Hero → Invite → Flash Sale →
// Shop by Category → Featured Collections → New Arrivals → About → FAQ.
// Texts mirror his designs; delivery figures still come from the live
// store Settings.

// FAQ answers mirror the store's real rules in Terms of Service /
// Privacy Policy — keep the visible text and the FAQPage JSON-LD in sync.
const buildFaqs = (fees) => [
  {
    q: "How do I place an order on MALAC?",
    a: "Create a MALAC account or sign in — an account is required to place an order. Add the items you like to your cart, go to checkout, confirm your delivery address and payment method, and place your order. Every order is reviewed and confirmed by our team before it is packed and dispatched.",
  },
  {
    q: "How do I pay with JazzCash or Easypaisa?",
    a: "At checkout, choose JazzCash or Easypaisa and transfer the order total to account title Muhammad Abdullah, number 0303 6253428 — or choose Meezan Bank and transfer to the store's Meezan account (title Muhammad Abdullah, account 04820113003065), or NayaPay / SadaPay / FirstPay — HBL Microfinance Bank to number 0303 6253428. Then upload your payment screenshot and transaction details with your order. Our team verifies the payment before your order is processed; if a payment cannot be verified, we will contact you and the order will not be dispatched until it is resolved. Cash on Delivery is also available — pay in cash when your order arrives.",
  },
  {
    q: "When is shipping free?",
    a: `Standard shipping is free on orders over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}. On smaller orders, standard delivery is Rs. ${fees.standard} on most orders (the exact fee for an item is shown on its product page). Express delivery is available at checkout for Rs. ${fees.express} where offered. We deliver nationwide across Pakistan through courier partners including TCS, Leopards and Trax.`,
  },
  {
    q: "How can I track my order?",
    a: "Use the Track Your Order page with your order ID and the phone number from your order, or sign in and open My Orders to follow your order's status at any time.",
  },
  {
    q: "What is MALAC's return and exchange policy?",
    a: "If you receive a damaged, defective or incorrect item, contact us within 7 days of delivery on WhatsApp (+92 3236016684) or by email (info@malac.pp.ua) with your order number. After we inspect the returned item, we will arrange a replacement or a refund. Items must be unused and in their original packaging. For hygiene and safety reasons, certain items may not be returnable, and change-of-mind returns are not accepted.",
  },
  {
    q: "How do I contact MALAC?",
    a: "Message us on WhatsApp at +92 3236016684 or email us at info@malac.pp.ua — for order help, payment questions, or anything about your account.",
  },
];

const ABOUT_FEATURES = [
  { Icon: Gem, label: "Premium Quality" },
  { Icon: ShieldCheck, label: "Authentic Products" },
  { Icon: Truck, label: "Reliable Delivery" },
  { Icon: Headphones, label: "Dedicated Support" },
];

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-4 px-1">
      <span className="h-px flex-1 bg-neutral-400/60" />
      <h2 className="font-display text-lg sm:text-xl font-bold tracking-[0.22em] text-lux-ink text-center uppercase">{children}</h2>
      <span className="h-px flex-1 bg-neutral-400/60" />
    </div>
  );
}

export default function Home() {
  const { fees } = usePublicSettings();
  const FAQS = buildFaqs(fees);
  useSeo({
    title: "MALAC — Online Shopping in Pakistan | M.A Luxury Apparel Collection",
    description: `MALAC — M.A Luxury Apparel Collection. Premium men's and women's fashion, watches, eyewear and bags & accessories online in Pakistan, with Cash on Delivery and free shipping on orders over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  });
  const [openFaq, setOpenFaq] = useState(0);
  const [categories, setCategories] = useState([]);
  const [flash, setFlash] = useState([]);
  const [newest, setNewest] = useState([]);
  const [pool, setPool] = useState([]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
    api.get("/products", { params: { flashSale: "true", limit: 12 } }).then((r) => setFlash(r.data.products)).catch(() => {});
    api.get("/products", { params: { sort: "newest", limit: 10 } }).then((r) => setNewest(r.data.products)).catch(() => {});
    api.get("/products", { params: { limit: 60 } }).then((r) => setPool(r.data.products)).catch(() => {});
  }, []);

  const tileLink = (tile) => {
    const hit = pool.find((p) => tile.match.test(p.title));
    return hit ? `/product/${hit.slug}` : tile.fallback;
  };

  return (
    <main>
      <HeroCarousel />

      <div className="max-w-7xl mx-auto px-3">
        {/* Invite — hero ke foran baad (Abdullah, 23:43) */}
        <InviteBanner />

        <FlashSale products={flash} />
      </div>

      {/* Shop by Category — reference design ki dark band: sirf photo cards ki row */}
      <section className="bg-[#0b0b0d] mt-10 sm:mt-12 py-5 sm:py-7">
        <div className="max-w-7xl mx-auto px-3">
          <CategoryGrid categories={categories} />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3">

      {/* Featured Collections — Shop by Category ke neeche (Abdullah) */}
      <section className="mt-10 sm:mt-12">
        <SectionHeading>Featured Collections</SectionHeading>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-5">
          {FEATURED_TILES.map((tile) => (
            <Link key={tile.label} to={tileLink(tile)}
              className="group relative rounded-xl overflow-hidden bg-[#e8eaee] aspect-square shadow-sm hover:shadow-lux transition-shadow">
              <img src={tile.img} alt={tile.label} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </Link>
          ))}
        </div>
      </section>
      </div>

      {/* New Arrivals — halki grey band (reference design): intro block left, product row right */}
      <section className="bg-[#f3f4f6] mt-10 sm:mt-12 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-3">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="shrink-0 lg:w-60 px-1 flex flex-col justify-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-[1.05] tracking-wide text-lux-ink">NEW<br />ARRIVALS</h2>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">Be the first to own the latest from MALAC.</p>
            <Link to="/shop" className="mt-4 w-max inline-flex items-center gap-2 bg-lux-ink text-white text-xs font-semibold uppercase tracking-[0.1em] rounded-md px-5 py-3 hover:bg-black transition-colors">
              Shop New Arrivals <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1 flex-1 min-w-0">
            {newest.map((p) => (
              <div key={p._id} className="w-[200px] sm:w-[224px] shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
            {newest.length === 0 && <p className="text-gray-400 text-sm py-8">Loading products...</p>}
          </div>
        </div>
        </div>
      </section>

      {/* About — full-bleed dark band (reference design): store photo, story, feature list */}
      <section className="bg-lux-deep text-white overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_1.2fr_0.8fr]">
          <div className="relative min-h-[220px] lg:min-h-full">
            <img src={DESIGN_ABOUT_STORE} alt="Inside a MALAC store" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
          </div>
          <div className="px-6 py-8 sm:px-10 flex flex-col justify-center">
            <p className="eyebrow !text-neutral-400 flex items-center gap-3">
              About MALAC <span className="inline-block h-px w-10 bg-neutral-500" />
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight mt-2">
              More Than a Brand,<br />It&apos;s a Lifestyle.
            </h2>
            <p className="text-sm sm:text-[15px] text-neutral-400 leading-relaxed mt-3 max-w-md">
              MALAC is a premium lifestyle brand, offering high-quality fashion, watches and accessories
              for those who value elegance and individuality.
            </p>
            <Link to="/about" className="mt-5 w-max inline-flex items-center gap-2 border border-white/70 text-white text-xs font-semibold uppercase tracking-[0.1em] rounded-md px-5 py-3 hover:bg-white hover:text-neutral-900 transition-colors">
              Know More <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="px-6 py-8 sm:px-10 lg:border-l border-white/10 flex flex-col justify-center gap-5">
            {ABOUT_FEATURES.map(({ Icon, label }) => (
              <p key={label} className="flex items-center gap-3.5 text-sm font-medium text-neutral-200">
                <Icon size={24} className="text-neutral-300 shrink-0" strokeWidth={1.5} /> {label}
              </p>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3">
      {/* FAQ — answers mirror the Terms / Policy pages (see FAQS above) */}
      <section className="bg-[#101014] text-white border border-white/10 rounded-3xl shadow-sm mt-10 sm:mt-12 px-6 py-8 sm:px-10 mb-4">
        <p className="eyebrow !text-neutral-400">Good To Know</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight mt-1 tracking-wide">Frequently Asked Questions</h2>
        <div className="lux-divider mt-3" />
        <div className="mt-4 divide-y divide-white/10">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q}>
                <button type="button" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left">
                  <h3 className="font-serif text-lg font-semibold leading-snug text-white">{f.q}</h3>
                  <ChevronDown size={18} className={`shrink-0 text-neutral-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="text-sm sm:text-[15px] text-neutral-400 leading-relaxed pb-4 max-w-3xl">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
