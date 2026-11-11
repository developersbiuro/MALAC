import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushToStaff, sendPushToUser, sendPushToAllCustomers } from "./pushService.js";
import { sendEmail } from "./emailService.js";
import { orderStatusEmail } from "./emailTemplates.js";

// Order-event side effects, in one place: the customer's lifecycle email
// and the staff bell notification. EVERYTHING here is best-effort — a
// mail or notification failure must never fail or delay the order action
// itself, so callers fire-and-forget and errors are swallowed after a log.

// Order mail goes to the email the customer gave at CHECKOUT for this
// order (required since 2026-11-11) — that is how phone-signup customers
// get order mail too. The account email is only a fallback for older
// orders, and a synthetic …@malac.local placeholder must never be
// mailed (the same rule the delivered review-invite already follows).
async function customerEmailOf(order) {
  const user = await User.findById(order.user).select("name email");
  const orderEmail = String(order?.address?.email || "").trim();
  if (orderEmail && !orderEmail.endsWith("@malac.local")) {
    return { email: orderEmail, name: user?.name || order.address?.fullName || "Customer" };
  }
  const email = user?.email || "";
  if (!email || email.endsWith("@malac.local")) return null;
  return { email, name: user?.name || "Customer" };
}

const PUSH_TITLES = {
  order_placed: "MALAC — Naya Order",
  order_cancelled: "MALAC — Order Cancelled",
  order_delivered: "MALAC — Order Delivered",
  return_requested: "MALAC — Return Request",
  support_ticket: "MALAC — Support Ticket",
  chat_takeover: "MALAC — Chat Message",
};

// Display name for notifications: the name on the order's delivery
// address is the name the customer ordered as; fall back to the
// account name. Staff pushes carry the customer's name (Daraz-style:
// "new order — <customer>"), and customer pushes greet by first name.
async function customerNameOf(order) {
  const fromAddress = (order.address?.fullName || "").trim();
  if (fromAddress) return fromAddress;
  try {
    const user = await User.findById(order.user).select("name").lean();
    return (user?.name || "").trim() || "Customer";
  } catch {
    return "Customer";
  }
}
const firstNameOf = (name) => (name || "Customer").trim().split(/\s+/)[0];

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

export async function onOrderPlaced(order) {
  const name = await customerNameOf(order);
  pushCustomer(order, "MALAC — Order confirm ho gaya",
    `Shukriya ${firstNameOf(name)}! Aap ka order ${order.orderId} place ho gaya hai — Rs. ${Number(order.total).toLocaleString("en-PK")}. Hum jald confirm karke ship kar dein ge.`);
  notifyStaff("order_placed", order,
    `Naya order ${order.orderId} — ${name} · Rs. ${Number(order.total).toLocaleString("en-PK")} · ${order.paymentMethod}`);
  mailCustomer(order, {
    subject: `MALAC order confirmed — ${order.orderId}`,
    heading: "Thank you — your order is confirmed",
    intro: `your order <strong style="color:#0f172a;">${order.orderId}</strong> has been placed successfully. We will call or message you if anything needs confirming, and email you again when it ships.`,
  });
}

export async function onOrderCancelled(order, by) {
  const name = await customerNameOf(order);
  pushCustomer(order, "MALAC — Order cancelled",
    `${firstNameOf(name)}, aap ka order ${order.orderId} cancel ho gaya hai${order.cancelReason ? ` (${order.cancelReason})` : ""}.`);
  if (by === "customer") {
    notifyStaff("order_cancelled", order,
      `Order ${order.orderId} — ${name} ne cancel kar diya — ${order.cancelReason || "no reason given"}`);
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

export async function onOrderShipped(order) {
  const name = await customerNameOf(order);
  pushCustomer(order, "MALAC — Order ship ho gaya",
    `${firstNameOf(name)}, aap ka order ${order.orderId} rawaana ho gaya hai${order.courier ? ` via ${order.courier}` : ""}${order.trackingId ? ` — tracking ${order.trackingId}` : ""}.`);
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

export async function onOrderDelivered(order) {
  const name = await customerNameOf(order);
  pushCustomer(order, "MALAC — Order deliver ho gaya",
    `${firstNameOf(name)}, aap ka order ${order.orderId} deliver ho gaya hai. Shopping ke liye shukriya! Apna review zaroor dein.`);
  // Staff hear about deliveries too (owner's rule) — bell + admin push.
  notifyStaff("order_delivered", order,
    `Order ${order.orderId} delivered — ${name} · Rs. ${Number(order.total).toLocaleString("en-PK")}`);
}

export async function onReturnRequested(order) {
  const name = await customerNameOf(order);
  notifyStaff("return_requested", order,
    `Return request — ${name} · order ${order.orderId} — ${order.returnReason || "no reason given"}`);
  mailCustomer(order, {
    subject: `MALAC return request received — ${order.orderId}`,
    heading: "We received your return request",
    intro: `your return request for order <strong style="color:#0f172a;">${order.orderId}</strong> has been received. Our team will contact you on WhatsApp or email to arrange the return.`,
    extra: "As a reminder, returns are accepted within 7 days of delivery for damaged, defective or incorrect items, unused and in their original packaging.",
  });
}

// --- Catalogue broadcasts to every customer app (owner's rule) --------
// New products and flash sales are announced to all registered customer
// devices. Best-effort like everything here: a broadcast failure must
// never fail the product save that triggered it.
const effectivePrice = (p) => (p.salePrice > 0 ? p.salePrice : p.basePrice);
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

export function onProductCreated(product) {
  if (!product || product.status !== "Active") return;
  sendPushToAllCustomers({
    title: "MALAC — Naya Product aa gaya 🛍️",
    body: `${product.title} — ${rs(effectivePrice(product))}. Abhi app mein dekhein!`,
    data: { type: "product", slug: product.slug || "" },
  }).catch(() => {});
}

export function onFlashSaleStarted(product) {
  if (!product || product.status !== "Active") return;
  const now = effectivePrice(product);
  const was = product.basePrice;
  sendPushToAllCustomers({
    title: "MALAC — ⚡ Flash Sale shuru!",
    body: was > now
      ? `${product.title} ab sirf ${rs(now)} (pehle ${rs(was)}) — waqt mehdood hai!`
      : `${product.title} Flash Sale mein aa gaya hai — sirf ${rs(now)}!`,
    data: { type: "flash_sale", slug: product.slug || "" },
  }).catch(() => {});
}
