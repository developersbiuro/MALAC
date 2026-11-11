import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Settings2, Printer, Star } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";
import { isManualMethod } from "../utils/payments.js";
import { printBlock } from "../utils/print.js";
import OrderInvoice from "../components/OrderInvoice.jsx";
import { bucketByKey } from "../utils/orderBuckets.js";

const TABS = ["All", "Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"];
// Badges are keyed by the customer-facing label; Confirmed/Packed show
// as "Processing" (the server stores Confirmed/Packed — see customerStatus).
const badge = {
  Pending: "bg-amber-100 text-amber-700", Processing: "bg-sky-100 text-sky-700",
  Shipped: "bg-violet-100 text-violet-700", "Out for Delivery": "bg-cyan-100 text-cyan-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600", Returned: "bg-orange-100 text-orange-700",
};
const customerStatus = (s) => (s === "Confirmed" || s === "Packed" ? "Processing" : s === "OutForDelivery" ? "Out for Delivery" : s);
const CUSTOMER_CANCEL_REASONS = [
  "Changed my mind", "Ordered by mistake", "Found a better price elsewhere",
  "Delivery is taking too long", "Need to change address or items",
  "Payment issue", "Other",
];
const RETURN_REASONS = [
  "Damaged item received", "Defective / not working", "Wrong item delivered",
  "Wrong size or colour", "Missing parts or accessories", "Other",
];

export default function MyOrders() {
  useSeo({ title: "My Orders — MALAC", robots: "noindex" });
  const [searchParams] = useSearchParams();
  // Daraz-style bucket deep-link from the My Account hub
  // (/orders?bucket=toship …): one shared definition (orderBuckets.js)
  // filters the full list client-side.
  const bucket = bucketByKey(searchParams.get("bucket"));
  const [tab, setTab] = useState("All");
  const [orders, setOrders] = useState([]);
  const [reviewedByOrder, setReviewedByOrder] = useState({}); // orderId -> Set(productId)
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState("");
  // Inline cancel panel: which order is being cancelled + chosen reason.
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  // Return request panel (delivered orders): mirrors the cancel pattern.
  const [returningId, setReturningId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  // Invoice printing: the chosen order renders one hidden invoice block;
  // seq makes re-printing the same order re-trigger the effect.
  const [printState, setPrintState] = useState({ order: null, seq: 0 });
  const printInvoice = (o) => setPrintState((s) => ({ order: o, seq: s.seq + 1 }));
  useEffect(() => {
    if (!printState.order) return;
    const t = setTimeout(() => printBlock("invoice"), 80);
    return () => clearTimeout(t);
  }, [printState]);

  const load = () => {
    if (bucket) {
      api.get("/orders/my").then((r) => setOrders((r.data.orders || []).filter(bucket.test))).catch(() => setOrders([]));
      return;
    }
    const params = tab === "All" ? {} : { status: tab };
    api.get("/orders/my", { params }).then((r) => setOrders(r.data.orders)).catch(() => setOrders([]));
  };
  useEffect(load, [tab, bucket]);

  // Which delivered items have I already reviewed? (reviews are saved
  // with their order — drives the "Review dein / ✓ Reviewed" state.)
  useEffect(() => {
    api.get("/orders/my-reviews").then((r) => {
      const map = {};
      (r.data.reviews || []).forEach((rev) => {
        if (!rev.orderId) return;
        (map[rev.orderId] = map[rev.orderId] || new Set()).add(String(rev.product));
      });
      setReviewedByOrder(map);
    }).catch(() => {});
  }, []);

  // Support tickets the customer opened from the MALAC Assistant chat.
  useEffect(() => {
    api.get("/assistant/tickets/mine").then((r) => setTickets(r.data.tickets || [])).catch(() => setTickets([]));
  }, []);

  const openCancel = (orderId) => {
    setCancellingId(orderId); setCancelReason(""); setCancelNote(""); setMsg("");
  };

  const confirmCancel = async () => {
    if (!cancellingId || !cancelReason) return;
    setCancelBusy(true); setMsg("");
    try {
      await api.patch(`/orders/${cancellingId}/cancel`, { reason: cancelReason, note: cancelNote });
      setCancellingId(null);
      setMsg("Order cancelled."); load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not cancel this order"); }
    finally { setCancelBusy(false); }
  };

  const openReturn = (orderId) => {
    setReturningId(orderId); setReturnReason(""); setReturnNote(""); setMsg("");
  };

  const confirmReturn = async () => {
    if (!returningId || !returnReason) return;
    setReturnBusy(true); setMsg("");
    try {
      await api.post(`/orders/${returningId}/return-request`, { reason: returnReason, note: returnNote });
      setReturningId(null);
      setMsg("Return request sent — our team will contact you to arrange it."); load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not send the return request"); }
    finally { setReturnBusy(false); }
  };

  return (
    <main className="max-w-5xl mx-auto px-3 pt-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h1 className="font-bold text-xl">My Orders</h1>
        <Link to="/account/settings" className="btn-lux text-xs px-4 py-2">
          <Settings2 size={14} /> Profile Settings
        </Link>
      </div>
      {bucket ? (
        <p className="bg-white rounded-md px-3 py-2.5 text-sm flex items-center justify-between">
          <span>Showing: <b>{bucket.label}</b></span>
          <Link to="/orders" className="text-brand font-medium hover:underline">View all orders</Link>
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar bg-white rounded-md p-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full ${tab === t ? "bg-brand text-white" : "text-gray-600"}`}>{t}</button>
          ))}
        </div>
      )}
      {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      <div className="space-y-3 mt-3">
        {orders.map((o) => (
          <article key={o._id} className="bg-white rounded-md p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p><Link to={`/orders/${o.orderId}`} className="hover:text-brand"><b>{o.orderId}</b></Link> <span className="text-gray-400">· {new Date(o.createdAt).toLocaleString("en-PK")}</span></p>
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${badge[customerStatus(o.status)] || "bg-gray-100 text-gray-600"}`}>{customerStatus(o.status)}</span>
            </div>
            {o.status === "Cancelled" && o.cancelReason && (
              <p className="text-xs text-red-500 mt-1">Cancelled — {o.cancelReason}{o.cancelledBy ? ` (by ${o.cancelledBy})` : ""}</p>
            )}
            {o.returnRequestedAt && (
              <p className="text-xs text-orange-600 mt-1">Return requested — {o.returnReason} · our team will contact you</p>
            )}
            <div className="mt-2 space-y-1">
              {o.items.map((i) => (
                <div key={i._id} className="flex gap-2 items-center">
                  {i.image && <img src={i.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                  <span className="flex-1 min-w-0 line-clamp-1">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span>
                  <span className="shrink-0">{rs(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 border-t mt-2 pt-2">
              <span className="text-gray-500 min-w-0">{o.paymentMethod} · {o.deliveryMethod} delivery
              {isManualMethod(o.paymentMethod) && (
                <> · Payment: {o.paymentVerificationStatus === "pending_verification" ? "Pending verification"
                  : o.paymentVerificationStatus === "verified" ? "Verified"
                  : o.paymentVerificationStatus === "rejected" ? "Rejected - contact support" : ""}
                  {o.transactionId ? ` · Txn ${o.transactionId}` : ""}</>
              )}
              {(o.courier || o.trackingId) && ["Shipped", "OutForDelivery", "Delivered", "Returned"].includes(o.status) && (
                <> · Courier: <b>{o.courier || "-"}</b>{o.trackingId ? <> · Tracking: <b className="font-mono">{o.trackingId}</b></> : ""}</>
              )}</span>
              <span>Total: <b className="text-brand">{rs(o.total)}</b></span>
            </div>
            <ol className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
              {(o.statusHistory || []).map((h, idx) => (
                <li key={idx}>{customerStatus(h.status)} · {new Date(h.at).toLocaleDateString("en-PK")}</li>
              ))}
            </ol>
            <button onClick={() => printInvoice(o)} className="mt-2 mr-2 inline-flex items-center gap-1 border rounded px-4 py-2 sm:py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              <Printer size={13} /> Print invoice
            </button>
            <Link to={`/orders/${o.orderId}`} className="mt-2 mr-2 inline-flex items-center gap-1 border border-brand text-brand rounded px-4 py-2 sm:py-1.5 text-xs hover:bg-brand-light">
              View detail
            </Link>
            {["Pending", "Confirmed", "Packed"].includes(o.status) && cancellingId !== o.orderId && (
              <button onClick={() => openCancel(o.orderId)} className="mt-2 border border-red-300 text-red-500 rounded px-4 py-2 sm:py-1.5 text-xs">
                Cancel Order
              </button>
            )}
            {o.status === "Delivered" && !o.returnRequestedAt && returningId !== o.orderId && (
              <button onClick={() => openReturn(o.orderId)} className="mt-2 ml-2 border border-orange-300 text-orange-600 rounded px-4 py-2 sm:py-1.5 text-xs">
                Request Return
              </button>
            )}
            {o.status === "Delivered" && (() => {
              const done = reviewedByOrder[o.orderId] || new Set();
              const pendingReview = (o.items || []).some((i) => !done.has(String(i.product)));
              return pendingReview ? (
                <Link to={`/orders/${o.orderId}`} className="mt-2 ml-2 inline-flex items-center gap-1 border border-amber-400 text-amber-700 bg-amber-50 rounded px-4 py-2 sm:py-1.5 text-xs font-medium">
                  <Star size={13} /> Review dein
                </Link>
              ) : (
                <span className="mt-2 ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">✓ Reviewed</span>
              );
            })()}
            {returningId === o.orderId && (
              <div className="mt-3 border border-orange-200 bg-orange-50 rounded-lg p-3 fade-up">
                <p className="font-semibold text-orange-700">Request a return</p>
                <p className="text-xs text-gray-500 mt-1">Returns are accepted within 7 days of delivery for damaged, defective or incorrect items. Items must be unused and in their original packaging.</p>
                <div className="mt-2 space-y-1.5">
                  {RETURN_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`return-${o.orderId}`} value={r} checked={returnReason === r}
                        onChange={() => setReturnReason(r)} className="accent-orange-500" />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <input value={returnNote} onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Anything else? (optional)" className="mt-2 w-full border rounded px-3 py-2 bg-white" />
                <div className="flex gap-2 mt-3">
                  <button onClick={confirmReturn} disabled={!returnReason || returnBusy}
                    className="bg-orange-500 text-white rounded px-4 py-2 sm:py-1.5 text-xs disabled:opacity-50">
                    {returnBusy ? "Sending…" : "Send return request"}
                  </button>
                  <button onClick={() => setReturningId(null)} className="border rounded px-4 py-2 sm:py-1.5 text-xs bg-white">
                    Back
                  </button>
                </div>
              </div>
            )}
            {cancellingId === o.orderId && (
              <div className="mt-3 border border-red-200 bg-red-50 rounded-lg p-3 fade-up">
                <p className="font-semibold text-red-700">Why are you cancelling?</p>
                <div className="mt-2 space-y-1.5">
                  {CUSTOMER_CANCEL_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`cancel-${o.orderId}`} value={r} checked={cancelReason === r}
                        onChange={() => setCancelReason(r)} className="accent-red-500" />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Anything else? (optional)" className="mt-2 w-full border rounded px-3 py-2 bg-white" />
                <div className="flex gap-2 mt-3">
                  <button onClick={confirmCancel} disabled={!cancelReason || cancelBusy}
                    className="bg-red-500 text-white rounded px-4 py-2 sm:py-1.5 text-xs disabled:opacity-50">
                    {cancelBusy ? "Cancelling…" : "Confirm cancel"}
                  </button>
                  <button onClick={() => setCancellingId(null)} className="border rounded px-4 py-2 sm:py-1.5 text-xs bg-white">
                    Back
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
        {orders.length === 0 && <p className="bg-white rounded-md p-8 text-center text-gray-400">No orders in this tab yet.</p>}
      </div>
      {tickets.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold text-lg">My Support Tickets</h2>
          <p className="text-xs text-gray-500 mt-0.5">Requests you opened from the MALAC Assistant chat — the team's replies appear here.</p>
          <div className="space-y-3 mt-3">
            {tickets.map((t) => (
              <article key={t.ticketId} className="bg-white rounded-md p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <p><b>{t.ticketId}</b> <span className="text-gray-400">· {String(t.type || "").replace(/_/g, " ")}{t.orderId ? ` · Order ${t.orderId}` : ""} · {new Date(t.createdAt).toLocaleString("en-PK")}</span></p>
                  <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-600">{t.status}</span>
                </div>
                {(t.replies || []).map((r, i) => (
                  <p key={i} className="mt-1.5 text-gray-700"><b>{r.by === "staff" ? "MALAC Support:" : "You:"}</b> {r.text}</p>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
      {/* Hidden invoice print block for the order chosen above. */}
      {printState.order && <OrderInvoice order={printState.order} />}
    </main>
  );
}
