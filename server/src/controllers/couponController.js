import Coupon from "../models/Coupon.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateCoupon } from "../services/couponService.js";

export const validate = asyncHandler(async (req, res) => {
  const result = await validateCoupon(req.params.code, req.query.subtotal);
  res.json({
    valid: result.valid, reason: result.reason || "",
    discount: result.discount || 0,
    code: result.coupon?.code || req.params.code,
  });
});

export const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: String(req.body.code).toUpperCase() });
  res.status(201).json({ coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ message: "Coupon deleted" });
});
