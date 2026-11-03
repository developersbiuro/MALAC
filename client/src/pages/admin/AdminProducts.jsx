import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Archive } from "lucide-react";
import api from "../../api/client.js";
import { rs } from "../../utils/format.js";

const STATUSES = ["Active", "Draft", "Out of Stock", "Archived"];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.get("/products", { params: { limit: 100, search, category: category || undefined } })
    .then((r) => setProducts(r.data.products.filter((p) => p.status !== "Archived" || true)))
    .catch(() => {});
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [search, category]);

  const inline = async (id, patch) => {
    const r = await api.patch(`/products/${id}/inline`, patch);
    setProducts((prev) => prev.map((p) => p._id === id ? r.data.product : p));
    setMsg("Saved.");
  };
  const archive = async (id) => {
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.map((p) => p._id === id ? { ...p, status: "Archived" } : p));
  };

  const input = "border rounded px-2 py-1 text-sm w-24";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Products</h1>
        <Link to="/admin/products/new" className="ml-auto bg-brand text-white text-sm rounded px-4 py-2 flex items-center gap-1"><Plus size={16} /> Add New Product</Link>
      </div>
      <div className="bg-white rounded-md p-3 mt-3 flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, SKU, tags..." className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filter by category" className="border rounded px-3 py-2 text-sm" />
      </div>
      {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
      <div className="bg-white rounded-md mt-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead><tr className="text-left text-gray-400 border-b">
            <th className="p-3">Product</th><th>SKU</th><th>Category</th><th>Base Price</th><th>Sale Price</th><th>Stock</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-b last:border-0">
                <td className="p-3"><div className="flex items-center gap-2">
                  <img src={p.images?.[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  <span className="line-clamp-2 max-w-[220px]">{p.title}</span></div></td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.category}</td>
                <td><input type="number" defaultValue={p.basePrice} className={input}
                  onBlur={(e) => Number(e.target.value) !== p.basePrice && inline(p._id, { basePrice: Number(e.target.value) })} /></td>
                <td><input type="number" defaultValue={p.salePrice} className={input}
                  onBlur={(e) => Number(e.target.value) !== p.salePrice && inline(p._id, { salePrice: Number(e.target.value) })} /></td>
                <td><input type="number" defaultValue={p.stock} className={input}
                  onBlur={(e) => Number(e.target.value) !== p.stock && inline(p._id, { stock: Number(e.target.value) })} /></td>
                <td>
                  <select value={p.status} onChange={(e) => inline(p._id, { status: e.target.value })} className="border rounded px-2 py-1">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="pr-3"><div className="flex gap-1">
                  <Link to={`/admin/products/${p._id}/edit`} className="p-1.5 border rounded" aria-label="Edit"><Pencil size={14} /></Link>
                  <button onClick={() => archive(p._id)} className="p-1.5 border rounded text-gray-500" aria-label="Archive"><Archive size={14} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No products found.</p>}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Tip: price and stock fields save on blur (inline edit). Current list view uses the public catalog endpoint, so Draft/Archived items are managed via the edit screen status field.</p>
    </div>
  );
}
