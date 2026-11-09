import mongoose from "mongoose";

// Staff notifications (Daraz-style bell in the admin panel + admin app).
// Created by order events: a customer placing an order, cancelling one,
// or requesting a return. "read" is a single shared flag — the store has
// one small staff team working one queue, like the review-moderation list.
// Records are never deleted by the app (the owner's data-retention rule:
// customer/order history stays), they only get marked read.
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["order_placed", "order_cancelled", "return_requested", "support_ticket", "chat_takeover"],
    required: true,
    index: true,
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  orderId: { type: String, default: "" }, // human ID (MLC-XXXXXX) for display
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: "SupportTicket" },
  ticketId: { type: String, default: "" }, // human ID (TKT-XXXXXX) for display
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
