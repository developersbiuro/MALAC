import Order, { ORDER_STATUSES } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createOrder, cancelOrder, setOrderStatus } from "../services/orderService.js";

export const placeOrder = asyncHandler(async (req, res) => {
  const order = await createOrder({ user: req.user, ...req.body });
  res.status(201).json({ order });
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
  if (req.query.search) filter.orderId = { $regex: req.query.search, $options: "i" };
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
