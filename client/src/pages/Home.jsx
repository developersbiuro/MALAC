import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Truck, ShieldCheck, MapPin, PackageSearch } from "lucide-react";
import api from "../api/client.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import FlashSale from "../components/FlashSale.jsx";
import CategoryGrid from "../components/CategoryGrid.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useSeo } from "../utils/seo.js";

const TRUST = [
  { Icon: BadgeCheck, label: "Cash on Delivery Available" },
  { Icon: Truck, label: "Free Shipping Over Rs. 5,000" },
  { Icon: ShieldCheck, label: "Secure Ordering" },
  { Icon: MapPin, label: "Nationwide Delivery" },
];

export default function Home() {
  useSeo({
    title: "MALAC - M.A Luxury Apparel Collection",
    description: "MALAC — M.A Luxury Apparel Collection. Shop fashion, beauty, electronics and more online in Pakistan with Cash on Delivery and free shipping on orders over Rs. 5,000.",
  });
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
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
      <div className="bg-white border border-cream-line rounded-2xl shadow-sm mt-3 px-4 py-3 flex flex-wrap justify-center gap-x-7 gap-y-2">
        {TRUST.map(({ Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-gray-700">
            <Icon size={16} className="text-[#059669]" /> {label}
          </span>
        ))}
      </div>
      {/* Track Your Order band — guests track with order ID + phone */}
      <section className="bg-lux-ink text-white rounded-2xl mt-3 px-4 py-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="shrink-0">
          <p className="eyebrow !text-lux-pale">Order Tracking</p>
          <h2 className="font-serif text-2xl font-semibold leading-tight">Track Your Order</h2>
          <p className="text-xs text-white/60">Use your order ID and the phone number from your order.</p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new URLSearchParams({ orderId: trackId.trim(), phone: trackPhone.trim() });
            navigate(`/track-order?${q.toString()}`);
          }}
        >
          <input value={trackId} onChange={(e) => setTrackId(e.target.value)} required placeholder="Order ID (MLC-...)"
            className="flex-1 rounded-full px-4 py-2.5 text-sm text-lux-ink bg-white outline-none" />
          <input value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} required placeholder="Phone number (03xx-xxxxxxx)" inputMode="tel"
            className="flex-1 rounded-full px-4 py-2.5 text-sm text-lux-ink bg-white outline-none" />
          <button className="btn-lux px-6 py-2.5 text-sm shrink-0"><PackageSearch size={16} /> Track Order</button>
        </form>
      </section>
      <FlashSale products={flash} />
      <CategoryGrid categories={categories} />
      <section className="mt-6">
        <p className="eyebrow">Curated Picks</p>
        <h2 className="font-serif text-3xl font-semibold leading-none mt-1 mb-3">Just For You</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`whitespace-nowrap text-sm px-4 py-1.5 rounded-full border ${tab === t ? "bg-lux-gradient text-white border-transparent font-semibold" : "bg-white border-cream-line"}`}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
        {loading && <p className="text-center text-gray-400 py-4">Loading products...</p>}
        {!loading && products.length === 0 && <p className="text-center text-gray-400 py-8">No products found.</p>}
        {page < pages && (
          <div className="text-center py-5">
            <button onClick={() => setPage((p) => p + 1)} className="bg-white border px-8 py-2 rounded text-sm hover:border-brand hover:text-brand">Load More</button>
          </div>
        )}
      </section>
    </main>
  );
}
