import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch, ArrowLeft, CheckCircle2, Circle, Truck } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";

// Public order tracking (no login): the buyer enters ONLY the order ID
// from their confirmation — one field (Abdullah, 2026-11-07). The server
// (POST /api/orders/track) returns a limited view of the order.
const FLOW = ["Pending", "Processing", "Shipped", "Delivered"];
const badge = {
  Pending: "bg-amber-100 text-amber-700", Processing: "bg-sky-100 text-sky-700",
  Shipped: "bg-violet-100 text-violet-700", Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600", Returned: "bg-orange-100 text-orange-700",
};
const inputCls = "w-full border border-cream-line rounded-full px-4 py-2.5 text-sm bg-white outline-none focus:border-lux-amber";

export default function TrackOrder() {
  useSeo({
    title: "Track Your Order — MALAC",
    description: "Track your MALAC order with just your order ID — see live delivery status, items and totals.",
  });
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("orderId") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  const track = useCallback(async (id) => {
    if (!id.trim()) { setError("Enter your order ID."); return; }
    setLoading(true); setError(""); setOrder(null);
    try {
      const r = await api.post("/orders/track", { orderId: id.trim() });
      setOrder(r.data.order);
    } catch (e) {
      setError(e.response?.data?.message || "We could not find that order. Please check the order ID and try again.");
    } finally { setLoading(false); }
  }, []);

  // Arriving from the homepage band (or a shared link) with the order ID
  // in the query string runs the lookup straight away.
  useEffect(() => {
    if (autoRan.current) return;
    const id = params.get("orderId");
    if (id) { autoRan.current = true; track(id); }
  }, [params, track]);

  const history = order?.statusHistory?.length
    ? order.statusHistory
    : order ? [{ status: order.status, at: order.createdAt }] : [];
  const flowIndex = order ? FLOW.indexOf(order.status) : -1;

  return (
    <main className="max-w-4xl mx-auto px-4 pt-6 pb-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-lux-burnt font-medium hover:underline">
        <ArrowLeft size={16} /> Back to Store
      </Link>
      <p className="eyebrow mt-6">Order Tracking</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1.5">Track Your Order</h1>
      <p className="text-sm text-gray-500 leading-relaxed mt-3">
        Enter the order ID from your confirmation (for example MLC-XXXXXX-1234). No sign-in
        and no phone number needed.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); track(orderId); }}
        className="bg-white border border-cream-line rounded-2xl shadow-sm mt-6 p-4 sm:p-5 grid sm:grid-cols-[1fr_auto] gap-3"
      >
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID (MLC-...)" className={inputCls} />
        <button disabled={loading} className="btn-lux px-6 py-2.5 text-sm">
          <PackageSearch size={16} /> {loading ? "Tracking..." : "Track Order"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {order && (
        <article className="bg-white border border-cream-line rounded-2xl shadow-sm mt-6 p-4 sm:p-6 fade-up">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <p className="font-bold text-lg">{order.orderId}</p>
              <p className="text-xs text-gray-400">Placed {new Date(order.createdAt).toLocaleString("en-PK")}</p>
              {order.estimatedDelivery && order.status !== "Delivered" && order.status !== "Cancelled" && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Truck size={13} className="text-[#059669]" />
                  Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              )}
            </div>
            <span className={`text-xs font-medium rounded-full px-3 py-1 ${badge[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
          </div>

          {/* Status timeline */}
          {order.status === "Cancelled" ? (
            <p className="mt-5 text-sm text-red-500 font-medium">
              This order was cancelled.{order.cancelReason ? ` Reason: ${order.cancelReason}` : ""}
            </p>
          ) : order.status === "Returned" ? (
            <p className="mt-5 text-sm text-orange-600 font-medium">This order was returned to us (delivery could not be completed).</p>
          ) : (
            <ol className="mt-6 grid grid-cols-4 gap-1">
              {FLOW.map((s, i) => {
                const entry = history.find((h) => h.status === s);
                const done = flowIndex >= i;
                return (
                  <li key={s} className="text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border ${done ? "bg-lux-gradient text-white border-transparent" : "bg-white text-gray-300 border-cream-line"}`}>
                      {done ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                    </span>
                    <span className={`block text-[11px] mt-1.5 font-medium ${done ? "text-lux-ink" : "text-gray-400"}`}>{s}</span>
                    <span className="block text-[10px] text-gray-400">
                      {entry ? new Date(entry.at).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {history.length > 0 && (
            <ul className="mt-4 border-t border-cream-line pt-3 space-y-1 text-xs text-gray-500">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="shrink-0">{h.status}</span>
                  <span className="text-right">{new Date(h.at).toLocaleString("en-PK")}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Items + totals */}
          <div className="mt-5 border-t border-cream-line pt-4 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3 items-center text-sm">
                {item.image && <img src={item.image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />}
                <span className="flex-1 min-w-0 line-clamp-1">{item.title}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.qty}</span>
                <span className="shrink-0">{rs(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-4 border-t border-cream-line pt-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-500"><dt>Subtotal</dt><dd>{rs(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-gray-500"><dt>Discount</dt><dd>− {rs(order.discount)}</dd></div>}
            <div className="flex justify-between text-gray-500"><dt>Shipping</dt><dd>{order.shipping === 0 ? "FREE" : rs(order.shipping)}</dd></div>
            <div className="flex justify-between font-bold text-base pt-1"><dt>Total</dt><dd className="text-lux-burnt">{rs(order.total)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-gray-500 border-t border-cream-line pt-3">
            Payment: <b>{order.paymentMethod}</b> · {order.paymentStatus}
            {["JazzCash", "Easypaisa"].includes(order.paymentMethod) && (
              <> · Transfer {order.paymentVerificationStatus === "pending_verification" ? "pending verification"
                : order.paymentVerificationStatus === "verified" ? "verified"
                : order.paymentVerificationStatus === "rejected" ? "rejected — please contact us on WhatsApp" : ""}</>
            )}
            {" "}· {order.deliveryMethod} delivery
            {(order.courier || order.trackingId) && ["Shipped", "Delivered"].includes(order.status) && (
              <> · Courier: <b>{order.courier || "-"}</b>{order.trackingId ? <> · Tracking: <b className="font-mono">{order.trackingId}</b></> : ""}</>
            )}
          </p>
        </article>
      )}
    </main>
  );
}
