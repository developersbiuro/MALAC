import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Baby, BatteryCharging, Briefcase, ChevronDown, Crown, Grip, Headphones,
  LayoutGrid, PlugZap, ShieldCheck, Shirt, Smartphone, Sparkles, Tag,
  User, Users, Wallet, Watch, Glasses, Zap,
} from "lucide-react";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { HERO_SILK } from "../assets/hero.js";
import { LOGO_MARK } from "../assets/logoMark.js";
import { useSeo } from "../utils/seo.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// One dedicated page per category (Abdullah, 2026-11-16: "hr category ka
// alag page ho"), template per his written spec (2026-11-17): steel hero
// banner with the category name + emblem, circular subcategory icon bar,
// VIP strip, flash-sale box, light product grid and an FAQ accordion.
// The classic /shop?category= view keeps working for search/filter flows.
const API_SORTS = ["price-asc", "price-desc", "newest", "popular"];
const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Sold" },
];

function iconFor(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("women")) return Sparkles;
  if (n.includes("kid")) return Baby;
  if (n.includes("unisex")) return Users;
  if (n.includes("men")) return User;
  if (n.includes("charger") || n.includes("cable")) return PlugZap;
  if (n.includes("power")) return BatteryCharging;
  if (n.includes("audio")) return Headphones;
  if (n.includes("cover") || n.includes("protector")) return ShieldCheck;
  if (n.includes("holder") || n.includes("stand")) return Grip;
  if (n.includes("watch")) return Watch;
  if (n.includes("glass") || n.includes("eye")) return Glasses;
  if (n.includes("wallet")) return Wallet;
  if (n.includes("bag")) return Briefcase;
  if (n.includes("mobile") || n.includes("phone")) return Smartphone;
  if (n.includes("shirt") || n.includes("fashion")) return Shirt;
  return Tag;
}

function useMidnightCountdown() {
  const [parts, setParts] = useState(["00", "00", "00"]);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end - now) / 1000));
      const pad = (n) => String(n).padStart(2, "0");
      setParts([pad(Math.floor(s / 3600)), pad(Math.floor((s % 3600) / 60)), pad(s % 60)]);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return parts;
}

const CAT_FAQS = [
  {
    q: "What are your delivery times?",
    a: "Standard delivery takes 2–5 working days anywhere in Pakistan and is free on orders over Rs. 3,000 (otherwise Rs. 249). Express delivery takes 1–2 working days for Rs. 399. Imported items, where marked on the product, take 10–15 working days.",
  },
  {
    q: "How do I track my order?",
    a: "Open the Track Order page and enter your order ID or the phone number from your order — or sign in and open My Orders to see live status, courier and tracking ID once your order ships.",
  },
  {
    q: "What is the return policy?",
    a: "If you receive a damaged, defective or incorrect item, contact us within 7 days of delivery on WhatsApp (+92 3236016684) or info@malac.pp.ua. After inspection we arrange a replacement or refund. Items must be unused and in their original packaging; change-of-mind returns are not accepted.",
  },
];

export default function CategoryPage() {
  const { name } = useParams();
  const categoryName = decodeURIComponent(name || "");
  const { fees } = usePublicSettings();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sub, setSub] = useState("");
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [h, m, s] = useMidnightCountdown();

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
  }, []);

  useEffect(() => { setSub(""); setSort(""); }, [categoryName]);

  useEffect(() => {
    if (!categoryName) return;
    setLoading(true);
    const q = { category: categoryName, limit: 40 };
    if (sub) q.subCategory = sub;
    if (API_SORTS.includes(sort)) q.sort = sort;
    api.get("/products", { params: q })
      .then((r) => setProducts(r.data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categoryName, sub, sort]);

  const meta = categories.find((c) => c.name === categoryName);
  const description = `Shop ${categoryName} online in Pakistan at MALAC — M.A Luxury Apparel Collection, with Cash on Delivery and free standard shipping on orders over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}.`;
  useSeo({
    title: `${categoryName} — Shop Online in Pakistan | MALAC`,
    description,
  });

  const flashInCategory = products.filter((p) => (p.basePrice || 0) > (p.price || 0)).slice(0, 5);
  const subs = meta?.subCategories || [];

  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      {/* Category hero banner — brushed steel + silk (his spec) */}
      <section className="relative overflow-hidden bg-lux-deep text-white rounded-3xl px-5 py-8 sm:px-10 sm:py-12">
        <img src={HERO_SILK} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <img src={LOGO_MARK} alt="" aria-hidden className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 h-24 sm:h-44 w-auto opacity-50 sm:opacity-90 pointer-events-none" />
        <div className="relative max-w-[62%] sm:max-w-2xl">
          <p className="flex items-center gap-3 text-[11px] sm:text-xs font-semibold tracking-[0.34em] text-neutral-300 uppercase">
            <span className="inline-block h-px w-8 bg-neutral-400" /> Premium Collection <span className="inline-block h-px w-8 bg-neutral-400" />
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-wide mt-3 uppercase">{categoryName}</h1>
          <p className="font-display text-base sm:text-xl text-neutral-300 italic mt-2">Step into Luxury – Redefine Your Style</p>
          <a href="#cat-products"
            className="mt-6 inline-flex items-center gap-2 whitespace-nowrap bg-gradient-to-b from-neutral-100 to-neutral-300 text-neutral-900 text-xs font-bold tracking-[0.12em] uppercase px-7 py-3.5 rounded-full shadow hover:from-white hover:to-neutral-200 transition">
            Explore Collection <span aria-hidden>→</span>
          </a>
          <p className="flex gap-1.5 mt-6" aria-hidden>
            <span className="w-6 h-1.5 rounded-full bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
      </section>

      {/* Circular subcategory icon bar — silver strip (his spec) */}
      {subs.length > 0 && (
        <section className="mt-4 rounded-3xl bg-gradient-to-b from-[#e6e6e9] to-[#c7c7cc] border border-neutral-300/70 shadow-sm px-4 py-4">
          <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar justify-start sm:justify-center">
            {[{ name: `All ${categoryName}` }, ...subs].map((s) => {
              const active = sub === (s.name === `All ${categoryName}` ? "" : s.name);
              const Icon = s.name === `All ${categoryName}` ? LayoutGrid : iconFor(s.name);
              return (
                <button key={s.name} onClick={() => setSub(s.name === `All ${categoryName}` ? "" : s.name)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group" aria-pressed={active}>
                  <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-neutral-600 via-neutral-900 to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_10px_rgba(0,0,0,0.35)] transition ${active ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-[#d8d8dc]" : "ring-1 ring-white/50 group-hover:ring-neutral-700"}`}>
                    <Icon size={24} className="text-neutral-100" strokeWidth={1.6} />
                  </span>
                  <span className={`text-[11px] font-semibold ${active ? "text-neutral-900" : "text-neutral-600"}`}>{s.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* VIP promo strip (his spec) */}
      <section className="mt-4 rounded-3xl bg-gradient-to-r from-[#101012] via-[#1c1c20] to-[#101012] text-white px-5 py-4 sm:px-8 flex items-center gap-4 shadow">
        <span className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-b from-neutral-200 to-neutral-400 flex items-center justify-center shadow">
          <Crown size={20} className="text-neutral-900" />
        </span>
        <p className="text-sm sm:text-base leading-snug">
          <span className="font-display font-bold tracking-wide uppercase">VIP Membership Discount:</span>{" "}
          <span className="text-neutral-300">Enjoy exclusive benefits</span>
        </p>
        <Link to="/signup" className="ml-auto shrink-0 inline-flex items-center gap-2 bg-gradient-to-b from-neutral-100 to-neutral-300 text-neutral-900 text-xs font-bold tracking-wide px-5 py-2.5 rounded-full hover:from-white hover:to-neutral-200 transition">
          Activate Now <span aria-hidden>→</span>
        </Link>
      </section>

      {/* Flash Sale box — this category's discounted products (his spec) */}
      {flashInCategory.length > 0 && (
        <section className="mt-4 rounded-3xl bg-[#0d0d0f] text-white p-5 sm:p-6 shadow">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h2 className="flex items-center gap-1.5 font-display text-2xl sm:text-3xl font-bold leading-none tracking-wide">
              <Zap size={22} className="fill-white text-white" /> FLASH SALE
            </h2>
            <span className="flex items-center gap-1 font-mono text-sm font-bold">
              {[h, m, s].map((v, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-white text-neutral-900 rounded-md px-1.5 py-0.5 min-w-[2rem] text-center">{v}</span>
                  {i < 2 && <span className="text-neutral-500 font-bold">:</span>}
                </span>
              ))}
            </span>
            <Link to="/shop?flash=1" className="ml-auto text-xs font-semibold text-neutral-200 hover:text-white">View All →</Link>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar mt-4 pb-1">
            {flashInCategory.map((p) => (
              <div key={p._id} className="w-[180px] sm:w-[210px] shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products — light metallic panel (his spec) */}
      <section id="cat-products" className="scroll-mt-24 mt-4 rounded-3xl bg-[#EAEAEA] border border-neutral-200 p-3 sm:p-5">
        <div className="flex items-center gap-2 text-sm px-1">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-[0.14em] text-lux-ink uppercase">★ Just For You</h2>
          <span className="text-gray-400 text-xs whitespace-nowrap ml-2">{products.length} products</span>
          <span className="flex-1" />
          <label className="flex items-center gap-2 text-xs text-gray-500">Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"
              className="border border-neutral-300 rounded-full px-3 py-2 bg-white text-sm text-lux-ink">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
        {loading && <p className="text-center text-gray-400 py-10">Loading products...</p>}
        {!loading && products.length === 0 && (
          <p className="text-center text-gray-400 py-10">
            Is category me abhi koi product nahi — jald araha hai.
          </p>
        )}
      </section>

      {/* FAQ accordion — dark container (his spec) */}
      <section className="mt-4 rounded-3xl bg-[#0d0d0f] text-white px-6 py-7 sm:px-9">
        <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl font-bold tracking-wide">
          <span className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-base font-bold">?</span>
          Frequently Asked Questions
        </h2>
        <div className="mt-4 divide-y divide-white/10">
          {CAT_FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q}>
                <button type="button" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left">
                  <h3 className="text-sm sm:text-[15px] font-semibold text-neutral-100">{f.q}</h3>
                  <ChevronDown size={18} className={`shrink-0 text-neutral-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="text-sm text-neutral-400 leading-relaxed pb-4 max-w-3xl">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Other categories */}
      {categories.length > 1 && (
        <section className="mt-10 mb-2">
          <div className="flex items-center gap-4 px-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-400/60 to-neutral-400/60" />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-[0.18em] text-lux-ink text-center">MORE CATEGORIES</h2>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-neutral-400/60 to-neutral-400/60" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {categories.filter((c) => c.name !== categoryName).map((c) => (
              <Link key={c._id} to={`/category/${encodeURIComponent(c.name)}`}
                className="text-xs font-semibold uppercase tracking-[0.12em] bg-white border border-cream-line rounded-full px-4 py-2 hover:border-neutral-500 transition">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
