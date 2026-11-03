import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "../../api/client.js";
import { rs } from "../../utils/format.js";

// Super Admin only (menu + API are both guarded).
export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", type: "percentage", value: "", minSpend: 0, expiresAt: "", active: true });
  const [error, setError] = useState("");
  const load = () => api.get("/coupons").then((r) => setCoupons(r.data.coupons)).catch(() => {});
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.post("/coupons", { ...form, value: Number(form.value), minSpend: Number(form.minSpend) });
      setForm({ code: "", type: "percentage", value: "", minSpend: 0, expiresAt: "", active: true }); load();
    } catch (err) { setError(err.response?.data?.message || "Could not create coupon"); }
  };
  const toggle = async (c) => { await api.put(`/coupons/${c._id}`, { active: !c.active }); load(); };
  const remove = async (id) => { await api.delete(`/coupons/${id}`); load(); };
  const input = "border rounded px-3 py-2 text-sm w-full";

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold">Coupon Management</h1>
      <form onSubmit={create} className="bg-white rounded-md p-4 mt-3 grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Code<input required className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></label>
        <label className="text-sm">Type
          <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount (Rs.)</option>
          </select></label>
        <label className="text-sm">Value<input required type="number" className={input} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
        <label className="text-sm">Minimum spend (Rs.)<input type="number" className={input} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} /></label>
        <label className="text-sm">Expiry date<input required type="date" className={input} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
        <label className="flex items-end gap-2 text-sm pb-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        {error && <p className="text-red-500 text-sm sm:col-span-3">{error}</p>}
        <button className="bg-brand text-white rounded px-5 py-2 text-sm w-max">Create Coupon</button>
      </form>
      <div className="bg-white rounded-md mt-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead><tr className="text-left text-gray-400 border-b"><th className="p-3">Code</th><th>Discount</th><th>Min Spend</th><th>Used</th><th>Expires</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c._id} className="border-b last:border-0">
                <td className="p-3 font-mono font-semibold">{c.code}</td>
                <td>{c.type === "percentage" ? `${c.value}%` : rs(c.value)}</td>
                <td>{rs(c.minSpend)}</td>
                <td>{c.usedCount}</td>
                <td>{new Date(c.expiresAt).toLocaleDateString("en-PK")}</td>
                <td><button onClick={() => toggle(c)} className={`text-[11px] rounded-full px-2 py-0.5 ${c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{c.active ? "Active" : "Inactive"}</button></td>
                <td className="pr-3"><button onClick={() => remove(c._id)} className="text-red-400" aria-label="Delete coupon"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No coupons yet.</p>}
      </div>
    </div>
  );
}
