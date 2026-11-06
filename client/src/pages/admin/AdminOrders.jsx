import { useEffect, useState } from "react";
import { X, ShieldCheck, ShieldX, Printer, Truck } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { rs } from "../../utils/format.js";
import { customerContact } from "../../utils/customerContact.js";
import { printBlock } from "../../utils/print.js";
import OrderInvoice from "../../components/OrderInvoice.jsx";

const FILTERS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
// Staff pipeline (Daraz-style): Pending → Confirmed → Packed → Shipped →
// Delivered. "Processing" is not a step — it is the tab that groups
// Confirmed + Packed. Cancelled needs a reason (see ADMIN_CANCEL_REASONS).
const STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"];
const COURIERS = ["TCS", "Leopards", "Trax", "PostEx", "Other"];
const ADMIN_CANCEL_REASONS = [
  "Out of stock", "Customer requested", "Payment not verified",
  "Customer unreachable", "Duplicate order", "Suspected fake order", "Other",
];
const statusBadge = {
  Pending: "bg-amber-100 text-amber-700", Confirmed: "bg-sky-100 text-sky-700",
  Packed: "bg-indigo-100 text-indigo-700", Shipped: "bg-violet-100 text-violet-700",
  Delivered: "bg-green-100 text-green-700", Cancelled: "bg-red-100 text-red-600",
  Returned: "bg-orange-100 text-orange-700",
};

const verifyBadge = {
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  not_applicable: "bg-gray-100 text-gray-500",
};

export default function AdminOrders() {
  // Payment verify/reject is gated by the "payments" permission (the
  // server enforces the same on PATCH .../payment-verification), NOT by
  // role: a Vice-Admin granted "payments" can verify, one with only
  // "orders" cannot.
  const { hasPermission } = useAuth();
  const canVerifyPayments = hasPermission("payments");
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");
  // Fulfillment-form state for the open order: the step staff picked, the
  // courier/tracking for dispatch, and the cancel reason flow.
  const [formStatus, setFormStatus] = useState("");
  const [courier, setCourier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  const load = () => {
    const params = {};
    if (filter !== "All") params.status = filter;
    if (search) params.search = search;
    api.get("/admin/orders", { params }).then((r) => {
      setOrders(r.data.orders);
      if (r.data.counts) setCounts(r.data.counts);
    }).catch(() => setOrders([]));
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [filter, search]);

  const openOrder = (o) => {
    setSelected(o);
    setFormStatus(o.status);
    setCourier(o.courier || "");
    setTrackingId(o.trackingId || "");
    setCancelReason("");
    setCancelNote("");
    setShowLabel(false);
    setMsg("");
  };

  const applyOrder = (order) => {
    setOrders((prev) => prev.map((o) => o._id === order._id ? order : o));
    setSelected(order);
    setFormStatus(order.status);
    setCourier(order.courier || "");
    setTrackingId(order.trackingId || "");
  };

  const saveFulfillment = async () => {
    if (!selected) return;
    setMsg(""); setSaving(true);
    try {
      const body = { status: formStatus };
      if (["Shipped", "Delivered"].includes(formStatus) || courier || trackingId) {
        body.courier = courier; body.trackingId = trackingId;
      }
      if (formStatus === "Cancelled") { body.reason = cancelReason; body.note = cancelNote; }
      const changed = formStatus !== selected.status || courier !== (selected.courier || "") || trackingId !== (selected.trackingId || "");
      if (!changed) { setMsg("Nothing to change."); setSaving(false); return; }
      const r = await api.patch(`/admin/orders/${selected._id}/status`, body);
      applyOrder(r.data.order);
      setMsg("Order updated.");
      load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not update the order"); }
    finally { setSaving(false); }
  };

  const printLabel = () => printBlock("label");
  const printInvoice = () => printBlock("invoice");

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
            className={`text-sm px-3 py-1.5 rounded-full ${filter === f ? "bg-brand text-white" : "bg-white"}`}>
            {f}{counts[f] != null ? ` (${counts[f]})` : ""}</button>
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
              <tr key={o._id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openOrder(o)}>
                <td className="p-3 font-medium">{o.orderId}</td>
                <td>{o.user?.name || o.address?.fullName}
                  {(() => { const c = customerContact(o.user, o.address); return c.phone ? <><br /><span className="text-xs text-gray-400">{c.phone}</span></> : null; })()}
                </td>
                <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td>{rs(o.total)}</td>
                <td>{o.paymentMethod}
                  {["JazzCash", "Easypaisa"].includes(o.paymentMethod) && (
                    <span className={`block w-max text-[10px] rounded-full px-2 py-0.5 mt-0.5 ${verifyBadge[o.paymentVerificationStatus]}`}>
                      {o.paymentVerificationStatus.replace("_", " ")}
                    </span>)}
                </td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[o.status] || "bg-gray-100 text-gray-600"}`}>{o.status}</span>
                  {(o.courier || o.trackingId) && <span className="block text-[10px] text-gray-400 mt-0.5">{o.courier}{o.trackingId ? ` · ${o.trackingId}` : ""}</span>}
                </td>
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
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <p className="font-bold">{selected.orderId}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowLabel((v) => !v)} className="flex items-center gap-1 text-xs border rounded-full px-3 py-1.5 hover:bg-gray-50">
                  <Printer size={14} /> {showLabel ? "Hide label" : "Print shipping label"}
                </button>
                <button onClick={printInvoice} className="flex items-center gap-1 text-xs border rounded-full px-3 py-1.5 hover:bg-gray-50">
                  <Printer size={14} /> Print Invoice
                </button>
                <button onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button>
              </div>
            </div>
            <div className="p-4 text-sm space-y-4">
              {selected.status === "Cancelled" && (
                <p className="bg-red-50 border border-red-200 text-red-700 rounded p-3">
                  <b>Cancelled{selected.cancelledBy ? ` by ${selected.cancelledBy}` : ""}</b>
                  {selected.cancelReason ? ` — ${selected.cancelReason}` : ""}
                  {selected.cancelNote ? <span className="block text-xs mt-0.5">Note: {selected.cancelNote}</span> : null}
                </p>
              )}
              {showLabel && (
                <section className="border-2 border-dashed border-gray-300 rounded p-4">
                  {/* The .print-label-block below is what actually prints. */}
                  <div className="print-area print-label-block text-black">
                    <div className="flex items-start justify-between border-b-2 border-black pb-2">
                      <div>
                        <p className="text-2xl font-black tracking-[0.2em]">MALAC</p>
                        <p className="text-[10px] uppercase tracking-widest">M.A Luxury Apparel Collection</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>{selected.deliveryMethod} delivery</p>
                        <p>{new Date(selected.createdAt).toLocaleDateString("en-PK")}</p>
                      </div>
                    </div>
                    <p className="text-[11px] uppercase tracking-widest mt-3">Order ID</p>
                    <p className="text-3xl font-black font-mono">{selected.orderId}</p>
                    {(selected.courier || selected.trackingId) && (
                      <p className="mt-1 text-sm">Courier: <b>{selected.courier || "-"}</b> · Tracking: <b className="font-mono">{selected.trackingId || "-"}</b></p>
                    )}
                    <div className="mt-3 border-t pt-3">
                      <p className="text-[11px] uppercase tracking-widest">Deliver to</p>
                      <p className="text-lg font-bold">{selected.address?.fullName || selected.user?.name}</p>
                      <p className="font-mono">{customerContact(selected.user, selected.address).phone}</p>
                      <p>{selected.address?.street}, {selected.address?.area}</p>
                      <p>{selected.address?.city}{selected.address?.province ? `, ${selected.address.province}` : ""} {selected.address?.postalCode || ""}</p>
                    </div>
                    {selected.paymentMethod === "COD" && selected.paymentStatus !== "Paid" ? (
                      <p className="mt-3 border-2 border-black rounded p-2 text-center text-lg font-black">
                        COLLECT CASH: {rs(selected.total)}
                      </p>
                    ) : (
                      <p className="mt-3 border-2 border-black rounded p-2 text-center text-lg font-black">
                        PAID — {selected.paymentMethod}{(selected.paymentMethod === "COD" || selected.paymentStatus === "Paid") ? "" : " (verify transfer)"}
                      </p>
                    )}
                    <div className="mt-4 border-t pt-3">
                      <p className="text-[11px] uppercase tracking-widest mb-1">Packing slip — check each item</p>
                      {selected.items.map((i) => (
                        <p key={i._id} className="flex gap-2 py-1 border-b border-dotted last:border-0">
                          <span className="inline-block w-4 h-4 border border-black rounded-sm shrink-0 mt-0.5" />
                          <span className="flex-1">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""}{i.sku ? ` · ${i.sku}` : ""}</span>
                          <b>× {i.qty}</b>
                        </p>
                      ))}
                      <p className="flex justify-between pt-2 font-bold"><span>Total ({selected.items.reduce((s, i) => s + i.qty, 0)} items)</span><span>{rs(selected.total)}</span></p>
                    </div>
                  </div>
                  <button onClick={printLabel} className="mt-3 flex items-center gap-1 bg-brand text-white rounded px-4 py-2 text-xs">
                    <Printer size={14} /> Print label + packing slip
                  </button>
                </section>
              )}
              <section>
                <p className="font-semibold mb-1">Customer & Shipping</p>
                <p>{selected.user?.name || selected.address?.fullName}</p>
                <p className="text-gray-500">{customerContact(selected.user, selected.address).line}</p>
                <p className="text-gray-500">{selected.address?.street}, {selected.address?.area}, {selected.address?.city}{selected.address?.province ? `, ${selected.address.province}` : ""} {selected.address?.postalCode || ""}</p>
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
                    {canVerifyPayments ? (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => verifyPayment("verified")} className="flex items-center gap-1 bg-green-600 text-white rounded px-3 py-1.5 text-xs">
                          <ShieldCheck size={14} /> Verify Payment</button>
                        <button onClick={() => verifyPayment("rejected")} className="flex items-center gap-1 bg-red-500 text-white rounded px-3 py-1.5 text-xs">
                          <ShieldX size={14} /> Reject</button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">Payment verification needs the "Payments verification" permission — ask the Super Admin to grant it in Roles &amp; Users. You can still update fulfillment status below.</p>
                    )}
                  </div>
                )}
                {(selected.courier || selected.trackingId) && (
                  <p className="mt-2 flex items-center gap-1 text-gray-600">
                    <Truck size={14} /> Courier: <b>{selected.courier || "-"}</b> · Tracking: <b className="font-mono">{selected.trackingId || "-"}</b>
                  </p>
                )}
              </section>
              <section>
                <p className="font-semibold mb-1">Fulfillment Status</p>
                {/* Daraz-style step buttons */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["Confirmed", "Packed", "Shipped", "Delivered"].map((s) => (
                    <button key={s} onClick={() => setFormStatus(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border ${formStatus === s ? "bg-brand text-white border-transparent" : selected.status === s ? "bg-gray-100 font-semibold" : "bg-white"}`}>
                      {s}{selected.status === s ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                <label className="block text-xs text-gray-500 mb-1">Move to status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="border rounded px-3 py-2 w-full">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>

                {formStatus === "Shipped" && (
                  <div className="mt-3 border rounded p-3 bg-violet-50 space-y-2">
                    <p className="flex items-center gap-1 font-medium"><Truck size={14} /> Dispatch details</p>
                    <label className="block text-xs text-gray-500">Courier
                      <select value={courier} onChange={(e) => setCourier(e.target.value)} className="border rounded px-3 py-2 w-full mt-0.5 bg-white">
                        <option value="">Select courier…</option>
                        {COURIERS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs text-gray-500">Tracking ID
                      <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="e.g. TCS tracking number"
                        className="border rounded px-3 py-2 w-full mt-0.5 bg-white font-mono" />
                    </label>
                    <p className="text-[11px] text-gray-500">The customer sees the courier + tracking ID on the Track Order page once shipped.</p>
                  </div>
                )}
                {["Shipped", "Delivered", "Returned"].includes(selected.status) && formStatus !== "Shipped" && (selected.courier || selected.trackingId) && (
                  <div className="mt-3 border rounded p-3 bg-gray-50 space-y-2">
                    <p className="flex items-center gap-1 font-medium"><Truck size={14} /> Courier: {selected.courier || "-"} · <span className="font-mono">{selected.trackingId || "-"}</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={courier} onChange={(e) => setCourier(e.target.value)} className="border rounded px-2 py-1.5 bg-white text-xs">
                        <option value="">Courier…</option>
                        {COURIERS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="Tracking ID"
                        className="border rounded px-2 py-1.5 bg-white text-xs font-mono" />
                    </div>
                    <p className="text-[11px] text-gray-500">Edit dispatch details, then Save — the status stays {formStatus}.</p>
                  </div>
                )}

                {formStatus === "Cancelled" && selected.status !== "Cancelled" && (
                  <div className="mt-3 border border-red-200 rounded p-3 bg-red-50 space-y-2">
                    <p className="font-medium text-red-700">Cancellation reason (required)</p>
                    <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="border rounded px-3 py-2 w-full bg-white">
                      <option value="">Select a reason…</option>
                      {ADMIN_CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                    <input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Note (optional)"
                      className="border rounded px-3 py-2 w-full bg-white" />
                  </div>
                )}
                {formStatus === "Returned" && selected.status !== "Returned" && (
                  <p className="mt-2 text-[11px] text-gray-500">Marking Returned puts the items back into stock.</p>
                )}

                <button onClick={saveFulfillment} disabled={saving}
                  className="mt-3 bg-brand text-white rounded px-5 py-2 text-sm disabled:opacity-50 w-full">
                  {saving ? "Saving…" : formStatus === "Cancelled" ? "Cancel this order" : "Save fulfillment"}
                </button>
                <ol className="mt-3 space-y-1 text-xs text-gray-500">
                  {(selected.statusHistory || []).map((h, i) => (
                    <li key={i}>• {h.status} — {new Date(h.at).toLocaleString("en-PK")} {h.by ? `by ${h.by}` : ""} {h.note ? `(${h.note})` : ""}</li>
                  ))}
                </ol>
              </section>
              {/* Priced invoice print block — display:none on screen (see
                  index.css); prints only when body has printing-invoice. */}
              <OrderInvoice order={selected} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
