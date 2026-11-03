import mongoose from "mongoose";

export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
export const PAYMENT_METHODS = ["COD", "Card", "JazzCash", "Easypaisa"];
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
  // Manual wallet payments (JazzCash / Easypaisa): the customer transfers to
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
  status: { type: String, enum: ORDER_STATUSES, default: "Pending", index: true },
  statusHistory: [statusEntrySchema],
  address: {
    fullName: String, phone: String, city: String,
    area: String, street: String, postalCode: String,
    // Live-location pin snapshot (copied from the delivery address when
    // the customer ordered with "Use My Live Location"); shown to staff
    // in the admin order detail as a maps link for the rider.
    lat: Number, lng: Number, mapsUrl: String,
  },
  estimatedDelivery: Date,
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
