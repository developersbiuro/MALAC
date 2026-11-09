import { Router } from "express";
import { protect, isStaff, requirePermission } from "../middleware/auth.js";
import * as coupons from "../controllers/couponController.js";

const router = Router();
router.get("/validate/:code", protect, coupons.validate);
// Coupon management is gated by the "coupons" permission (the Super
// Admin has it always; a Vice-Admin only when granted in Roles & Users).
router.get("/", protect, isStaff, requirePermission("coupons"), coupons.listCoupons);
router.post("/", protect, isStaff, requirePermission("coupons"), coupons.createCoupon);
router.put("/:id", protect, isStaff, requirePermission("coupons"), coupons.updateCoupon);
router.delete("/:id", protect, isStaff, requirePermission("coupons"), coupons.deleteCoupon);
export default router;
