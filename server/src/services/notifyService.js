import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushToStaff, sendPushToUser } from "./pushService.js";
import { sendEmail } from "./emailService.js";
import { orderStatusEmail } from "./emailTemplates.js";

// Order-event side effects, in one place: the customer's lifecycle email
// and the staff bell notification. EVERYTHING here is best-effort — a
// mail or notification failure must never fail or delay the order action
// itself, so callers fire-and-forget and errors are swallowed after a log.

// Only customers with a REAL email can be mailed: phone-method accounts
// carry a synthetic …@malac.local placeholder that must never be mailed
// (the same rule the delivered review-invite already follows).
async function customerEmailOf(order) {
  const user = await User.findById(order.user).select("name email");
  const email = user?.email || "";
  if (!email || email.endsWith("@malac.local")) return null;
  return { email, name: user?.name || "Customer" };
}

const PUSH_TITLES = {
  order_placed: "MALAC — Naya Order",
  order_cancelled: "MALAC — Order Cancelled",
  return_requested: "MALAC — Return Request",
  support_ticket: "MALAC — Support Ticket",
  chat_takeover: "MALAC — Chat Message",
};

export async function notifyStaff(type, order, message) {
  try {
    await Notification.create({ type, order: order._id, orderId: order.orderId, message });
  } catch (err) {
    console.error(`[MALAC] staff notification failed (${type}): ${err.message}`);
  }
  // Real phone push alongside the in-panel bell (best-effort, never blocks).
  sendPushToStaff({
    title: PUSH_TITLES[type] || "MALAC",
    body: message,
    data: { type, orderId: order.orderId || "" },
  }).catch(() => {});
}

async function mailCustomer(order, build) {
  try {
    const target = await customerEmailOf(order);
    if (!target) return;
    const { subject, heading, intro, extra } = build;
    const { html, text } = orderStatusEmail({
      name: target.name, orderId: order.orderId, heading, intro, extra,
      items: order.items || [], total: order.total,
    });
    await sendEmail({ to: target.email, subject, html, text });
  } catch (err) {
    console.error(`[MALAC] order email failed (${order.orderId}): ${err.message}`);
  }
}

function pushCustomer(order, title, body) {
  sendPushToUser(order.user, { title, body, data: { orderId: order.orderId || "" } }).catch(() => {});
}

export function onOrderPlaced(order) {
  pushCustomer(order, "MALAC — Order confirm ho gaya",
    `Aap ka order ${order.orderId} place ho gaya hai — Rs. ${Number(order.total).toLocaleString("en-PK")}. Hum jald confirm karke ship kar dein ge.`);
  notifyStaff("order_placed", order,
    `New order ${order.orderId} placed — Rs. ${Number(order.total).toLocaleString("en-PK")} · ${order.paymentMethod}`);
  mailCustomer(order, {
    subject: `MALAC order confirmed — ${order.orderId}`,
    heading: "Thank you — your order is confirmed",
    intro: `your order <strong style="color:#0f172a;">${order.orderId}</strong> has been placed successfully. We will call or message you if anything needs confirming, and email you again when it ships.`,
  });
}

export function onOrderCancelled(order, by) {
  pushCustomer(order, "MALAC — Order cancelled",
    `Aap ka order ${order.orderId} cancel ho gaya hai${order.cancelReason ? ` (${order.cancelReason})` : ""}.`);
  if (by === "customer") {
    notifyStaff("order_cancelled", order,
      `Order ${order.orderId} cancelled by the customer — ${order.cancelReason || "no reason given"}`);
  }
  mailCustomer(order, {
    subject: `MALAC order cancelled — ${order.orderId}`,
    heading: "Your order has been cancelled",
    intro: `your order <strong style="color:#0f172a;">${order.orderId}</strong> has been cancelled${order.cancelReason ? ` (${order.cancelReason})` : ""}.`,
    extra: order.paymentMethod === "COD"
      ? "Since this was a Cash on Delivery order, nothing was charged."
      : "If you already paid for this order, your amount will be refunded to the same account after verification.",
  });
}

export function onOrderShipped(order) {
  pushCustomer(order, "MALAC — Order ship ho gaya",
    `Aap ka order ${order.orderId} rawaana ho gaya hai${order.courier ? ` via ${order.courier}` : ""}${order.trackingId ? ` — tracking ${order.trackingId}` : ""}.`);
  const courierLine = order.courier
    ? ` via ${order.courier}${order.trackingId ? ` (tracking ID ${order.trackingId})` : ""}`
    : "";
  mailCustomer(order, {
    subject: `MALAC order shipped — ${order.orderId}`,
    heading: "Your order is on its way",
    intro: `your order <strong style="color:#0f172a;">${order.orderId}</strong> has been shipped${courierLine}.`,
    extra: order.paymentMethod === "COD"
      ? `Please keep Rs. ${Number(order.total).toLocaleString("en-PK")} ready — you pay the courier when your parcel arrives.`
      : undefined,
  });
}

export function onOrderDelivered(order) {
  pushCustomer(order, "MALAC — Order deliver ho gaya",
    `Aap ka order ${order.orderId} deliver ho gaya hai. Shopping ke liye shukriya! Apna review zaroor dein.`);
}

export function onReturnRequested(order) {
  notifyStaff("return_requested", order,
    `Return requested for order ${order.orderId} — ${order.returnReason || "no reason given"}`);
  mailCustomer(order, {
    subject: `MALAC return request received — ${order.orderId}`,
    heading: "We received your return request",
    intro: `your return request for order <strong style="color:#0f172a;">${order.orderId}</strong> has been received. Our team will contact you on WhatsApp or email to arrange the return.`,
    extra: "As a reminder, returns are accepted within 7 days of delivery for damaged, defective or incorrect items, unused and in their original packaging.",
  });
}
