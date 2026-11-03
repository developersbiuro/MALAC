import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { generateOrderId } from "../utils/generateOrderId.js";
import { validateCoupon, redeemCoupon } from "./couponService.js";

// Prices are always recomputed on the server from the database.
export async function createOrder({ user, items, address, paymentMethod, deliveryMethod, couponCode, paymentScreenshot, transactionId, senderAccount, senderTitle }) {
  if (!items?.length) throw new Error("Cart is empty");
  const orderItems = [];
  let subtotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || product.status === "Archived") throw new Error("A product in your cart is unavailable");
    if (product.stock < item.qty) throw new Error(`Only ${product.stock} left for ${product.title}`);
    const variant = item.variantLabel
      ? product.variants.find((v) => `${v.name}: ${v.value}` === item.variantLabel)
      : null;
    const price = product.salePrice > 0 ? product.salePrice : product.basePrice;
    const unit = price + (variant ? variant.priceDelta : 0);
    subtotal += unit * item.qty;
    orderItems.push({
      product: product._id, title: product.title, image: product.images[0] || "",
      sku: product.sku, variantLabel: item.variantLabel || "",
      price: unit, qty: item.qty,
    });
  }
  let discount = 0, appliedCoupon = null;
  if (couponCode) {
    const check = await validateCoupon(couponCode, subtotal);
    if (!check.valid) throw new Error(`Coupon: ${check.reason}`);
    discount = check.discount; appliedCoupon = check.coupon;
  }
  const isManualWallet = ["JazzCash", "Easypaisa"].includes(paymentMethod);
    if (isManualWallet) {
      // Manual transfer must be proven before the order is accepted:
      // screenshot + transaction ID + sender account are all required.
      if (!paymentScreenshot) throw new Error(`${paymentMethod}: payment screenshot is required`);
      if (!transactionId) throw new Error(`${paymentMethod}: transaction ID is required`);
      if (!senderAccount) throw new Error(`${paymentMethod}: sender account number is required`);
    }
    const shipping = deliveryMethod === "Express" ? 399 : (subtotal - discount >= 5000 ? 0 : 199);
  const total = subtotal - discount + shipping;
  const order = await Order.create({
    orderId: generateOrderId(), user: user._id, items: orderItems,
    subtotal, discount, couponCode: appliedCoupon ? appliedCoupon.code : "",
    shipping, total,
    paymentMethod: paymentMethod || "COD",
    paymentStatus: paymentMethod === "Card" ? "Paid" : "Unpaid",
    paymentScreenshot: isManualWallet ? paymentScreenshot : "",
    transactionId: isManualWallet ? transactionId : "",
    senderAccount: isManualWallet ? senderAccount : "",
    senderTitle: isManualWallet ? (senderTitle || "") : "",
    paymentVerificationStatus: isManualWallet ? "pending_verification" : "not_applicable",
    deliveryMethod: deliveryMethod || "Standard",
    address,
    estimatedDelivery: new Date(Date.now() + (deliveryMethod === "Express" ? 2 : 4) * 86400000),
    statusHistory: [{ status: "Pending", by: "customer", note: "Order placed" }],
  });
  for (const item of orderItems) {
    await Product.updateOne({ _id: item.product },
      { $inc: { stock: -item.qty, sold: item.qty } });
  }
  if (appliedCoupon) await redeemCoupon(appliedCoupon);
  return order;
}

export const CANCELLABLE = ["Pending", "Processing"];
export async function cancelOrder(order, by = "customer") {
  if (!CANCELLABLE.includes(order.status)) {
    throw new Error(`Orders can only be cancelled while Pending or Processing (current: ${order.status})`);
  }
  order.status = "Cancelled";
  order.statusHistory.push({ status: "Cancelled", by, note: "Cancelled" });
  await order.save();
  for (const item of order.items) {
    if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty, sold: -item.qty } });
  }
  return order;
}

export async function setOrderStatus(order, status, by = "admin") {
  order.status = status;
  order.statusHistory.push({ status, by, note: `Status updated to ${status}` });
  if (status === "Delivered" && order.paymentMethod === "COD") order.paymentStatus = "Paid";
  await order.save();
  return order;
}
