import mongoose from "mongoose";

export const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"];
// Customer-facing stages collapse Confirmed + Packed into "Processing"
// (that is what shoppers already see on My Orders / Track Order / the
// chatbot): the storefront translates with this helper, and the public
// track endpoint maps the internal status through it.
export const CUSTOMER_STATUS = (status) =>
  (status === "Confirmed" || status === "Packed" ? "Processing" : status);
// Cancellation reasons (Daraz-style). Cancelling REQUIRES one of these —
// validated server-side per actor (customer self-cancel vs staff cancel).
export const CUSTOMER_CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery is taking too long",
  "Need to change address or items",
  "Payment issue",
  "Other",
];
export const ADMIN_CANCEL_REASONS = [
  "Out of stock",
  "Customer requested",
  "Payment not verified",
  "Customer unreachable",
  "Duplicate order",
  "Suspected fake order",
  "Other",
];
export const COURIERS = ["TCS", "Leopards", "Trax", "PostEx", "Other"];
// Customer return-request reasons (delivered orders only; the store's
// returns policy — 7 days, damaged/defective/incorrect — is stated on
// the request panel and in the confirmation email).
export const RETURN_REASONS = [
  "Damaged item received",
  "Defective / not working",
  "Wrong item delivered",
  "Wrong size or colour",
  "Missing parts or accessories",
  "Other",
];
export const PAYMENT_METHODS = ["COD", "JazzCash", "Easypaisa", "Meezan Bank", "NayaPay", "SadaPay", "FirstPay — HBL Microfinance Bank"];
// Manual-transfer methods: the customer sends money to a store account
// and uploads the screenshot + transaction details for staff
// verification. Meezan Bank receives direct bank transfers; NayaPay,
// SadaPay and FirstPay — HBL Microfinance Bank pay the owner's wallet number 03036253428 —
// the same number as JazzCash / Easypaisa (owner, 2026-11-09).
export const MANUAL_PAYMENT_METHODS = ["JazzCash", "Easypaisa", "Meezan Bank", "NayaPay", "SadaPay", "FirstPay — HBL Microfinance Bank"];
export const PAYMENT_VERIFICATION_STATUSES =
  ["not_applicable", "pending_verification", "verified", "rejected"];

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  title: String,
  image: String,
  sku: String,
  variantLabel: { type: String, default: "" },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
}, { _id: true });

const statusEntrySchema = new mongoose.Schema({
  status: { type: String, enum: ORDER_STATUSES },
  at: { type: Date, default: Date.now },
  by: String,
  note: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, default: "" },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "COD" },
  paymentStatus: { type: String, enum: ["Unpaid", "Paid", "Refunded"], default: "Unpaid" },
  // Manual payments (wallets + Meezan bank transfer): the customer transfers to
  // the store account, uploads a screenshot and gives transaction details.
  paymentScreenshot: { type: String, default: "" },   // e.g. /uploads/payment-screenshots/<file>
  transactionId: { type: String, default: "" },
  senderAccount: { type: String, default: "" },       // customer's wallet account number
  senderTitle: { type: String, default: "" },         // customer's wallet account title/name
  paymentVerificationStatus: {
    type: String, enum: PAYMENT_VERIFICATION_STATUSES, default: "not_applicable", index: true,
  },
  paymentVerificationNote: { type: String, default: "" },
  paymentVerifiedBy: { type: String, default: "" },
  paymentVerifiedAt: Date,
  deliveryMethod: { type: String, enum: ["Standard", "Express"], default: "Standard" },
  // Dispatch details, set by staff when the parcel is handed to a courier.
  courier: { type: String, default: "" },
  trackingId: { type: String, default: "" },
  // Cancellation record (reason is required to cancel — see the cancel
  // reason lists above; validated in orderService.cancelOrder).
  cancelReason: { type: String, default: "" },
  cancelNote: { type: String, default: "" },
  cancelledBy: { type: String, enum: ["", "customer", "admin"], default: "" },
  // Customer return request (delivered orders): the request is recorded
  // on the order, staff are notified, and staff complete the return by
  // moving the order to "Returned" once the parcel comes back.
  returnRequestedAt: { type: Date },
  returnReason: { type: String, default: "" },
  returnNote: { type: String, default: "" },
  // Set once when the "your order was delivered — please review" email goes
  // out (first transition into Delivered), so status re-saves never re-send.
  reviewEmailSentAt: { type: Date },
  status: { type: String, enum: ORDER_STATUSES, default: "Pending", index: true },
  statusHistory: [statusEntrySchema],
  address: {
    fullName: String, phone: String, province: String, city: String,
    area: String, street: String, postalCode: String,
    // Live-location pin snapshot (copied from the delivery address when
    // the customer ordered with "Use My Live Location"); shown to staff
    // in the admin order detail as a maps link for the rider.
    lat: Number, lng: Number, mapsUrl: String,
  },
  estimatedDelivery: Date,
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
