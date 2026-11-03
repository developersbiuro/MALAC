import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ImageUploadField from "../../components/ImageUploadField.jsx";

// Mirrors server/src/utils/slugify.js — needed when sending sub-categories
// as objects on update (the update endpoint does not convert strings).
const slugify = (t = "") => String(t).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const blankForm = { name: "", icon: "ShoppingBag", image: "", subCategories: "" };

export default function AdminCategories() {
  const { isSuperAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {});
  useEffect(load, []);

  const resetForm = () => { setEditingId(null); setForm(blankForm); };

  const startEdit = (c) => {
    setError("");
    setEditingId(c._id);
    setForm({
      name: c.name, icon: c.icon || "ShoppingBag", image: c.image || "",
      subCategories: (c.subCategories || []).map((s) => s.name).join(", "),
    });
  };

  const submit = async (e) => {
    e.preventDefault(); setError("");
    const names = form.subCategories.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      if (editingId) {
        // Update: the endpoint stores req.body as-is, so sub-categories go
        // as objects (existing ones keep their _id/slug, new ones get a
        // slug here); `image` is always sent so it can also be cleared.
        const existing = categories.find((c) => c._id === editingId)?.subCategories || [];
        const subCategories = names.map((name) => {
          const found = existing.find((s) => s.name.toLowerCase() === name.toLowerCase());
          return found ? { ...found } : { name, slug: slugify(name) };
        });
        await api.put(`/categories/${editingId}`, {
          name: form.name, icon: form.icon, image: form.image || "", subCategories,
        });
      } else {
        await api.post("/categories", {
          name: form.name, icon: form.icon,
          ...(form.image ? { image: form.image } : {}),
          subCategories: names,
        });
      }
      resetForm(); load();
    } catch (err) { setError(err.response?.data?.message || "Could not save category"); }
  };
  const remove = async (id) => {
    await api.delete(`/categories/${id}`);
    if (id === editingId) resetForm();
    load();
  };
  const input = "border rounded px-3 py-2 text-sm w-full";

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">Category Manager</h1>
      <form onSubmit={submit} className="bg-white rounded-md p-4 mt-3 grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Name<input required className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm">Lucide icon name<input className={input} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
        <label className="text-sm">Sub-categories (comma separated)<input className={input} value={form.subCategories} onChange={(e) => setForm({ ...form, subCategories: e.target.value })} /></label>
        <div className="text-sm sm:col-span-3">
          <ImageUploadField label="Category image" value={form.image}
            onChange={(v) => setForm({ ...form, image: v })} />
        </div>
        {error && <p className="text-red-500 text-sm sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3 flex gap-2">
          <button className="bg-brand text-white rounded px-5 py-2 text-sm w-max">{editingId ? "Save Changes" : "Add Category"}</button>
          {editingId && <button type="button" onClick={resetForm} className="border rounded px-5 py-2 text-sm">Cancel edit</button>}
        </div>
      </form>
      <div className="bg-white rounded-md mt-3 divide-y">
        {categories.map((c, i) => (
          <div key={c._id} className="p-3 flex items-center gap-3 text-sm">
            <span className="text-gray-300 font-mono">{i + 1}</span>
            {c.image && <img src={c.image} alt="" className="h-10 w-10 rounded border object-cover shrink-0 bg-gray-50" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium break-words">{c.name} <span className="text-gray-400 text-xs">({c.icon})</span></p>
              <p className="text-xs text-gray-400 break-words">{(c.subCategories || []).map((s) => s.name).join(" · ") || "No sub-categories"}</p>
            </div>
            <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-brand p-1" aria-label="Edit category"><Pencil size={16} /></button>
            {isSuperAdmin && <button onClick={() => remove(c._id)} className="text-red-400 p-1" aria-label="Delete category"><Trash2 size={16} /></button>}
          </div>
        ))}
        {categories.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No categories yet.</p>}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Order in the list follows the category sortOrder (set via API). Category images can be pasted as a URL or uploaded from your device. Deleting a category is Super Admin only.</p>
    </div>
  );
}
