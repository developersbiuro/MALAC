import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch, ArrowLeft, CheckCircle2, Circle, Truck } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";

// Order tracking for signed-in customers (guest lock, 2026-11-09): ONE field — the buyer types either
// the order ID from their confirmation OR the phone number used on the
// order (Abdullah, 2026-11-07). The server (POST /api/orders/track)
// returns a limited view of the matching order(s).
const FLOW = ["Pending", "Processing", "Shipped", "Delivered"];
const badge = {
  Pending: "bg-amber-100 text-amber-700", Processing: "bg-sky-100 text-sky-700",
  Shipped: "bg-violet-100 text-violet-700", Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600", Returned: "bg-orange-100 text-orange-700",
};
const inputCls = "w-full border border-cream-line rounded-full px-4 py-2.5 text-sm bg-white outline-none focus:border-lux-amber";
// Customers see "Processing" for the stored Confirmed/Packed statuses
// (same rule as My Orders and the chatbot).
const customerStatus = (s) => (s === "Confirmed" || s === "Packed" ? "Processing" : s);

export default function TrackOrder() {
  useSeo({
    title: "Track Your Order — MALAC",
    description: "Track your MALAC order with your order ID or phone number — see live delivery status, items and totals.",
  });
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("orderId") || params.get("phone") || "");
  const [order, setOrder] = useState(null);
  const [matches, setMatches] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  // Signed-in customers see their own recent orders right on this page
  // (Abdullah, 2026-11-09: "recent order show kro"), with a View All
  // Orders link to the full My Orders page.
  useEffect(() => {
    if (!localStorage.getItem("malac_token")) return;
    api.get("/orders/my")
      .then((r) => setMyOrders((r.data.orders || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  // One field, two ways in (Abdullah, 2026-11-07): type the order ID
  // (MLC-…) OR the phone number used on the order — either finds it.
  const track = useCallback(async (raw) => {
    const value = String(raw || "").trim();
    if (!value) { setError("Enter your order ID or phone number."); return; }
    const isId = /^mlc/i.test(value);
    const digits = value.replace(/\D/g, "").slice(-10);
    if (!isId && digits.length < 10) { setError("That does not look like an order ID (MLC-…) or a full phone number."); return; }
    setLoading(true); setError(""); setOrder(null); setMatches([]);
    try {
      const r = await api.post("/orders/track", isId ? { orderId: value } : { phone: value });
      if (r.data.order) setOrder(r.data.order);
      else {
        // Phone lookup: keep the WHOLE recent list on screen (newest
        // first — the server sorts it) and open the newest order's
        // detail under it. The list no longer disappears when one
        // order is picked (Abdullah, 2026-11-09: "view all order add
        // kr do, recent order show kro").
        const list = r.data.orders || [];
        setMatches(list);
        if (list.length) setOrder(list[0]);
      }
    } catch (e) {
      setError(e.response?.data?.message || "We could not find that order. Please check and try again.");
    } finally { setLoading(false); }
  }, []);

  // Arriving from the homepage band (or a shared link) runs the lookup
  // straight away.
  useEffect(() => {
    if (autoRan.current) return;
    const v = params.get("orderId") || params.get("phone");
    if (v) { autoRan.current = true; track(v); }
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
        Apna <b>order ID</b> (jaise MLC-ABC123) <b>ya</b> wo <b>phone number</b> likhein jo order
        par diya tha — dono me se jo bhi likhein, order mil jayega. Ye page sirf signed-in
        customers ke liye hai, taake aap ke orders koi aur na dekh sake.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); track(query); }}
        className="bg-white border border-cream-line rounded-2xl shadow-sm mt-6 p-4 sm:p-5 grid sm:grid-cols-[1fr_auto] gap-3"
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order ID (MLC-...) ya phone number" className={inputCls} />
        <button disabled={loading} className="btn-lux px-6 py-2.5 text-sm">
          <PackageSearch size={16} /> {loading ? "Tracking..." : "Track Order"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {myOrders.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Aap ke Recent Orders</p>
            <Link to="/orders" className="text-xs font-semibold text-lux-burnt underline underline-offset-2 shrink-0">View All Orders</Link>
          </div>
          {myOrders.map((o) => {
            const st = customerStatus(o.status);
            return (
              <button key={o.orderId} onClick={() => { setQuery(o.orderId); track(o.orderId); }}
                className="w-full text-left bg-white border border-cream-line rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="font-bold block">{o.orderId}</span>
                  <span className="text-xs text-gray-400 block truncate">
                    {(o.items || []).map((i) => `${i.title} × ${i.qty}`).join(", ")} · {rs(o.total)} · {new Date(o.createdAt).toLocaleDateString("en-PK")}
                  </span>
                </span>
                <span className={`text-xs font-medium rounded-full px-3 py-1 shrink-0 ${badge[st] || "bg-gray-100 text-gray-600"}`}>{st}</span>
              </button>
            );
          })}
        </div>
      )}

      {matches.length > 0 && (
        <div id="recent-orders" className="mt-6 space-y-2 scroll-mt-4">
          <p className="text-sm text-gray-500">
            {matches.length > 1
              ? `Recent Orders — is number par ${matches.length} orders mile (sab se naya pehle). Kisi par bhi click karke us ki tafseel dekhein:`
              : "Is number ka recent order:"}
          </p>
          {matches.map((o) => (
            <button key={o.orderId} onClick={() => setOrder(o)}
              className={`w-full text-left bg-white border rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 ${order?.orderId === o.orderId ? "border-lux-amber ring-1 ring-lux-amber" : "border-cream-line"}`}>
              <span className="flex-1 min-w-0">
                <span className="font-bold block">{o.orderId}</span>
                <span className="text-xs text-gray-400 block truncate">
                  {o.items.map((i) => `${i.title} × ${i.qty}`).join(", ")} · {rs(o.total)} · {new Date(o.createdAt).toLocaleDateString("en-PK")}
                </span>
              </span>
              <span className={`text-xs font-medium rounded-full px-3 py-1 shrink-0 ${badge[o.status] || "bg-gray-100 text-gray-600"}`}>{o.status}</span>
            </button>
          ))}
        </div>
      )}

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
          {matches.length > 1 && (
            <button type="button"
              onClick={() => document.getElementById("recent-orders")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-3 text-xs font-semibold border border-cream-line rounded-full px-4 py-1.5 hover:bg-cream-soft">
              View All Orders ({matches.length})
            </button>
          )}

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
