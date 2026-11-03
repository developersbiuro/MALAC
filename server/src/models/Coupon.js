import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true, min: 0 }, // % off or Rs. off
  minSpend: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },        // 0 = uncapped (percentage only)
  expiresAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 0 },         // 0 = unlimited
  usedCount: { type: Number, default: 0 },
}, { timestamps: true });

couponSchema.methods.isValidFor = function (subtotal) {
  if (!this.active) return { valid: false, reason: "Coupon is inactive" };
  if (this.expiresAt < new Date()) return { valid: false, reason: "Coupon has expired" };
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit)
    return { valid: false, reason: "Coupon usage limit reached" };
  if (subtotal < this.minSpend)
    return { valid: false, reason: `Minimum spend is Rs. ${this.minSpend}` };
  let discount = this.type === "percentage"
    ? Math.round((subtotal * this.value) / 100) : this.value;
  if (this.type === "percentage" && this.maxDiscount > 0)
    discount = Math.min(discount, this.maxDiscount);
  return { valid: true, discount: Math.min(discount, subtotal) };
};

export default mongoose.model("Coupon", couponSchema);
