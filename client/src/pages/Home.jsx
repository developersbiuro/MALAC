import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Truck, ShieldCheck, MapPin, PackageSearch } from "lucide-react";
import api from "../api/client.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import FlashSale from "../components/FlashSale.jsx";
import CategoryGrid from "../components/CategoryGrid.jsx";
import ProductCard from "../components/ProductCard.jsx";

import { useSeo } from "../utils/seo.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

const buildTrust = (fees) => [
  { Icon: BadgeCheck, label: "Cash on Delivery Available" },
  { Icon: Truck, label: `Free Shipping Over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}` },
  { Icon: ShieldCheck, label: "Secure Ordering" },
  { Icon: MapPin, label: "Nationwide Delivery" },
];

// FAQ answers mirror the store's real rules in Terms of Service /
// Privacy Policy — keep the visible text and the FAQPage JSON-LD in sync.
// Delivery figures come from the live store Settings (Admin → Settings)
// via usePublicSettings, like everywhere else on the storefront.
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
    a: "If you receive a damaged, defective or incorrect item, contact us within 7 days of delivery on WhatsApp (+92 3236016684) or by email (developersbiuro@gmail.com) with your order number. After we inspect the returned item, we will arrange a replacement or a refund. Items must be unused and in their original packaging. For hygiene and safety reasons, certain items may not be returnable, and change-of-mind returns are not accepted.",
  },
  {
    q: "How do I contact MALAC?",
    a: "Message us on WhatsApp at +92 3236016684 or email us at developersbiuro@gmail.com — for order help, payment questions, or anything about your account.",
  },
];

export default function Home() {
  const { fees } = usePublicSettings();
  const TRUST = buildTrust(fees);
  const FAQS = buildFaqs(fees);
  useSeo({
    title: "MALAC — Online Shopping in Pakistan | M.A Luxury Apparel Collection",
    description: `Online shopping in Pakistan at MALAC — mobiles, electronics, fashion, beauty, home & living and more, with Cash on Delivery and free shipping on orders over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}.`,
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
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState("");
  const [categories, setCategories] = useState([]);
  const [flash, setFlash] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
    api.get("/products", { params: { flashSale: "true", limit: 12 } }).then((r) => setFlash(r.data.products)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 20, page };
    if (tab !== "All") params.category = tab;
    api.get("/products", { params })
      .then((r) => {
        setProducts((prev) => page === 1 ? r.data.products : [...prev, ...r.data.products]);
        setPages(r.data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page]);

  const tabs = ["All", ...categories.map((c) => c.name)];
  return (
    <main className="max-w-7xl mx-auto px-3 pt-3">
      <HeroCarousel />
      <CategoryGrid categories={categories} />
      <div className="bg-white border border-cream-line rounded-2xl shadow-sm mt-3 px-4 py-3 flex flex-wrap justify-center gap-x-7 gap-y-2">
        {TRUST.map(({ Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-gray-700">
            <Icon size={16} className="text-[#059669]" /> {label}
          </span>
        ))}
      </div>
      {/* Track Your Order band — tracking itself is a signed-in function;
          submitting sends guests to login first, then back to tracking. */}
      <section className="bg-lux-ink text-white rounded-2xl mt-3 px-4 py-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="shrink-0">
          <p className="eyebrow !text-lux-pale">Order Tracking</p>
          <h2 className="font-serif text-2xl font-semibold leading-tight">Track Your Order</h2>
          <p className="text-xs text-white/60">Order ID ya phone number — login ke baad jo bhi likhein, order mil jayega.</p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const v = trackId.trim();
            const q = /^mlc/i.test(v) ? new URLSearchParams({ orderId: v }) : new URLSearchParams({ phone: v });
            navigate(`/track-order?${q.toString()}`);
          }}
        >
          <input value={trackId} onChange={(e) => setTrackId(e.target.value)} required placeholder="Order ID (MLC-...) ya phone number"
            className="flex-1 rounded-full px-4 py-2.5 text-sm text-lux-ink bg-white outline-none" />
          <button className="btn-lux px-6 py-2.5 text-sm shrink-0"><PackageSearch size={16} /> Track Order</button>
        </form>
      </section>
      <FlashSale products={flash} />
      <section className="mt-6">
        <p className="eyebrow">Curated Picks</p>
        <h2 className="font-serif text-3xl font-semibold leading-none mt-1 mb-3">Just For You</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`whitespace-nowrap text-sm px-4 py-1.5 rounded-full border ${tab === t ? "bg-lux-gradient text-white border-transparent font-semibold" : "bg-white border-cream-line"}`}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
        {loading && <p className="text-center text-gray-400 py-4">Loading products...</p>}
        {!loading && products.length === 0 && <p className="text-center text-gray-400 py-8">No products found.</p>}
        {page < pages && (
          <div className="text-center py-5">
            <button onClick={() => setPage((p) => p + 1)} className="bg-white border px-8 py-2 rounded text-sm hover:border-lux-amber hover:text-lux-burnt">Load More</button>
          </div>
        )}
      </section>

      {/* About MALAC — SEO content */}
      <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-6 px-5 py-6 sm:px-8">
        <p className="eyebrow">About MALAC</p>
        <h2 className="font-serif text-3xl font-semibold leading-tight mt-1">Luxury Apparel &amp; Ladies Fashion Online in Pakistan</h2>
        <div className="text-sm sm:text-[15px] text-gray-600 leading-relaxed space-y-3 mt-3 max-w-3xl">
          <p>
            MALAC — M.A Luxury Apparel Collection is an online fashion store in Pakistan for shoppers who want
            considered, well-made clothing without leaving home. Our Fashion collection brings ladies fashion and
            menswear together in one place — embroidered 3-piece lawn suits, premium cotton kurta shalwar and
            everyday footwear — alongside the wider MALAC catalogue of Mobiles &amp; Tablets, Electronics,
            Home &amp; Living, Beauty &amp; Health, Groceries, Sports &amp; Fitness and Toys &amp; Baby.
          </p>
          <p>
            Looking for ladies fashion online in Pakistan? Start with our women&apos;s lawn suits — printed lawn
            shirts with embroidered necklines, chiffon dupattas and dyed cambric trousers — and complete the look
            with skincare and personal care from Beauty &amp; Health. Every product page shows the full price in
            Pakistani Rupees, any discount, and live stock, so you know exactly what you are ordering before you
            check out.
          </p>
          <p>
            Ordering is straightforward: pay with Cash on Delivery, or by JazzCash / Easypaisa / bank (Meezan, NayaPay, SadaPay, FirstPay) transfer with a
            payment screenshot our team verifies before dispatch. Standard delivery is Rs. {fees.standard} on most orders and
            free on orders over Rs. {fees.freeThreshold.toLocaleString("en-PK")}, and we deliver nationwide through courier partners including TCS,
            Leopards and Trax. Once your order is placed, you can follow it any time from the Track Your Order page.
          </p>
        </div>
      </section>

      {/* FAQ — answers mirror the Terms / Policy pages (see FAQS above) */}
      <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-3 px-5 py-6 sm:px-8 mb-2">
        <p className="eyebrow">Good To Know</p>
        <h2 className="font-serif text-3xl font-semibold leading-tight mt-1">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y divide-cream-line">
          {FAQS.map((f) => (
            <div key={f.q} className="py-3.5">
              <h3 className="font-serif text-lg font-semibold leading-snug">{f.q}</h3>
              <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed mt-1 max-w-3xl">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
