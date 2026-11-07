import Order, { ORDER_STATUSES, CUSTOMER_STATUS, COURIERS } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createOrder, cancelOrder, setOrderStatus } from "../services/orderService.js";
import { isVerifiedCustomer } from "../utils/verification.js";

export const placeOrder = asyncHandler(async (req, res) => {
  // Only verified customers may order. Sign-up is ONE-method — the
  // account is created only after its single email or WhatsApp OTP
  // verifies (or instantly by Google) — so this guard only trips on
  // partial/legacy rows. One verified channel is enough.
  const u = req.user;
  if (u.role === "customer" && !isVerifiedCustomer(u)) {
    return res.status(403).json({ message: "Please complete sign-up verification before placing an order." });
  }
  const order = await createOrder({ user: req.user, ...req.body });
  res.status(201).json({ order });
});

// -- Public order tracking (no login) --
// Guests track with EITHER the order ID OR the phone number used on the
// order (Abdullah, 2026-11-07: "jo type kr le, order mil jay"). A phone
// lookup returns that number's recent orders (latest first, max 10).
// IDs are short (MLC-XXXXXX) but random across a 36^6 space and this
// endpoint is IP rate-limited in the routes file. The response is a
// LIMITED view either way: no user account data, no address, no payment
// screenshots/transaction details.
const last10Digits = (value) => String(value || "").replace(/\D/g, "").slice(-10);

function limitedOrderView(order) {
  const customerStatus = CUSTOMER_STATUS(order.status);
  const shipped = ["Shipped", "Delivered"].includes(order.status);
  return {
    orderId: order.orderId,
    // Shoppers see the collapsed vocabulary (Confirmed/Packed →
    // "Processing"); courier + tracking ID appear once dispatched.
    status: customerStatus,
    courier: shipped ? (order.courier || "") : "",
    trackingId: shipped ? (order.trackingId || "") : "",
    cancelReason: order.status === "Cancelled" ? (order.cancelReason || "") : "",
    statusHistory: (order.statusHistory || []).map((h) => ({ status: CUSTOMER_STATUS(h.status), at: h.at })),
    items: order.items.map((i) => ({
      title: i.title, variantLabel: i.variantLabel || "", qty: i.qty, price: i.price, image: i.image || "",
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentVerificationStatus: order.paymentVerificationStatus,
    deliveryMethod: order.deliveryMethod,
    estimatedDelivery: order.estimatedDelivery || null,
    createdAt: order.createdAt,
  };
}

export const trackOrder = asyncHandler(async (req, res) => {
  const orderId = String(req.body.orderId || "").trim();
  const phoneDigits = last10Digits(req.body.phone);
  const notFound = () => res.status(404).json({
    message: "We could not find an order with that order ID or phone number. Please check and try again.",
  });
  // Order ID path — a single order.
  if (orderId) {
    let order = await Order.findOne({ orderId });
    if (!order && orderId !== orderId.toUpperCase()) {
      order = await Order.findOne({ orderId: orderId.toUpperCase() });
    }
    if (!order) return notFound();
    return res.json({ order: limitedOrderView(order) });
  }
  // Phone path — every recent order placed with that number (stored
  // phones end with the national 10 digits in both +92… and 03… forms,
  // so an ends-with match on those digits is the last-10 comparison).
  if (phoneDigits.length === 10) {
    const orders = await Order.find({ "address.phone": { $regex: `${phoneDigits}$` } })
      .sort({ createdAt: -1 })
      .limit(10);
    if (!orders.length) return notFound();
    return res.json({ orders: orders.map(limitedOrderView) });
  }
  return notFound();
});

export const myOrders = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  // The My Orders tabs use the collapsed customer vocabulary: the
  // "Processing" tab covers both Confirmed and Packed orders.
  if (req.query.status === "Processing") filter.status = { $in: ["Confirmed", "Packed"] };
  else if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

// Self-service cancellation: only before the parcel ships (enforced in
// service) and only with a reason from the customer list (also enforced
// in the service — a missing/invalid reason is a 400).
export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  try {
    await cancelOrder(order, "customer", { reason: req.body?.reason, note: req.body?.note });
    res.json({ order });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ---- Admin fulfillment center ----
export const adminListOrders = asyncHandler(async (req, res) => {
  const filter = {};
  // The admin "Processing" tab groups Confirmed + Packed (Daraz-style).
  if (req.query.status === "Processing") filter.status = { $in: ["Confirmed", "Packed"] };
  else if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    // Literal substring match only: escape regex metacharacters and cap
    // the length so the search text can never act as a caller-controlled
    // pattern against order ids.
    const literal = String(req.query.search).slice(0, 64).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.orderId = { $regex: literal, $options: "i" };
  }
  const orders = await Order.find(filter).populate("user", "name email phone secondaryPhone")
    .sort({ createdAt: -1 }).limit(200);
  // Per-tab counts for the fulfillment center (respect the search text,
  // ignore the status filter itself).
  const countFilter = { ...filter };
  delete countFilter.status;
  const grouped = await Order.aggregate([
    { $match: countFilter },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(grouped.map((g) => [g._id, g.n]));
  const counts = {
    All: Object.values(byStatus).reduce((s, n) => s + n, 0),
    Pending: byStatus.Pending || 0,
    Processing: (byStatus.Confirmed || 0) + (byStatus.Packed || 0),
    Shipped: byStatus.Shipped || 0,
    Delivered: byStatus.Delivered || 0,
    Cancelled: byStatus.Cancelled || 0,
    Returned: byStatus.Returned || 0,
  };
  res.json({ orders, counts });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone secondaryPhone");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status, courier, trackingId, reason, note } = req.body;
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
  // Courier must come from the known list when one is supplied.
  if (courier !== undefined && courier !== "" && !COURIERS.includes(courier)) {
    return res.status(400).json({ message: "Invalid courier" });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (status === "Cancelled") {
    // Staff cancels also require a reason (admin list — enforced in service).
    try { await cancelOrder(order, "admin", { reason, note }); } catch (e) { return res.status(400).json({ message: e.message }); }
  } else {
    await setOrderStatus(order, status, req.user.role, { courier, trackingId });
  }
  res.json({ order });
});


// ---- Manual payment verification (JazzCash / Easypaisa) ----
// Route-guarded to Super Admin: billing/financial action per RBAC brief.
export const adminVerifyPayment = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // decision: "verified" | "rejected"
  if (!["verified", "rejected"].includes(decision))
    return res.status(400).json({ message: "decision must be verified or rejected" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!["JazzCash", "Easypaisa"].includes(order.paymentMethod))
    return res.status(400).json({ message: "This order was not paid by manual wallet transfer" });
  order.paymentVerificationStatus = decision;
  order.paymentVerificationNote = note || "";
  order.paymentVerifiedBy = req.user.email;
  order.paymentVerifiedAt = new Date();
  if (decision === "verified") order.paymentStatus = "Paid";
  order.statusHistory.push({
    status: order.status, by: req.user.role,
    note: `Payment ${decision} for ${order.paymentMethod} txn ${order.transactionId || "-"}`,
  });
  await order.save();
  res.json({ order });
});
