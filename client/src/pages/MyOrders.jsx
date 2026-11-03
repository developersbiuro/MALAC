import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";

const TABS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const badge = {
  Pending: "bg-amber-100 text-amber-700", Processing: "bg-sky-100 text-sky-700",
  Shipped: "bg-violet-100 text-violet-700", Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600",
};

export default function MyOrders() {
  const [tab, setTab] = useState("All");
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    const params = tab === "All" ? {} : { status: tab };
    api.get("/orders/my", { params }).then((r) => setOrders(r.data.orders)).catch(() => setOrders([]));
  };
  useEffect(load, [tab]);

  const cancel = async (orderId) => {
    setMsg("");
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      setMsg("Order cancelled."); load();
    } catch (e) { setMsg(e.response?.data?.message || "Could not cancel this order"); }
  };

  return (
    <main className="max-w-5xl mx-auto px-3 pt-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h1 className="font-bold text-xl">My Orders</h1>
        <Link to="/account/settings" className="btn-lux text-xs px-4 py-2">
          <Settings2 size={14} /> Profile Settings
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar bg-white rounded-md p-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full ${tab === t ? "bg-brand text-white" : "text-gray-600"}`}>{t}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      <div className="space-y-3 mt-3">
        {orders.map((o) => (
          <article key={o._id} className="bg-white rounded-md p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p><b>{o.orderId}</b> <span className="text-gray-400">· {new Date(o.createdAt).toLocaleString("en-PK")}</span></p>
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${badge[o.status]}`}>{o.status}</span>
            </div>
            <div className="mt-2 space-y-1">
              {o.items.map((i) => (
                <div key={i._id} className="flex gap-2 items-center">
                  {i.image && <img src={i.image} alt="" className="w-10 h-10 rounded object-cover" />}
                  <span className="flex-1 line-clamp-1">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span>
                  <span>{rs(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-between items-center border-t mt-2 pt-2">
              <span className="text-gray-500">{o.paymentMethod} · {o.deliveryMethod} delivery
              {["JazzCash", "Easypaisa"].includes(o.paymentMethod) && (
                <> · Payment: {o.paymentVerificationStatus === "pending_verification" ? "Pending verification"
                  : o.paymentVerificationStatus === "verified" ? "Verified"
                  : o.paymentVerificationStatus === "rejected" ? "Rejected - contact support" : ""}
                  {o.transactionId ? ` · Txn ${o.transactionId}` : ""}</>
              )}</span>
              <span>Total: <b className="text-brand">{rs(o.total)}</b></span>
            </div>
            <ol className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
              {(o.statusHistory || []).map((h, idx) => (
                <li key={idx}>{h.status} · {new Date(h.at).toLocaleDateString("en-PK")}</li>
              ))}
            </ol>
            {["Pending", "Processing"].includes(o.status) && (
              <button onClick={() => cancel(o.orderId)} className="mt-2 border border-red-300 text-red-500 rounded px-4 py-1.5 text-xs">
                Cancel Order
              </button>
            )}
          </article>
        ))}
        {orders.length === 0 && <p className="bg-white rounded-md p-8 text-center text-gray-400">No orders in this tab yet.</p>}
      </div>
    </main>
  );
}
