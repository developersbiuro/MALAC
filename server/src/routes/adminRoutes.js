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
// Super Admin only: staff creation + role assignment + reset approvals.
// Creating staff (Vice-Admins) exists ONLY here, inside the panel —
// there is no public admin registration. (Vice-Admin is blocked from all
// of these by isSuperAdmin.)
router.post("/users", isSuperAdmin, admin.createViceAdmin);
router.patch("/users/:id/role", isSuperAdmin, admin.updateUserRole);
router.get("/password-resets", isSuperAdmin, admin.listPasswordResets);
router.patch("/password-resets/:id/approve", isSuperAdmin, admin.approvePasswordReset);
router.patch("/password-resets/:id/reject", isSuperAdmin, admin.rejectPasswordReset);
router.get("/settings", isSuperAdmin, admin.getSettings);
router.put("/settings", isSuperAdmin, admin.updateSettings);
export default router;
