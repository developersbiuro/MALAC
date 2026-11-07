import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, SlidersHorizontal, Star, X } from "lucide-react";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { useSeo } from "../utils/seo.js";

// API-supported sort values are sent to the server. "rating" is not one of
// them (server sortMap has price-asc / price-desc / newest / popular), so
// Highest Rating is applied client-side to the fetched results.
const API_SORTS = ["price-asc", "price-desc", "newest", "popular"];

// The sort options offered in the desktop bar and the mobile bar select —
// one combined list, values mirror the <option>s the shop has always had.
const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rating" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Sold" },
];

// The mobile filter sheet groups the same single `sort` state into
// separate sections, as Abdullah asked (2026-11-07): general sort,
// price order, and "Highest Rating" which lives with the rating filter.
const SHEET_SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Sold" },
];
const SHEET_PRICE_OPTIONS = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// Minimum-rating filter choices for the sheet: "Any" plus 1–5 stars
// (a product passes when its average rating is at least the choice).
const RATING_OPTIONS = [0, 1, 2, 3, 4, 5];

// Short, generic descriptions shown when a category is selected — written
// from the category name only (no invented product specifics). Keys are
// the store's real category names.
const CATEGORY_DESCRIPTIONS = {
  "Mobiles & Tablets": "Shop mobiles and tablets online in Pakistan at MALAC — smartphones, tablets and mobile accessories with prices in PKR, Cash on Delivery, and standard shipping free on orders over Rs. 5,000.",
  "Electronics": "Shop electronics online in Pakistan at MALAC — LED TVs, audio and cameras for home and everyday use, delivered nationwide with Cash on Delivery and free standard shipping on orders over Rs. 5,000.",
  "Fashion": "Shop fashion online in Pakistan at MALAC — clothing and footwear for men and women, from embroidered lawn suits and kurta shalwar to everyday shoes, with Cash on Delivery and free standard shipping on orders over Rs. 5,000.",
  "Home & Living": "Shop home and living essentials online in Pakistan at MALAC — furniture, kitchen and bedding picks for every room, delivered nationwide with Cash on Delivery and free standard shipping on orders over Rs. 5,000.",
  "Beauty & Health": "Shop beauty and health products online in Pakistan at MALAC — skincare, makeup and personal care essentials, with Cash on Delivery and standard shipping free on orders over Rs. 5,000.",
  "Groceries": "Shop groceries online in Pakistan at MALAC — everyday staples, snacks and beverages for your kitchen, delivered to your door with Cash on Delivery and free standard shipping on orders over Rs. 5,000.",
  "Sports & Fitness": "Shop sports and fitness gear online in Pakistan at MALAC — gym equipment, cricket gear and outdoor essentials, with Cash on Delivery and standard shipping free on orders over Rs. 5,000.",
  "Toys & Baby": "Shop toys and baby products online in Pakistan at MALAC — toys, diapers and feeding essentials for little ones, delivered nationwide with Cash on Delivery and free standard shipping on orders over Rs. 5,000.",
};

export default function Shop() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const sub = params.get("sub") || "";
  const flash = params.get("flash");

  useEffect(() => {
    const q = { limit: 40 };
    if (search) q.search = search;
    if (category) q.category = category;
    if (sub) q.subCategory = sub;
    if (flash) q.flashSale = "true";
    if (API_SORTS.includes(sort)) q.sort = sort;
    if (minPrice) q.minPrice = minPrice;
    if (maxPrice) q.maxPrice = maxPrice;
    api.get("/products", { params: q })
      .then((r) => {
        let list = r.data.products;
        if (sort === "rating") {
          list = [...list].sort((a, b) =>
            (b.ratingAvg || 0) - (a.ratingAvg || 0) || (b.ratingCount || 0) - (a.ratingCount || 0));
        }
        // Minimum-rating filter (client-side; the API has no rating param).
        if (minRating > 0) list = list.filter((p) => (p.ratingAvg || 0) >= minRating);
        setProducts(list);
      })
      .catch(() => setProducts([]));
  }, [search, category, sub, flash, sort, minPrice, maxPrice, minRating]);

  // While the mobile filter sheet is open, lock page scroll and let
  // Escape close it (backdrop tap also closes).
  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setFilterOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const resetFilters = () => { setSort(""); setMinPrice(""); setMaxPrice(""); setMinRating(0); };
  // Badge on the mobile Filter button: price bounds + an active rating
  // filter count — the active sort is already visible in the bar's select.
  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating > 0 ? 1 : 0);

  const title = search ? `Results for "${search}"` : category || (flash ? "Flash Sale" : "All Products");
  useSeo({
    title: !search && !category && !flash ? "Online Shopping in Pakistan — All Products | MALAC" : `${title} — MALAC`,
    description: category
      ? `Shop ${category} online in Pakistan at MALAC — M.A Luxury Apparel Collection, with Cash on Delivery and free shipping on orders over Rs. 5,000.`
      : "Online shopping in Pakistan at MALAC — shop all products: mobiles, electronics, fashion, beauty, home & living and more, with Cash on Delivery and free shipping on orders over Rs. 5,000.",
  });
  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      <p className="eyebrow">The Collection</p>
      <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 break-words">{title}</h1>
      {sub && <p className="text-sm text-gray-500 mt-1">{category} / {sub}</p>}
      {category && CATEGORY_DESCRIPTIONS[category] && (
        <p className="text-sm text-gray-500 leading-relaxed mt-2 max-w-3xl">{CATEGORY_DESCRIPTIONS[category]}</p>
      )}
      {/* Desktop filter bar — the original always-visible panel, lg and up
          only. Below lg the same controls live in the bar + sheet below. */}
      <div className="bg-white rounded-2xl border border-cream-line shadow-sm p-3 mt-3 hidden lg:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center text-sm">
        <label className="flex items-center gap-2 sm:gap-0">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-cream-line rounded-full sm:ml-2 px-3 py-2 sm:py-1.5 bg-white flex-1 sm:flex-none min-w-0">
            <option value="">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rating</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Sold</option>
          </select>
        </label>
        <div className="flex gap-3 sm:contents">
          <label className="flex items-center gap-2 sm:gap-0 flex-1 sm:flex-none">Min <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" inputMode="numeric" className="border border-cream-line rounded-full sm:ml-1 px-3 py-2 sm:py-1.5 w-full sm:w-24 min-w-0" /></label>
          <label className="flex items-center gap-2 sm:gap-0 flex-1 sm:flex-none">Max <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" inputMode="numeric" className="border border-cream-line rounded-full sm:ml-1 px-3 py-2 sm:py-1.5 w-full sm:w-24 min-w-0" /></label>
        </div>
        <span className="sm:ml-auto text-gray-400">Showing {products.length} products</span>
      </div>
      {/* Mobile top bar (Daraz layout pattern, MALAC theme): result count,
          a compact sort select and a Filter button — the full filter set
          is contained in the slide-in sheet, never an always-open panel. */}
      <div className="lg:hidden bg-white rounded-2xl border border-cream-line shadow-sm px-3 py-2 mt-3 flex items-center gap-2 text-sm">
        <span className="text-gray-400 text-xs whitespace-nowrap">{products.length} products</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"
          className="flex-1 min-w-0 border border-cream-line rounded-full px-3 py-2 bg-white">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setFilterOpen(true)} className="btn-lux relative px-4 py-2 text-sm shrink-0">
          <SlidersHorizontal size={16} /> Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-lux-ink text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-0.5 flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>
      {/* Mobile filter sheet: right-side drawer holding the same sort +
          price state as the desktop bar (live-applied, as before). */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setFilterOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-line">
              <span className="font-display text-lg font-bold">Filters</span>
              <button onClick={() => setFilterOpen(false)} aria-label="Close filters" className="p-1.5 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <section>
                <p className="eyebrow mb-2">Sort by</p>
                <div className="border border-cream-line rounded-xl overflow-hidden divide-y divide-cream-line">
                  {SHEET_SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => setSort(o.value)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left ${sort === o.value ? "text-lux-burnt font-semibold bg-cream-soft" : "text-gray-700"}`}>
                      {o.label}
                      {sort === o.value && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <p className="eyebrow mb-2">Price order</p>
                <div className="border border-cream-line rounded-xl overflow-hidden divide-y divide-cream-line">
                  {SHEET_PRICE_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => setSort(sort === o.value ? "" : o.value)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left ${sort === o.value ? "text-lux-burnt font-semibold bg-cream-soft" : "text-gray-700"}`}>
                      {o.label}
                      {sort === o.value && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <p className="eyebrow mb-2">Rating</p>
                <button onClick={() => setSort(sort === "rating" ? "" : "rating")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left border border-cream-line rounded-xl mb-2 ${sort === "rating" ? "text-lux-burnt font-semibold bg-cream-soft" : "text-gray-700"}`}>
                  Highest Rating first
                  {sort === "rating" && <Check size={16} />}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {RATING_OPTIONS.map((r) => (
                    <button key={r} onClick={() => setMinRating(r)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold ${minRating === r ? "border-lux-amber bg-cream-soft text-lux-burnt" : "border-cream-line text-gray-600"}`}>
                      {r === 0 ? "Any rating" : (<>{r}<Star size={11} className="fill-lux-gold text-lux-gold" /> & up</>)}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <p className="eyebrow mb-2">Price (Rs.)</p>
                <div className="flex items-center gap-2">
                  <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" inputMode="numeric" placeholder="Min"
                    className="flex-1 min-w-0 border border-cream-line rounded-xl px-3 py-2.5 bg-white" />
                  <span className="text-gray-300">—</span>
                  <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" inputMode="numeric" placeholder="Max"
                    className="flex-1 min-w-0 border border-cream-line rounded-xl px-3 py-2.5 bg-white" />
                </div>
              </section>
            </div>
            <div className="border-t border-cream-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
              <button onClick={resetFilters} className="px-5 py-2.5 rounded-full border border-cream-line text-sm font-semibold text-gray-600">Reset</button>
              <button onClick={() => setFilterOpen(false)} className="btn-lux flex-1 py-2.5 text-sm">Show {products.length} results</button>
            </div>
          </aside>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-3">
        {products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
      {products.length === 0 && <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line mt-3">No products match your filters.</p>}
    </main>
  );
}
