import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";

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
    if (sort) q.sort = sort;
    if (minPrice) q.minPrice = minPrice;
    if (maxPrice) q.maxPrice = maxPrice;
    api.get("/products", { params: q }).then((r) => setProducts(r.data.products)).catch(() => setProducts([]));
  }, [search, category, sub, flash, sort, minPrice, maxPrice]);

  const title = search ? `Results for "${search}"` : category || (flash ? "Flash Sale" : "All Products");
  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      <h1 className="font-bold text-xl">{title}</h1>
      {sub && <p className="text-sm text-gray-500">{category} / {sub}</p>}
      <div className="bg-white rounded-md p-3 mt-3 flex flex-wrap gap-3 items-center text-sm">
        <label>Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded ml-2 px-2 py-1">
            <option value="">Recommended</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Sold</option>
          </select>
        </label>
        <label>Min <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" className="border rounded ml-1 px-2 py-1 w-24" /></label>
        <label>Max <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" className="border rounded ml-1 px-2 py-1 w-24" /></label>
        <span className="ml-auto text-gray-400">{products.length} items</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
        {products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
      {products.length === 0 && <p className="text-center text-gray-400 py-10 bg-white rounded-md mt-3">No products match your filters.</p>}
    </main>
  );
}
