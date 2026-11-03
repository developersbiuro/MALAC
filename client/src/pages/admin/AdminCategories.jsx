import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminCategories() {
  const { isSuperAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", icon: "ShoppingBag", subCategories: "" });
  const [error, setError] = useState("");
  const load = () => api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.post("/categories", {
        name: form.name, icon: form.icon,
        subCategories: form.subCategories.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setForm({ name: "", icon: "ShoppingBag", subCategories: "" }); load();
    } catch (err) { setError(err.response?.data?.message || "Could not create category"); }
  };
  const remove = async (id) => { await api.delete(`/categories/${id}`); load(); };
  const input = "border rounded px-3 py-2 text-sm w-full";

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">Category Manager</h1>
      <form onSubmit={create} className="bg-white rounded-md p-4 mt-3 grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Name<input required className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm">Lucide icon name<input className={input} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
        <label className="text-sm">Sub-categories (comma separated)<input className={input} value={form.subCategories} onChange={(e) => setForm({ ...form, subCategories: e.target.value })} /></label>
        {error && <p className="text-red-500 text-sm sm:col-span-3">{error}</p>}
        <button className="bg-brand text-white rounded px-5 py-2 text-sm w-max">Add Category</button>
      </form>
      <div className="bg-white rounded-md mt-3 divide-y">
        {categories.map((c, i) => (
          <div key={c._id} className="p-3 flex items-center gap-3 text-sm">
            <span className="text-gray-300 font-mono">{i + 1}</span>
            <div className="flex-1">
              <p className="font-medium">{c.name} <span className="text-gray-400 text-xs">({c.icon})</span></p>
              <p className="text-xs text-gray-400">{(c.subCategories || []).map((s) => s.name).join(" · ") || "No sub-categories"}</p>
            </div>
            {isSuperAdmin && <button onClick={() => remove(c._id)} className="text-red-400 p-1" aria-label="Delete category"><Trash2 size={16} /></button>}
          </div>
        ))}
        {categories.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No categories yet.</p>}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Order in the list follows the category sortOrder (set via API). Deleting a category is Super Admin only.</p>
    </div>
  );
}
