import Order, { ORDER_STATUSES } from "../models/Order.js";
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
// Guests track with the two facts only the buyer knows: the human order
// ID from their confirmation AND the phone number placed on the order.
// The phone is compared on its last 10 digits so +92 / 0 / bare formats
// all match. A single generic 404 covers both "no such order" and
// "phone does not match" so the endpoint never reveals which failed.
// The response is a LIMITED view: no user account data, no address, no
// payment screenshots/transaction details.
const last10Digits = (value) => String(value || "").replace(/\D/g, "").slice(-10);

export const trackOrder = asyncHandler(async (req, res) => {
  const orderId = String(req.body.orderId || "").trim();
  const phoneDigits = last10Digits(req.body.phone);
  const notFound = () => res.status(404).json({
    message: "We could not find an order matching that order ID and phone number. Please check both and try again.",
  });
  if (!orderId || phoneDigits.length < 10) return notFound();
  let order = await Order.findOne({ orderId });
  if (!order && orderId !== orderId.toUpperCase()) {
    order = await Order.findOne({ orderId: orderId.toUpperCase() });
  }
  if (!order) return notFound();
  if (last10Digits(order.address?.phone) !== phoneDigits) return notFound();
  res.json({
    order: {
      orderId: order.orderId,
      status: order.status,
      statusHistory: (order.statusHistory || []).map((h) => ({ status: h.status, at: h.at })),
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
    },
  });
});

export const myOrders = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

// Self-service cancellation: only while Pending or Processing (enforced in service)
export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  try {
    await cancelOrder(order, "customer");
    res.json({ order });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ---- Admin fulfillment center ----
export const adminListOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    // Literal substring match only: escape regex metacharacters and cap
    // the length so the search text can never act as a caller-controlled
    // pattern against order ids.
    const literal = String(req.query.search).slice(0, 64).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.orderId = { $regex: literal, $options: "i" };
  }
  const orders = await Order.find(filter).populate("user", "name email phone")
    .sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (status === "Cancelled") {
    try { await cancelOrder(order, req.user.role); } catch (e) { return res.status(400).json({ message: e.message }); }
  } else {
    await setOrderStatus(order, status, req.user.role);
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
