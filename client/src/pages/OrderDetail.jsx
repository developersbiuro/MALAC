import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, MapPin } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";
import { isManualMethod } from "../utils/payments.js";
import { printBlock } from "../utils/print.js";
import OrderInvoice from "../components/OrderInvoice.jsx";

// Dedicated order page (owner's ask, 2026-11-11, Daraz-style): opening an
// order shows ONLY that order's detail — status tracker, delivery,
// address, items, payment summary and the order's own actions. Nothing
// else lives on this page.
const badge = {
  Pending: "bg-amber-100 text-amber-700", Processing: "bg-sky-100 text-sky-700",
  Shipped: "bg-violet-100 text-violet-700", Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600", Returned: "bg-orange-100 text-orange-700",
};
const customerStatus = (s) => (s === "Confirmed" || s === "Packed" ? "Processing" : s);
const CUSTOMER_CANCEL_REASONS = [
  "Changed my mind", "Ordered by mistake", "Found a better price elsewhere",
  "Delivery is taking too long", "Need to change address or items",
  "Payment issue", "Other",
];
const RETURN_REASONS = [
  "Damaged item received", "Defective / not working", "Wrong item delivered",
  "Wrong size or colour", "Missing parts or accessories", "Other",
];
const STAGES = ["Pending", "Processing", "Shipped", "Delivered"];
const stageIndex = (status) => {
  const cs = customerStatus(status);
  if (cs === "Pending") return 0;
  if (cs === "Processing") return 1;
  if (cs === "Shipped") return 2;
  if (cs === "Delivered") return 3;
  return -1; // Cancelled / Returned — no progress bar
};

export default function OrderDetail() {
  const { orderId } = useParams();
  useSeo({ title: `Order ${orderId} — MALAC`, robots: "noindex" });
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | missing
  const [msg, setMsg] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const [printSeq, setPrintSeq] = useState(0);

  const load = () => {
    api.get(`/orders/${orderId}`)
      .then((r) => { setOrder(r.data.order); setState("ok"); })
      .catch(() => setState("missing"));
  };
  useEffect(load, [orderId]);

  useEffect(() => {
    if (!printSeq || !order) return;
    const t = setTimeout(() => printBlock("invoice"), 80);
    return () => clearTimeout(t);
  }, [printSeq]);

  const confirmCancel = async () => {
    if (!cancelReason) return;
    setCancelBusy(true); setMsg("");
    try {
      await api.patch(`/orders/${orderId}/cancel`, { reason: cancelReason, note: cancelNote });
      setShowCancel(false);
      setMsg("Order cancelled.");
      load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not cancel this order"); }
    finally { setCancelBusy(false); }
  };

  const confirmReturn = async () => {
    if (!returnReason) return;
    setReturnBusy(true); setMsg("");
    try {
      await api.post(`/orders/${orderId}/return-request`, { reason: returnReason, note: returnNote });
      setShowReturn(false);
      setMsg("Return request sent — our team will contact you to arrange it.");
      load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not send the return request"); }
    finally { setReturnBusy(false); }
  };

  if (state === "loading") {
    return <main className="max-w-3xl mx-auto px-3 pt-8"><p className="bg-white rounded-md p-8 text-center text-gray-400">Loading order…</p></main>;
  }
  if (state === "missing" || !order) {
    return (
      <main className="max-w-3xl mx-auto px-3 pt-8">
        <p className="bg-white rounded-md p-8 text-center text-gray-400">Order not found.</p>
        <p className="text-center mt-3"><Link to="/orders" className="text-brand hover:underline text-sm">← Back to My Orders</Link></p>
      </main>
    );
  }

  const o = order;
  const cs = customerStatus(o.status);
  const stage = stageIndex(o.status);
  const stageDate = (label) => {
    const hit = (o.statusHistory || []).find((h) => customerStatus(h.status) === label);
    return hit ? new Date(hit.at).toLocaleDateString("en-PK") : "";
  };
  const addr = o.address || {};
  const addressLine = [addr.street, addr.area, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ");

  return (
    <main className="max-w-3xl mx-auto px-3 pt-4 pb-10">
      <div className="flex items-center gap-2 mb-3">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand">
          <ArrowLeft size={16} /> My Orders
        </Link>
        <h1 className="font-bold text-lg ml-1">Order Detail</h1>
      </div>
      {msg && <p className="text-sm text-gray-600 mb-2">{msg}</p>}

      {/* Status */}
      <section className="bg-white rounded-md p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <p><b>{o.orderId}</b> <span className="text-gray-400">· {new Date(o.createdAt).toLocaleString("en-PK")}</span></p>
          <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${badge[cs] || "bg-gray-100 text-gray-600"}`}>{cs}</span>
        </div>
        {o.status === "Cancelled" && (
          <p className="text-red-500 mt-2">This order was cancelled{o.cancelReason ? ` — ${o.cancelReason}` : ""}{o.cancelledBy ? ` (by ${o.cancelledBy})` : ""}.</p>
        )}
        {o.status === "Returned" && <p className="text-orange-600 mt-2">This order was returned.</p>}
        {o.returnRequestedAt && o.status !== "Returned" && (
          <p className="text-orange-600 mt-2">Return requested — {o.returnReason} · our team will contact you.</p>
        )}
        {stage >= 0 && (
          <ol className="flex mt-4">
            {STAGES.map((label, i) => (
              <li key={label} className="flex-1 text-center relative">
                <div className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i <= stage ? "bg-brand text-white" : "bg-gray-200 text-gray-400"}`}>{i + 1}</div>
                {i < STAGES.length - 1 && <div className={`absolute top-3 left-[calc(50%+14px)] right-[calc(-50%+14px)] h-0.5 ${i < stage ? "bg-brand" : "bg-gray-200"}`} />}
                <p className={`mt-1 text-[11px] ${i <= stage ? "text-gray-700 font-medium" : "text-gray-400"}`}>{label === "Pending" ? "Placed" : label}</p>
                <p className="text-[10px] text-gray-400">{i <= stage ? stageDate(label) : ""}</p>
              </li>
            ))}
          </ol>
        )}
        {(o.courier || o.trackingId) && ["Shipped", "Delivered", "Returned"].includes(o.status) && (
          <p className="mt-3 text-gray-600">Courier: <b>{o.courier || "-"}</b>{o.trackingId ? <> · Tracking: <b className="font-mono">{o.trackingId}</b></> : ""}</p>
        )}
        {o.estimatedDelivery && o.status !== "Delivered" && o.status !== "Cancelled" && (
          <p className="mt-1 text-gray-600">Expected delivery by <b>{new Date(o.estimatedDelivery).toLocaleDateString("en-PK")}</b> · {o.deliveryMethod} delivery</p>
        )}
      </section>

      {/* Delivery address */}
      <section className="bg-white rounded-md p-4 text-sm mt-3">
        <h2 className="font-semibold mb-1.5">Delivery Address</h2>
        <p className="font-medium">{addr.fullName || "-"}</p>
        <p className="text-gray-600">{addr.phone || ""}{addr.email ? ` · ${addr.email}` : ""}</p>
        <p className="text-gray-600">{addressLine}</p>
        {addr.mapsUrl && (
          <a href={addr.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline mt-1">
            <MapPin size={13} /> View location
          </a>
        )}
      </section>

      {/* Items */}
      <section className="bg-white rounded-md p-4 text-sm mt-3">
        <h2 className="font-semibold mb-2">Items</h2>
        <div className="space-y-2">
          {o.items.map((i) => (
            <div key={i._id} className="flex gap-3 items-center">
              {i.image && <img src={i.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className="line-clamp-2">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""}</span>
                <span className="text-gray-400 text-xs">Qty {i.qty} · {rs(i.price)} each</span>
              </span>
              <span className="shrink-0 font-medium">{rs(i.price * i.qty)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Payment + summary */}
      <section className="bg-white rounded-md p-4 text-sm mt-3">
        <h2 className="font-semibold mb-2">Payment</h2>
        <div className="space-y-1 text-gray-600">
          <p className="flex justify-between"><span>Payment method</span><span className="text-gray-800 font-medium">{o.paymentMethod}</span></p>
          <p className="flex justify-between"><span>Payment status</span><span className="text-gray-800 font-medium">{o.paymentStatus}</span></p>
          {isManualMethod(o.paymentMethod) && (
            <p className="flex justify-between"><span>Verification</span><span className="text-gray-800 font-medium">
              {o.paymentVerificationStatus === "pending_verification" ? "Pending verification"
                : o.paymentVerificationStatus === "verified" ? "Verified"
                : o.paymentVerificationStatus === "rejected" ? "Rejected — contact support" : "-"}
            </span></p>
          )}
          {o.transactionId && <p className="flex justify-between"><span>Transaction ID</span><span className="text-gray-800 font-mono text-xs">{o.transactionId}</span></p>}
        </div>
        <div className="border-t mt-3 pt-2 space-y-1 text-gray-600">
          <p className="flex justify-between"><span>Subtotal</span><span>{rs(o.subtotal)}</span></p>
          {o.discount > 0 && <p className="flex justify-between text-green-600"><span>Discount{o.couponCode ? ` (${o.couponCode})` : ""}</span><span>− {rs(o.discount)}</span></p>}
          <p className="flex justify-between"><span>Delivery ({o.deliveryMethod})</span><span>{o.shipping > 0 ? rs(o.shipping) : "FREE"}</span></p>
          <p className="flex justify-between text-base font-bold text-gray-900 pt-1"><span>Total</span><span className="text-brand">{rs(o.total)}</span></p>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => setPrintSeq((s) => s + 1)} className="inline-flex items-center gap-1 border bg-white rounded px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
          <Printer size={13} /> Print invoice
        </button>
        {["Pending", "Confirmed", "Packed"].includes(o.status) && !showCancel && (
          <button onClick={() => setShowCancel(true)} className="border border-red-300 bg-white text-red-500 rounded px-4 py-2 text-xs">Cancel Order</button>
        )}
        {o.status === "Delivered" && !o.returnRequestedAt && !showReturn && (
          <button onClick={() => setShowReturn(true)} className="border border-orange-300 bg-white text-orange-600 rounded px-4 py-2 text-xs">Request Return</button>
        )}
      </div>

      {showCancel && (
        <div className="mt-3 border border-red-200 bg-red-50 rounded-lg p-3 text-sm fade-up">
          <p className="font-semibold text-red-700">Why are you cancelling?</p>
          <div className="mt-2 space-y-1.5">
            {CUSTOMER_CANCEL_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="cancel-reason" value={r} checked={cancelReason === r} onChange={() => setCancelReason(r)} className="accent-red-500" />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Anything else? (optional)" className="mt-2 w-full border rounded px-3 py-2 bg-white" />
          <div className="flex gap-2 mt-3">
            <button onClick={confirmCancel} disabled={!cancelReason || cancelBusy} className="bg-red-500 text-white rounded px-4 py-2 text-xs disabled:opacity-50">
              {cancelBusy ? "Cancelling…" : "Confirm cancel"}
            </button>
            <button onClick={() => setShowCancel(false)} className="border rounded px-4 py-2 text-xs bg-white">Back</button>
          </div>
        </div>
      )}

      {showReturn && (
        <div className="mt-3 border border-orange-200 bg-orange-50 rounded-lg p-3 text-sm fade-up">
          <p className="font-semibold text-orange-700">Request a return</p>
          <p className="text-xs text-gray-500 mt-1">Returns are accepted within 7 days of delivery for damaged, defective or incorrect items. Items must be unused and in their original packaging.</p>
          <div className="mt-2 space-y-1.5">
            {RETURN_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="return-reason" value={r} checked={returnReason === r} onChange={() => setReturnReason(r)} className="accent-orange-500" />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <input value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="Anything else? (optional)" className="mt-2 w-full border rounded px-3 py-2 bg-white" />
          <div className="flex gap-2 mt-3">
            <button onClick={confirmReturn} disabled={!returnReason || returnBusy} className="bg-orange-500 text-white rounded px-4 py-2 text-xs disabled:opacity-50">
              {returnBusy ? "Sending…" : "Send return request"}
            </button>
            <button onClick={() => setShowReturn(false)} className="border rounded px-4 py-2 text-xs bg-white">Back</button>
          </div>
        </div>
      )}

      {/* Hidden invoice print block (same pattern as My Orders). */}
      {order && printSeq > 0 && <OrderInvoice order={order} />}
    </main>
  );
}
