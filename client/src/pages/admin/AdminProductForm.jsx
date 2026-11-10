import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client.js";
import ImageUploadField from "../../components/ImageUploadField.jsx";
import { COLOR_PRESETS, colorHex } from "../../utils/colors.js";

const empty = {
  title: "", description: "", images: [""], category: "", subCategory: "",
  basePrice: "", salePrice: "", stock: "", sku: "", tags: "", status: "Active", flashSale: false,
  variants: [], unit: "Pc", unitQty: 1,
};

const SIZE_PRESETS = ["S", "M", "L", "XL", "2XL", "3XL"];
const UNIT_OPTIONS = ["Pc", "Pack", "Pair", "Dozen", "Set", "Box", "kg", "g", "mg", "L", "ml", "Bottle", "Jar", "Tube"];

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [customVal, setCustomVal] = useState({});

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    // The admin list is catalog-based; fetch all and pick this product.
    api.get("/products", { params: { limit: 100 } }).then((r) => {
      const p = r.data.products.find((x) => x._id === id);
      if (p) setForm({ ...empty, ...p, images: p.images?.length ? p.images : [""], tags: (p.tags || []).join(", "), variants: p.variants || [] });
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
      unit: form.unit || "Pc",
      unitQty: Number(form.unitQty || 1),
      variants: (form.variants || [])
        .filter((v) => v.name.trim() && v.value.trim())
        .map((v) => ({ name: v.name.trim(), value: v.value.trim(), priceDelta: Number(v.priceDelta || 0), stock: Number(v.stock || 0) })),
    };
    try {
      if (id) await api.put(`/products/${id}`, payload);
      else await api.post("/products", payload);
      navigate("/admin/products");
    } catch (err) { setError(err.response?.data?.message || "Could not save product"); }
  };

  const input = "border rounded px-3 py-2 text-sm w-full";
  const subs = categories.find((c) => c.name === form.category)?.subCategories || [];

  // ---- Variant groups (Size / Color / custom) ----
  // Stored shape stays the flat list the storefront and order service
  // already understand: [{ name, value, priceDelta, stock }]. The form
  // just groups rows by name so the admin manages "Size: S/M/L/XL"
  // instead of typing raw rows.
  const vlist = form.variants || [];
  const vgroups = [];
  vlist.forEach((v, i) => {
    let g = vgroups.find((x) => x.name === v.name);
    if (!g) { g = { name: v.name, items: [] }; vgroups.push(g); }
    g.items.push({ ...v, _i: i });
  });
  const updVar = (i, patch) => set("variants", vlist.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const delVar = (i) => set("variants", vlist.filter((_, j) => j !== i));
  const addVar = (name, value) => {
    const val = String(value || "").trim();
    if (!name || !val) return;
    if (vlist.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.value.toLowerCase() === val.toLowerCase())) return;
    set("variants", [...vlist, { name, value: val, priceDelta: 0, stock: Number(form.stock || 0) }]);
  };
  const addGroup = (name) => {
    if (vgroups.some((g) => g.name.toLowerCase() === name.toLowerCase())) return;
    set("variants", [...vlist, { name, value: "", priceDelta: 0, stock: Number(form.stock || 0) }]);
  };
  const renameGroup = (oldName, newName) => set("variants", vlist.map((x) => (x.name === oldName ? { ...x, name: newName } : x)));
  const delGroup = (name) => set("variants", vlist.filter((x) => x.name !== name));
  const isSize = (n) => /size/i.test(n || "");
  const isColor = (n) => /colou?r/i.test(n || "");
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
        <label className="text-sm">Unit Qty (kitne pieces / wazan / volume)<input type="number" min="0" step="any" className={input} value={form.unitQty} onChange={(e) => set("unitQty", e.target.value)} /></label>
        <label className="text-sm">Unit
          <select className={input} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
          </select></label>
        <label className="text-sm">Tags (comma separated)<input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} /></label>
        <label className="text-sm">Status
          <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["Active", "Draft", "Out of Stock", "Archived"].map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.flashSale} onChange={(e) => set("flashSale", e.target.checked)} /> Include in Flash Sale</label>
        <div className="sm:col-span-2 text-sm">Variants — jo product par lagu ho wahi group add karein (shirts ke liye Size, watch waghera ke liye Color). Har option ka apna stock aur price +/- hai; jis product ke variants nahi, wo aisay hi rehne dein.
          {vgroups.map((g) => {
            const gkey = g.items[0]?._i ?? g.name;
            return (
              <div key={gkey} className="border rounded-md p-2.5 mt-2 bg-gray-50/70">
                <div className="flex items-center gap-2 flex-wrap">
                  <input className="border rounded px-2 py-1.5 text-sm w-36 font-medium" value={g.name} placeholder="Group (Size / Color)"
                    onChange={(e) => renameGroup(g.name, e.target.value)} />
                  <span className="text-[11px] text-gray-400">{g.items.filter((x) => x.value).length} option(s)</span>
                  <button type="button" onClick={() => delGroup(g.name)} className="ml-auto text-red-400 hover:text-red-600 text-xs shrink-0">Remove group</button>
                </div>
                {isSize(g.name) && (
                  <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                    <span className="text-[11px] text-gray-400">Sizes:</span>
                    {SIZE_PRESETS.map((s) => (
                      <button type="button" key={s} onClick={() => addVar(g.name, s)} className="border rounded-full px-2.5 py-0.5 text-xs bg-white hover:border-brand">+ {s}</button>
                    ))}
                  </div>
                )}
                {isColor(g.name) && (
                  <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                    <span className="text-[11px] text-gray-400">Colors:</span>
                    {COLOR_PRESETS.map((c) => (
                      <button type="button" key={c.name} onClick={() => addVar(g.name, c.name)} className="border rounded-full pl-1 pr-2 py-0.5 text-xs bg-white hover:border-brand inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />+ {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {g.items.map((v) => (
                  <div key={v._i} className="mt-1.5 flex flex-wrap items-center gap-2">
                    {isColor(g.name) && colorHex(v.value) && <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorHex(v.value) }} />}
                    <input className="border rounded px-2 py-1.5 text-sm w-32" placeholder="Value (XL / Black)" value={v.value}
                      onChange={(e) => updVar(v._i, { value: e.target.value })} />
                    <input type="number" className="border rounded px-2 py-1.5 text-sm w-32" placeholder="Price +/- (Rs.)" value={v.priceDelta}
                      onChange={(e) => updVar(v._i, { priceDelta: e.target.value })} />
                    <input type="number" className="border rounded px-2 py-1.5 text-sm w-24" placeholder="Stock" value={v.stock}
                      onChange={(e) => updVar(v._i, { stock: e.target.value })} />
                    <button type="button" aria-label={`Remove ${v.value || "variant"}`}
                      onClick={() => delVar(v._i)}
                      className="text-red-400 hover:text-red-600 text-xs shrink-0">Remove</button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2 items-center">
                  <input className="border rounded px-2 py-1.5 text-sm w-44" placeholder={isColor(g.name) ? "Custom color…" : isSize(g.name) ? "Custom size…" : "Custom value…"}
                    value={customVal[gkey] || ""}
                    onChange={(e) => setCustomVal((s) => ({ ...s, [gkey]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVar(g.name, customVal[gkey]); setCustomVal((s) => ({ ...s, [gkey]: "" })); } }} />
                  <button type="button" className="text-brand text-xs" onClick={() => { addVar(g.name, customVal[gkey]); setCustomVal((s) => ({ ...s, [gkey]: "" })); }}>+ Add</button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button type="button" onClick={() => addGroup("Size")} className="border rounded-full px-3 py-1 text-xs hover:border-brand">+ Size group</button>
            <button type="button" onClick={() => addGroup("Color")} className="border rounded-full px-3 py-1 text-xs hover:border-brand">+ Color group</button>
            <button type="button" onClick={() => addGroup("Option")} className="border rounded-full px-3 py-1 text-xs hover:border-brand">+ Custom group</button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-2">
          <button className="bg-brand text-white rounded px-6 py-2 text-sm font-medium">{id ? "Save Changes" : "Create Product"}</button>
          <button type="button" onClick={() => navigate("/admin/products")} className="border rounded px-5 py-2 text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
