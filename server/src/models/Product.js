import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },           // e.g. "Color" or "Size"
  value: { type: String, required: true },          // e.g. "Black" or "XL"
  priceDelta: { type: Number, default: 0 },         // added to sale/base price
  stock: { type: Number, default: 0 },
}, { _id: true });

const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  askedBy: String,
  answer: String,
  answeredBy: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  images: [{ type: String }],
  category: { type: String, required: true },
  subCategory: { type: String, default: "" },
  basePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 }, // 0 = no sale
  stock: { type: Number, default: 0, min: 0 },
  // Pack/unit the price buys: unitQty + unit — e.g. 1 Pc, 2 Pc,
  // 500 ml, 1 kg. Set per product in the admin form.
  unit: { type: String, default: "Pc" },
  unitQty: { type: Number, default: 1, min: 0 },
  sku: { type: String, required: true, unique: true, uppercase: true },
  variants: [variantSchema],
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ["Active", "Draft", "Out of Stock", "Archived"],
    default: "Active",
  },
  flashSale: { type: Boolean, default: false },
  flashSaleEndsAt: Date,
  sold: { type: Number, default: 0 },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  ratingBreakdown: {
    5: { type: Number, default: 0 }, 4: { type: Number, default: 0 },
    3: { type: Number, default: 0 }, 2: { type: Number, default: 0 },
    1: { type: Number, default: 0 },
  },
  questions: [qaSchema],
  shippingFee: { type: Number, default: 199 },
  codAvailable: { type: Boolean, default: true },
}, { timestamps: true });

// Search + catalog indexes
productSchema.index({ sku: 1 });
productSchema.index({ title: "text", tags: "text", category: 1 });
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ salePrice: 1, basePrice: 1 });

productSchema.virtual("effectivePrice").get(function () {
  return this.salePrice > 0 ? this.salePrice : this.basePrice;
});
productSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Product", productSchema);
