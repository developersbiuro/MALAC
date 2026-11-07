import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, default: "MALAC Customer" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  images: [{ type: String }],
  verifiedPurchase: { type: Boolean, default: false },
  // Moderation (Abdullah, 2026-11-07): every review needs admin approval
  // before it is public — no defamation surprises. New reviews start
  // "pending". Documents created before this field existed have no status
  // and stay public: all public queries use status $nin ["pending",
  // "rejected"], which matches a missing field too.
  status: { type: String, enum: ["pending", "approved", "rejected"], index: true },
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
