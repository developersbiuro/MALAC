import { Router } from "express";
import { protect, isStaff, isSuperAdmin } from "../middleware/auth.js";
import * as admin from "../controllers/adminController.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
router.use(protect, isStaff); // whole /admin API requires staff
router.get("/analytics", admin.analytics);
router.get("/orders", orders.adminListOrders);
router.get("/orders/:id", orders.adminGetOrder);
router.patch("/orders/:id/status", orders.adminUpdateStatus);
// Payment verification is a billing action: Super Admin only.
// (Vice-Admin can update fulfillment status but cannot verify/reject payments.)
router.patch("/orders/:id/payment-verification", isSuperAdmin, orders.adminVerifyPayment);
router.get("/users", admin.listUsers);
// Super Admin only: role assignment + settings (Vice-Admin is blocked here)
router.patch("/users/:id/role", isSuperAdmin, admin.updateUserRole);
router.get("/settings", isSuperAdmin, admin.getSettings);
router.put("/settings", isSuperAdmin, admin.updateSettings);
export default router;
