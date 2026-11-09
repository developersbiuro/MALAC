import mongoose from "mongoose";
import crypto from "node:crypto";

// Customer support ticket raised from the MALAC Assistant (returns,
// exchanges, refund inquiries, damaged / wrong / missing-item and
// delivery complaints, general support). Created by the customer in
// chat; decided ONLY by staff in the admin panel — the bot never
// approves a return or refund itself (master-prompt §7).
//
// Distinct from Order.returnReason (the quick return flag on a single
// delivered order): a ticket is the full support case, with its own
// human ID (TKT-XXXXXX), a status workflow and a staff reply thread.
// Records are never deleted by the app (owner's data-retention rule).
const ticketReplySchema = new mongoose.Schema({
  by: { type: String, enum: ["customer", "staff"], required: true },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, index: true },
  type: {
    type: String,
    enum: ["return", "exchange", "refund", "damaged", "wrong_item", "missing_item", "delivery_issue", "general"],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Under Review", "Approved", "Rejected", "Resolved"],
    default: "Pending",
    index: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  orderId: { type: String, default: "" }, // human order ID (MLC-XXXXXX) when relevant
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  description: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  replies: { type: [ticketReplySchema], default: [] },
}, { timestamps: true });

supportTicketSchema.pre("validate", function (next) {
  if (!this.ticketId) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
    let code = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
    this.ticketId = `TKT-${code}`;
  }
  next();
});

export default mongoose.model("SupportTicket", supportTicketSchema);
