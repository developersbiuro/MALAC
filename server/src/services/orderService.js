import Order, { CUSTOMER_CANCEL_REASONS, ADMIN_CANCEL_REASONS, MANUAL_PAYMENT_METHODS } from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import env from "../config/env.js";
import { sendStoreEmail } from "./emailService.js";
import { reviewInviteEmail } from "./emailTemplates.js";
import { onOrderCancelled, onOrderShipped, onOrderDelivered } from "./notifyService.js";
import { generateOrderId } from "../utils/generateOrderId.js";
import { validateCoupon, redeemCoupon } from "./couponService.js";

// The delivery address is stored as a snapshot on the order. When the
// customer ordered with their live location, the pin (lat/lng/mapsUrl)
// rides along so staff can open it in a map. Coordinates are validated
// here: an out-of-range or non-numeric pair is silently dropped — a bad
// pin must never fail an otherwise valid order.
function sanitizeAddressSnapshot(address) {
  const snap = { ...(address || {}) };
  const lat = Number(snap.lat);
  const lng = Number(snap.lng);
  const latOk = snap.lat !== null && snap.lat !== "" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const lngOk = snap.lng !== null && snap.lng !== "" && Number.isFinite(lng) && lng >= -180 && lng <= 180;
  if (latOk && lngOk) {
    snap.lat = lat;
    snap.lng = lng;
    snap.mapsUrl = typeof snap.mapsUrl === "string" && snap.mapsUrl
      ? snap.mapsUrl.slice(0, 500)
      : `https://www.google.com/maps?q=${lat},${lng}`;
  } else {
    delete snap.lat;
    delete snap.lng;
    delete snap.mapsUrl;
  }
  return snap;
}

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
    if (variant && variant.stock < item.qty) throw new Error(`Only ${variant.stock} left for ${product.title} (${item.variantLabel})`);
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
  const isManualWallet = MANUAL_PAYMENT_METHODS.includes(paymentMethod);
    if (isManualWallet) {
      // Manual transfer must be proven before the order is accepted:
      // screenshot + transaction ID + sender account are all required.
      if (!paymentScreenshot) throw new Error(`${paymentMethod}: payment screenshot is required`);
      if (!transactionId) throw new Error(`${paymentMethod}: transaction ID is required`);
      if (!senderAccount) throw new Error(`${paymentMethod}: sender account number is required`);
    }
  // Delivery charges come from the live store Settings (Admin →
  // Settings) — the panel values are the single source of truth for
  // every order; never hardcode them here.
  const store = await Settings.getStore();
  // The owner's Settings switch rules here too: with Cash on Delivery
  // disabled in Admin → Settings, a COD order is refused outright.
  if ((paymentMethod || "COD") === "COD" && store.codEnabled === false) {
    throw new Error("Cash on Delivery is not available right now — please choose a bank/wallet transfer method");
  }
  const shipping = deliveryMethod === "Express"
    ? store.expressShippingFee
    : (subtotal - discount >= store.freeShippingThreshold ? 0 : store.defaultShippingFee);
  const total = subtotal - discount + shipping;
  // Stock is claimed ATOMICALLY before the coupon is redeemed: each
  // decrement is a single conditional update that only succeeds when
  // enough stock remains, so two simultaneous checkouts can never both
  // claim the last unit. If any claim fails, everything claimed so far
  // for this order is released again and the order is never created.
  const stockOps = [];
  for (const item of orderItems) {
    stockOps.push({ product: item.product, variantLabel: item.variantLabel || "", qty: item.qty, title: item.title, claimed: false });
  }
  const releaseStock = async () => {
    for (const op of stockOps) {
      if (!op.claimed) continue;
      await Product.updateOne({ _id: op.product }, { $inc: { stock: op.qty, sold: -op.qty } }).catch(() => {});
      if (op.variantLabel) {
        await Product.updateOne(
          { _id: op.product, "variants.name": op.variantLabel.split(": ")[0], "variants.value": op.variantLabel.split(": ").slice(1).join(": ") },
          { $inc: { "variants.$.stock": op.qty } }
        ).catch(() => {});
      }
    }
  };
  for (const op of stockOps) {
    const claim = await Product.updateOne(
      { _id: op.product, stock: { $gte: op.qty } },
      { $inc: { stock: -op.qty, sold: op.qty } }
    );
    if (!claim.modifiedCount) {
      await releaseStock();
      throw new Error(`Only a few left for ${op.title} — please reduce the quantity`);
    }
    op.claimed = true;
    if (op.variantLabel) {
      const vName = op.variantLabel.split(": ")[0];
      const vValue = op.variantLabel.split(": ").slice(1).join(": ");
      const vClaim = await Product.updateOne(
        { _id: op.product, variants: { $elemMatch: { name: vName, value: vValue, stock: { $gte: op.qty } } } },
        { $inc: { "variants.$[v].stock": -op.qty } },
        { arrayFilters: [{ "v.name": vName, "v.value": vValue }] }
      );
      if (!vClaim.modifiedCount) {
        // Compensate this item's product-level claim, then release the rest.
        await Product.updateOne({ _id: op.product }, { $inc: { stock: op.qty, sold: -op.qty } }).catch(() => {});
        op.claimed = false;
        await releaseStock();
        throw new Error(`That variant of ${op.title} just went out of stock`);
      }
    }
  }
  let order = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await Order.create({
    orderId: generateOrderId(), user: user._id, items: orderItems,
    subtotal, discount, couponCode: appliedCoupon ? appliedCoupon.code : "",
    shipping, total,
    paymentMethod: paymentMethod || "COD",
    paymentStatus: "Unpaid",
    paymentScreenshot: isManualWallet ? paymentScreenshot : "",
    transactionId: isManualWallet ? transactionId : "",
    senderAccount: isManualWallet ? senderAccount : "",
    senderTitle: isManualWallet ? (senderTitle || "") : "",
    paymentVerificationStatus: isManualWallet ? "pending_verification" : "not_applicable",
    deliveryMethod: deliveryMethod || "Standard",
    address: sanitizeAddressSnapshot(address),
    estimatedDelivery: new Date(Date.now() + (deliveryMethod === "Express" ? 2 : 4) * 86400000),
    statusHistory: [{ status: "Pending", by: "customer", note: "Order placed" }],
      });
    } catch (e) {
      if (e?.code !== 11000 || attempt === 4) { await releaseStock(); throw e; } // not a collision: release claims, fail as before
    }
  }
  if (appliedCoupon) {
    try { await redeemCoupon(appliedCoupon); }
    catch (e) { await releaseStock(); await Order.deleteOne({ _id: order._id }).catch(() => {}); throw e; }
  }
  return order;
}

// Customers may self-cancel until the parcel is packed; staff may cancel
// any order that has not shipped yet (a shipped parcel comes back via
// "Returned" instead). A reason from the actor's list is REQUIRED.
export const CANCELLABLE = ["Pending", "Confirmed", "Packed"];
export async function cancelOrder(order, by = "customer", { reason = "", note = "" } = {}) {
  if (!CANCELLABLE.includes(order.status)) {
    throw new Error(`Orders can only be cancelled while Pending, Confirmed or Packed (current: ${order.status})`);
  }
  const reasons = by === "customer" ? CUSTOMER_CANCEL_REASONS : ADMIN_CANCEL_REASONS;
  if (!reasons.includes(reason)) {
    throw new Error("A cancellation reason is required");
  }
  order.status = "Cancelled";
  order.cancelReason = reason;
  order.cancelNote = String(note || "").slice(0, 300);
  order.cancelledBy = by === "customer" ? "customer" : "admin";
  const reasonText = `Reason: ${reason}${order.cancelNote ? ` — ${order.cancelNote}` : ""}`;
  order.statusHistory.push({ status: "Cancelled", by, note: reasonText });
  await order.save();
  for (const item of order.items) {
    if (!item.product) continue;
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty, sold: -item.qty } });
    if (item.variantLabel) {
      const vName = item.variantLabel.split(": ")[0];
      const vValue = item.variantLabel.split(": ").slice(1).join(": ");
      await Product.updateOne(
        { _id: item.product, variants: { $elemMatch: { name: vName, value: vValue } } },
        { $inc: { "variants.$[v].stock": item.qty } },
        { arrayFilters: [{ "v.name": vName, "v.value": vValue }] }
      ).catch(() => {});
    }
  }
  onOrderCancelled(order, by); // customer email (+ staff bell for customer cancels)
  return order;
}

export async function setOrderStatus(order, status, by = "admin", { courier = "", trackingId = "" } = {}) {
  const prev = order.status;
  order.status = status;
  let note = `Status updated to ${status}`;
  // Dispatch details ride along with the Shipped transition (and may be
  // corrected while the order is Shipped/Delivered without a status change).
  const c = String(courier || "").trim().slice(0, 60);
  const t = String(trackingId || "").trim().slice(0, 80);
  if (c || t || status === "Shipped") {
    if (c) order.courier = c;
    if (t) order.trackingId = t;
    if (order.courier || order.trackingId) note += ` — ${order.courier || "Courier"} ${order.trackingId || ""}`.trimEnd();
  }
  order.statusHistory.push({ status, by, note });
  if (status === "Delivered" && order.paymentMethod === "COD") order.paymentStatus = "Paid";
  // First delivery: invite the customer to review what they received
  // (email only, sent after the save below; failures never block the
  // status update, and the stamp is only set when an email actually went
  // out, so a later save can still deliver it after a transient failure).
  const sendReviewInvite = status === "Delivered" && prev !== "Delivered" && !order.reviewEmailSentAt;
  if (sendReviewInvite) order.reviewEmailSentAt = new Date();
  // A returned parcel goes back on the shelf (unless it already came back
  // once — moving within Returned must not double-restock).
  if (status === "Returned" && prev !== "Returned") {
    for (const item of order.items) {
      if (!item.product) continue;
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty, sold: -item.qty } });
      if (item.variantLabel) {
        const vName = item.variantLabel.split(": ")[0];
        const vValue = item.variantLabel.split(": ").slice(1).join(": ");
        await Product.updateOne(
          { _id: item.product, variants: { $elemMatch: { name: vName, value: vValue } } },
          { $inc: { "variants.$[v].stock": item.qty } },
          { arrayFilters: [{ "v.name": vName, "v.value": vValue }] }
        ).catch(() => {});
      }
    }
  }
  await order.save();
  if (status === "Shipped" && prev !== "Shipped") onOrderShipped(order); // customer "on its way" email + push
  if (status === "Delivered" && prev !== "Delivered") onOrderDelivered(order); // customer push
  if (sendReviewInvite) {
    try { await sendDeliveredReviewInvite(order); }
    catch { /* the invite is best-effort; delivery state is already saved */ }
  }
  return order;
}

// "Your order was delivered — please review it" email. Only customers with
// a REAL email get one: phone-method accounts carry a synthetic
// …@malac.local placeholder that must never be mailed. Each purchased
// product links straight to its page's review section.
async function sendDeliveredReviewInvite(order) {
  const user = await User.findById(order.user).select("name email");
  const email = user?.email || "";
  if (!email || email.endsWith("@malac.local")) return;
  const productIds = [...new Set((order.items || []).filter((i) => i.product).map((i) => String(i.product)))];
  const products = await Product.find({ _id: { $in: productIds } }).select("title slug");
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const base = String(env.clientUrl || "").replace(/\/$/, "");
  const seen = new Set();
  const items = [];
  for (const item of order.items || []) {
    const p = item.product ? byId.get(String(item.product)) : null;
    if (!p || seen.has(p.slug)) continue;
    seen.add(p.slug);
    items.push({ title: p.title, url: `${base}/product/${p.slug}#reviews` });
  }
  if (!items.length) return;
  const { html, text } = reviewInviteEmail({ name: user?.name, orderId: order.orderId, items });
  await sendStoreEmail({ to: email, subject: `Your MALAC order ${order.orderId} was delivered — review your purchase`, html, text });
}
