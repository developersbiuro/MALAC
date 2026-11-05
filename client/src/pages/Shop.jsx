import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { useSeo } from "../utils/seo.js";

// API-supported sort values are sent to the server. "rating" is not one of
// them (server sortMap has price-asc / price-desc / newest / popular), so
// Highest Rating is applied client-side to the fetched results.
const API_SORTS = ["price-asc", "price-desc", "newest", "popular"];

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
        setProducts(list);
      })
      .catch(() => setProducts([]));
  }, [search, category, sub, flash, sort, minPrice, maxPrice]);

  const title = search ? `Results for "${search}"` : category || (flash ? "Flash Sale" : "All Products");
  useSeo({
    title: `${title} — MALAC`,
    description: category
      ? `Shop ${category} online in Pakistan at MALAC — M.A Luxury Apparel Collection, with Cash on Delivery and free shipping on orders over Rs. 5,000.`
      : "Shop all products at MALAC — M.A Luxury Apparel Collection. Fashion, beauty, electronics and more online in Pakistan with Cash on Delivery and free shipping on orders over Rs. 5,000.",
  });
  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      <p className="eyebrow">The Collection</p>
      <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 break-words">{title}</h1>
      {sub && <p className="text-sm text-gray-500 mt-1">{category} / {sub}</p>}
      {category && CATEGORY_DESCRIPTIONS[category] && (
        <p className="text-sm text-gray-500 leading-relaxed mt-2 max-w-3xl">{CATEGORY_DESCRIPTIONS[category]}</p>
      )}
      <div className="bg-white rounded-2xl border border-cream-line shadow-sm p-3 mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center text-sm">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
        {products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
      {products.length === 0 && <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line mt-3">No products match your filters.</p>}
    </main>
  );
}
