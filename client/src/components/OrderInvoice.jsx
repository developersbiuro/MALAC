import { rs } from "../utils/format.js";
import { customerContact } from "../utils/customerContact.js";

// Printable priced invoice (Daraz-style), shared by the admin order
// drawer, My Orders and the order confirmation page. Renders inside a
// .print-area.print-invoice-block wrapper: hidden on screen, and the
// @media print rules in index.css show ONLY this block when <body>
// carries the printing-invoice class (see utils/print.js printBlock).
// Print-friendly by design: black on white, borders instead of fills.

// Customer-facing status label — Confirmed/Packed read as "Processing",
// mirroring MyOrders.
const customerStatus = (s) => (s === "Confirmed" || s === "Packed" ? "Processing" : s);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : null);
const historyDate = (order, status) =>
  fmtDate((order.statusHistory || []).find((h) => h.status === status)?.at);

function paymentLine(order) {
  if (order.paymentStatus === "Paid") {
    return order.paymentMethod === "COD" ? "Cash on Delivery — Paid" : `${order.paymentMethod} — Paid`;
  }
  if (order.paymentMethod === "COD") {
    return `Cash on Delivery — collect ${rs(order.total)} on delivery`;
  }
  if (["JazzCash", "Easypaisa"].includes(order.paymentMethod)) {
    const v = order.paymentVerificationStatus;
    if (v === "verified") return `${order.paymentMethod} — Paid (verified)`;
    if (v === "rejected") return `${order.paymentMethod} — Payment rejected`;
    return `${order.paymentMethod} — Payment pending verification`;
  }
  return `${order.paymentMethod}${order.paymentStatus ? ` — ${order.paymentStatus}` : ""}`;
}

export default function OrderInvoice({ order }) {
  if (!order) return null;
  const a = order.address || {};
  // Placeholder-safe contact: synthetic identifiers come back empty and
  // their lines are simply omitted (never printed).
  const contact = customerContact(order.user, a);
  const name = a.fullName || order.user?.name || "";
  const addressLine = [a.street, a.area, a.city, a.province, a.postalCode].filter(Boolean).join(", ");
  const subtotal = order.subtotal != null
    ? order.subtotal
    : (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Number(order.discount || 0);
  const shippedDate = historyDate(order, "Shipped");
  const deliveredDate = historyDate(order, "Delivered");
  const hasShipment = !!(order.courier || order.trackingId);

  return (
    <div className="print-area print-invoice-block bg-white text-black text-sm leading-relaxed">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-3xl font-black tracking-[0.2em]">MALAC</p>
          <p className="text-[10px] uppercase tracking-widest">M.A Luxury Apparel Collection</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black tracking-widest">INVOICE</p>
          <p className="font-mono">{order.orderId}</p>
          <p className="text-xs">{fmtDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Customer + shipment details, side by side */}
      <div className="flex gap-6 mt-4">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-widest border-b border-black pb-1 mb-2">Customer / Ship to</p>
          <p className="font-bold">{name}</p>
          {contact.phone && <p>Phone: <span className="font-mono">{contact.phone}</span></p>}
          {contact.email && <p>Email: {contact.email}</p>}
          {addressLine && <p>{addressLine}</p>}
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-widest border-b border-black pb-1 mb-2">Shipment Details</p>
          <p>Status: <b>{customerStatus(order.status)}</b></p>
          {hasShipment ? (
            <>
              <p>Courier: <b>{order.courier || "-"}</b></p>
              <p>Tracking ID: <b className="font-mono">{order.trackingId || "-"}</b></p>
            </>
          ) : (
            <p>Not shipped yet</p>
          )}
          {order.deliveryMethod && <p>Delivery: {order.deliveryMethod}</p>}
          <p>Ordered: {fmtDate(order.createdAt)}</p>
          {shippedDate && <p>Shipped: {shippedDate}</p>}
          {deliveredDate && <p>Delivered: {deliveredDate}</p>}
          {order.estimatedDelivery && <p>Expected delivery: {fmtDate(order.estimatedDelivery)}</p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-y-2 border-black text-left">
            <th className="py-1.5 pr-2 font-bold">Item</th>
            <th className="py-1.5 px-2 font-bold text-center w-14">Qty</th>
            <th className="py-1.5 px-2 font-bold text-right w-28">Unit price</th>
            <th className="py-1.5 pl-2 font-bold text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((i) => (
            <tr key={i._id} className="border-b border-gray-400">
              <td className="py-1.5 pr-2">{i.title}{i.variantLabel ? ` (${i.variantLabel})` : ""}{i.sku ? <span className="block text-[11px]">SKU: {i.sku}</span> : null}</td>
              <td className="py-1.5 px-2 text-center">{i.qty}</td>
              <td className="py-1.5 px-2 text-right">{rs(i.price)}</td>
              <td className="py-1.5 pl-2 text-right">{rs(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mt-3">
        <div className="w-64">
          <p className="flex justify-between py-0.5"><span>Subtotal</span><span>{rs(subtotal)}</span></p>
          <p className="flex justify-between py-0.5"><span>Delivery</span><span>{rs(order.shipping)}</span></p>
          {discount > 0 && (
            <p className="flex justify-between py-0.5"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>-{rs(discount)}</span></p>
          )}
          <p className="flex justify-between border-t-2 border-black mt-1 pt-1.5 text-base font-black"><span>Grand Total</span><span>{rs(order.total)}</span></p>
        </div>
      </div>

      {/* Payment */}
      <p className="mt-4 border border-black rounded p-2.5">
        <span className="text-[11px] uppercase tracking-widest block">Payment</span>
        <b>{paymentLine(order)}</b>
      </p>

      {/* Footer */}
      <p className="text-center text-xs mt-6 border-t border-gray-400 pt-3">
        Thank you for shopping with MALAC · malac1.vercel.app · WhatsApp +92 323 6016684
      </p>
    </div>
  );
}
