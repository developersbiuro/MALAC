import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import api from "../api/client.js";
import { rs } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  useSeo({ title: "Order Confirmed — MALAC", robots: "noindex" });

  useEffect(() => {
    if (!order) api.get(`/orders/${orderId}`).then((r) => setOrder(r.data.order)).catch(() => {});
  }, [orderId]);

  if (!order) return <p className="p-8 text-center text-gray-400">Loading order...</p>;
  return (
    <main className="max-w-3xl mx-auto px-3 pt-8">
      <div className="bg-white rounded-md p-6 text-center">
        <CheckCircle2 size={52} className="text-green-500 mx-auto" />
        <h1 className="text-xl font-bold mt-2">Thank you! Your order is confirmed.</h1>
        <p className="text-sm text-gray-500 mt-1">Order ID: <b className="text-gray-800">{order.orderId}</b></p>
        {["JazzCash", "Easypaisa"].includes(order.paymentMethod) && (
          <p className="text-sm text-amber-600 mt-2">
            {order.paymentMethod} payment {order.paymentVerificationStatus === "verified" ? "verified ✓"
              : order.paymentVerificationStatus === "rejected" ? "was rejected — please contact support"
              : "is pending verification by the MALAC team"}
            {order.transactionId ? ` · Txn ${order.transactionId}` : ""}
          </p>
        )}
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full px-3 py-1 mt-3">
          <Package size={13} /> Tracking: {order.status}
        </span>
        <div className="text-left text-sm mt-6 space-y-1.5">
          {order.items.map((i) => (
            <div key={i._id} className="flex justify-between gap-2">
              <span className="min-w-0 break-words">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span><span className="shrink-0">{rs(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between"><span>Discount</span><span>-{rs(order.discount)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{rs(order.shipping)}</span></div>
          <div className="flex justify-between border-t pt-2 font-bold"><span>Total ({order.paymentMethod})</span><span className="text-brand">{rs(order.total)}</span></div>
          <p className="text-gray-500 pt-2">Deliver to: {order.address?.fullName}, {order.address?.street}, {order.address?.area}, {order.address?.city}{order.address?.province ? `, ${order.address.province}` : ""}
            {order.estimatedDelivery ? ` · Expected by ${new Date(order.estimatedDelivery).toLocaleDateString("en-PK")}` : ""}</p>
        </div>
        <Link to="/orders" className="inline-block mt-5 bg-brand text-white px-6 py-2 rounded text-sm">Track in My Orders</Link>
      </div>
    </main>
  );
}
