import { useEffect, useState } from "react";
import api from "../api/client.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import FlashSale from "../components/FlashSale.jsx";
import CategoryGrid from "../components/CategoryGrid.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
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
      <FlashSale products={flash} />
      <CategoryGrid categories={categories} />
      <section className="mt-5">
        <h2 className="font-bold text-lg mb-2">Just For You</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full border ${tab === t ? "bg-brand text-white border-brand" : "bg-white"}`}>{t}</button>
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
