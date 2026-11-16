import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { HERO_SILK } from "../assets/hero.js";
import { useSeo } from "../utils/seo.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// One dedicated page per category (Abdullah, 2026-11-16: "hr category ka
// alag page ho") in the silver theme: a dark hero band with the category
// name + subcategory chips, then that category's products. The classic
// /shop?category= view keeps working for search/filter flows.
const API_SORTS = ["price-asc", "price-desc", "newest", "popular"];
const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Sold" },
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

  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      {/* Dark hero band — black/silver silk backdrop (second reference design) */}
      <section className="relative overflow-hidden bg-lux-deep text-white rounded-3xl px-5 py-7 sm:px-10 sm:py-10">
        <img src={HERO_SILK} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
        <div className="relative">
        <p className="eyebrow !text-neutral-400">The Collection</p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-wide mt-1.5 uppercase">{categoryName}</h1>
        <p className="text-sm sm:text-[15px] text-neutral-400 leading-relaxed mt-2.5 max-w-2xl">{description}</p>
        {meta?.subCategories?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-5 pb-1">
            <button onClick={() => setSub("")}
              className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full border transition ${sub === "" ? "bg-white text-neutral-900 border-white" : "border-white/25 text-neutral-300 hover:border-white/60"}`}>
              All {categoryName}
            </button>
            {meta.subCategories.map((s) => (
              <button key={s._id} onClick={() => setSub(s.name)}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full border transition ${sub === s.name ? "bg-white text-neutral-900 border-white" : "border-white/25 text-neutral-300 hover:border-white/60"}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
      </section>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-cream-line shadow-sm px-3 py-2 mt-4 flex items-center gap-2 text-sm">
        <span className="text-gray-400 text-xs whitespace-nowrap">{products.length} products</span>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-xs text-gray-500">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"
            className="border border-cream-line rounded-full px-3 py-2 bg-white text-sm text-lux-ink">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
        {products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
      {loading && <p className="text-center text-gray-400 py-10">Loading products...</p>}
      {!loading && products.length === 0 && (
        <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line mt-4">
          Is category me abhi koi product nahi — jald araha hai.
        </p>
      )}

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
