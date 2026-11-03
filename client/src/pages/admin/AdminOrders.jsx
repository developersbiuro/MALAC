import { useEffect, useState } from "react";
import { X, ShieldCheck, ShieldX } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { rs } from "../../utils/format.js";

const FILTERS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const verifyBadge = {
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  not_applicable: "bg-gray-100 text-gray-500",
};

export default function AdminOrders() {
  const { isSuperAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    const params = {};
    if (filter !== "All") params.status = filter;
    if (search) params.search = search;
    api.get("/admin/orders", { params }).then((r) => setOrders(r.data.orders)).catch(() => setOrders([]));
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [filter, search]);

  const setStatus = async (id, status) => {
    const r = await api.patch(`/admin/orders/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => o._id === id ? r.data.order : o));
    if (selected?._id === id) setSelected(r.data.order);
  };

  const verifyPayment = async (decision) => {
    if (!selected) return;
    setMsg("");
    try {
      const note = window.prompt(`Note for payment ${decision} (optional):`) || "";
      const r = await api.patch(`/admin/orders/${selected._id}/payment-verification`, { decision, note });
      setSelected(r.data.order);
      setOrders((prev) => prev.map((o) => o._id === selected._id ? r.data.order : o));
      setMsg(`Payment ${decision}.`);
    } catch (e) { setMsg(e.response?.data?.message || "Could not update payment verification"); }
  };

  const isManual = selected && ["JazzCash", "Easypaisa"].includes(selected.paymentMethod);

  return (
    <div>
      <h1 className="text-xl font-bold">Order Fulfillment Center</h1>
      <div className="flex flex-wrap gap-2 mt-3">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full ${filter === f ? "bg-brand text-white" : "bg-white"}`}>{f}</button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order ID"
          className="border rounded px-3 py-2 sm:py-1.5 text-sm sm:ml-auto bg-white flex-1 sm:flex-none min-w-[150px]" />
      </div>
      {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}

      <div className="bg-white rounded-md mt-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead><tr className="text-left text-gray-400 border-b">
            <th className="p-3">Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(o)}>
                <td className="p-3 font-medium">{o.orderId}</td>
                <td>{o.user?.name || o.address?.fullName}<br /><span className="text-xs text-gray-400">{o.user?.phone || o.address?.phone}</span></td>
                <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td>{rs(o.total)}</td>
                <td>{o.paymentMethod}
                  {["JazzCash", "Easypaisa"].includes(o.paymentMethod) && (
                    <span className={`block w-max text-[10px] rounded-full px-2 py-0.5 mt-0.5 ${verifyBadge[o.paymentVerificationStatus]}`}>
                      {o.paymentVerificationStatus.replace("_", " ")}
                    </span>)}
                </td>
                <td><span className="bg-gray-100 rounded-full px-2 py-0.5 text-xs">{o.status}</span></td>
                <td className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString("en-PK")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No orders found.</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 h-full w-[420px] max-w-[94vw] bg-white shadow-xl overflow-y-auto fade-up">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <p className="font-bold">{selected.orderId}</p>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="p-4 text-sm space-y-4">
              <section>
                <p className="font-semibold mb-1">Customer & Shipping</p>
                <p>{selected.user?.name || selected.address?.fullName}</p>
                <p className="text-gray-500">{selected.user?.email} · {selected.user?.phone || selected.address?.phone}</p>
                <p className="text-gray-500">{selected.address?.street}, {selected.address?.area}, {selected.address?.city} {selected.address?.postalCode || ""}</p>
                {selected.address?.lat != null && selected.address?.lng != null && (
                  <p>
                    <a
                      href={selected.address.mapsUrl || `https://www.google.com/maps?q=${selected.address.lat},${selected.address.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-brand font-medium hover:underline"
                    >
                      📍 Customer Location — View on Map
                    </a>
                  </p>
                )}
                <p className="text-gray-500">{selected.deliveryMethod} delivery
                  {selected.estimatedDelivery ? ` · expected ${new Date(selected.estimatedDelivery).toLocaleDateString("en-PK")}` : ""}</p>
              </section>
              <section>
                <p className="font-semibold mb-1">Items</p>
                {selected.items.map((i) => (
                  <div key={i._id} className="flex gap-2 py-1.5 border-b last:border-0">
                    {i.image && <img src={i.image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <span className="flex-1">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}
                      <span className="block text-xs text-gray-400">{i.sku}</span></span>
                    <span>{rs(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2"><span>Subtotal</span><span>{rs(selected.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount {selected.couponCode ? `(${selected.couponCode})` : ""}</span><span>-{rs(selected.discount)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{rs(selected.shipping)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1.5"><span>Total</span><span className="text-brand">{rs(selected.total)}</span></div>
              </section>
              <section>
                <p className="font-semibold mb-1">Payment</p>
                <p>Method: <b>{selected.paymentMethod}</b> · Status: {selected.paymentStatus}</p>
                {isManual && (
                  <div className="mt-2 border rounded p-3 bg-gray-50 space-y-1.5">
                    <p>Verification: <span className={`text-[11px] rounded-full px-2 py-0.5 ${verifyBadge[selected.paymentVerificationStatus]}`}>
                      {selected.paymentVerificationStatus.replace("_", " ")}</span></p>
                    <p>Transaction ID: <b className="font-mono">{selected.transactionId || "-"}</b></p>
                    <p>Sender account: <b>{selected.senderAccount || "-"}</b></p>
                    <p>Sender title: <b>{selected.senderTitle || "-"}</b></p>
                    {selected.paymentScreenshot ? (
                      <a href={selected.paymentScreenshot} target="_blank" rel="noreferrer">
                        <img src={selected.paymentScreenshot} alt="Customer payment screenshot" className="max-h-64 rounded border mt-1" />
                        <span className="text-xs text-sky-600">Open screenshot full size</span>
                      </a>
                    ) : <p className="text-red-500">No screenshot attached.</p>}
                    {selected.paymentVerificationNote && <p className="text-gray-500">Note: {selected.paymentVerificationNote}</p>}
                    {selected.paymentVerifiedBy && <p className="text-gray-400 text-xs">Last action by {selected.paymentVerifiedBy}</p>}
                    {isSuperAdmin ? (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => verifyPayment("verified")} className="flex items-center gap-1 bg-green-600 text-white rounded px-3 py-1.5 text-xs">
                          <ShieldCheck size={14} /> Verify Payment</button>
                        <button onClick={() => verifyPayment("rejected")} className="flex items-center gap-1 bg-red-500 text-white rounded px-3 py-1.5 text-xs">
                          <ShieldX size={14} /> Reject</button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">Payment verification is Super Admin only. Vice-Admins can update fulfillment status below.</p>
                    )}
                  </div>
                )}
              </section>
              <section>
                <p className="font-semibold mb-1">Fulfillment Status</p>
                <select value={selected.status} onChange={(e) => setStatus(selected._id, e.target.value)} className="border rounded px-3 py-2 w-full">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ol className="mt-3 space-y-1 text-xs text-gray-500">
                  {(selected.statusHistory || []).map((h, i) => (
                    <li key={i}>• {h.status} — {new Date(h.at).toLocaleString("en-PK")} {h.by ? `by ${h.by}` : ""} {h.note ? `(${h.note})` : ""}</li>
                  ))}
                </ol>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
