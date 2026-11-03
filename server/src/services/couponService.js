import Coupon from "../models/Coupon.js";

export async function validateCoupon(code, subtotal) {
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon) return { valid: false, reason: "Coupon not found", discount: 0 };
  const result = coupon.isValidFor(Number(subtotal) || 0);
  return { ...result, coupon, discount: result.valid ? result.discount : 0 };
}

export async function redeemCoupon(coupon) {
  coupon.usedCount += 1;
  await coupon.save();
}
