import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, default: "MALAC Customer" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  images: [{ type: String }],
  verifiedPurchase: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
