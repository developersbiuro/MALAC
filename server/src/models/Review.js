import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, default: "MALAC Customer" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  images: [{ type: String }],
  verifiedPurchase: { type: Boolean, default: false },
  // Order link (Daraz-style, owner's ask 2026-11-12): a review given
  // from a delivered order is saved WITH that order, so "To Review"
  // knows exactly which purchase was reviewed and the admin sees the
  // order next to the review. orderId is the public MLC- code.
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
  orderId: { type: String, default: "" },
  // Moderation (Abdullah, 2026-11-07): every review needs admin approval
  // before it is public — no defamation surprises. New reviews start
  // "pending". Documents created before this field existed have no status
  // and stay public: all public queries use status $nin ["pending",
  // "rejected"], which matches a missing field too.
  status: { type: String, enum: ["pending", "approved", "rejected"], index: true },
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
