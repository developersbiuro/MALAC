import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client.js";
import ImageUploadField from "../../components/ImageUploadField.jsx";

const empty = {
  title: "", description: "", images: [""], category: "", subCategory: "",
  basePrice: "", salePrice: "", stock: "", sku: "", tags: "", status: "Active", flashSale: false,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    // The admin list is catalog-based; fetch all and pick this product.
    api.get("/products", { params: { limit: 100 } }).then((r) => {
      const p = r.data.products.find((x) => x._id === id);
      if (p) setForm({ ...p, images: p.images?.length ? p.images : [""], tags: (p.tags || []).join(", ") });
    }).catch(() => {});
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setError("");
    const payload = {
      ...form,
      images: form.images.filter(Boolean),
      basePrice: Number(form.basePrice), salePrice: Number(form.salePrice || 0),
      stock: Number(form.stock || 0),
      tags: String(form.tags).split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (id) await api.put(`/products/${id}`, payload);
      else await api.post("/products", payload);
      navigate("/admin/products");
    } catch (err) { setError(err.response?.data?.message || "Could not save product"); }
  };

  const input = "border rounded px-3 py-2 text-sm w-full";
  const subs = categories.find((c) => c.name === form.category)?.subCategories || [];
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">{id ? "Edit Product" : "Add New Product"}</h1>
      <form onSubmit={submit} className="bg-white rounded-md p-4 mt-3 grid sm:grid-cols-2 gap-3">
        <label className="sm:col-span-2 text-sm">Title<input required className={input} value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="sm:col-span-2 text-sm">Description<textarea className={input} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <div className="sm:col-span-2 text-sm">Images
          {form.images.map((src, i) => (
            <div key={i} className="mt-1 flex items-start gap-2">
              <div className="flex-1">
                <ImageUploadField value={src}
                  onChange={(v) => { const next = [...form.images]; next[i] = v; set("images", next); }} />
              </div>
              {form.images.length > 1 && (
                <button type="button" aria-label={`Remove image ${i + 1}`}
                  onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-xs mt-3 shrink-0">Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set("images", [...form.images, ""])} className="text-brand text-xs mt-1">+ Add another image</button>
        </div>
        <label className="text-sm">Category
          <select required className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select...</option>
            {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select></label>
        <label className="text-sm">Sub-category
          <select className={input} value={form.subCategory} onChange={(e) => set("subCategory", e.target.value)}>
            <option value="">None</option>
            {subs.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select></label>
        <label className="text-sm">Base Price (Rs.)<input required type="number" className={input} value={form.basePrice} onChange={(e) => set("basePrice", e.target.value)} /></label>
        <label className="text-sm">Sale Price (Rs., 0 = none)<input type="number" className={input} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} /></label>
        <label className="text-sm">Stock Quantity<input required type="number" className={input} value={form.stock} onChange={(e) => set("stock", e.target.value)} /></label>
        <label className="text-sm">SKU Code<input required className={input} value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} /></label>
        <label className="text-sm">Tags (comma separated)<input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} /></label>
        <label className="text-sm">Status
          <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["Active", "Draft", "Out of Stock", "Archived"].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.flashSale} onChange={(e) => set("flashSale", e.target.checked)} /> Include in Flash Sale</label>
        {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-2">
          <button className="bg-brand text-white rounded px-6 py-2 text-sm font-medium">{id ? "Save Changes" : "Create Product"}</button>
          <button type="button" onClick={() => navigate("/admin/products")} className="border rounded px-5 py-2 text-sm">Cancel</button>
        </div>
        <p className="text-[11px] text-gray-400 sm:col-span-2">Variants (size/color with price deltas) can be sent via the API (POST /api/products, field: variants) — see README.</p>
      </form>
    </div>
  );
}
