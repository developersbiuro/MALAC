import { Router } from "express";
import { protect, isSuperAdmin } from "../middleware/auth.js";
import * as coupons from "../controllers/couponController.js";

const router = Router();
router.get("/validate/:code", coupons.validate);
// Coupon creation/management is Super Admin only (per MALAC RBAC spec)
router.get("/", protect, isSuperAdmin, coupons.listCoupons);
router.post("/", protect, isSuperAdmin, coupons.createCoupon);
router.put("/:id", protect, isSuperAdmin, coupons.updateCoupon);
router.delete("/:id", protect, isSuperAdmin, coupons.deleteCoupon);
export default router;
