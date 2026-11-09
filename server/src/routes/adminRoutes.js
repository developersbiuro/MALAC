import { Router } from "express";
import { protect, isStaff, isSuperAdmin, requirePermission } from "../middleware/auth.js";
import * as admin from "../controllers/adminController.js";
import * as orders from "../controllers/orderController.js";
import * as chatAdmin from "../controllers/chatAdminController.js";
import * as push from "../controllers/pushController.js";

const router = Router();
router.use(protect, isStaff); // whole /admin API requires staff
router.get("/analytics", admin.analytics);
// Staff notifications (bell in the panel/app): every staff account —
// order events matter to whoever is on duty, whatever their section
// permissions are.
router.get("/notifications", orders.listNotifications);
router.post("/notifications/read", orders.markNotificationsRead);
// Mobile push (FCM) for the Admin app: device registration happens via
// the app's bridge after staff sign-in; test fires a push to all devices.
router.post("/push/register", push.registerPushDevice);
router.post("/push/test", push.testPush);
// Order work is gated by the "orders" permission; the Dashboard
// (analytics) above stays visible to every staff account.
router.get("/orders", requirePermission("orders"), orders.adminListOrders);
router.get("/orders/:id", requirePermission("orders"), orders.adminGetOrder);
router.patch("/orders/:id/status", requirePermission("orders"), orders.adminUpdateStatus);
// Payment verification is a billing action gated by the separate
// "payments" permission: a Vice-Admin with "orders" but not "payments"
// can update fulfillment status but cannot verify/reject payments.
router.patch("/orders/:id/payment-verification", requirePermission("payments"), orders.adminVerifyPayment);
// Review moderation: gated by "products" (reviews belong to the catalogue).
router.get("/reviews", requirePermission("products"), admin.listReviewsAdmin);
router.patch("/reviews/:id/status", requirePermission("products"), admin.setReviewStatus);
router.get("/users", admin.listUsers);
// Super Admin only: staff creation + role assignment + reset approvals +
// per-Vice-Admin access (permissions), verification, setup resend,
// alternate phone and deletion. Creating staff (Vice-Admins) exists ONLY
// here, inside the panel — there is no public admin registration.
// (Vice-Admin is blocked from all of these by isSuperAdmin.)
router.post("/users", isSuperAdmin, admin.createViceAdmin);
router.patch("/users/:id/role", isSuperAdmin, admin.updateUserRole);
router.patch("/users/:id/permissions", isSuperAdmin, admin.updateUserPermissions);
router.patch("/users/:id/verify", isSuperAdmin, admin.verifyUser);
router.post("/users/:id/resend-setup", isSuperAdmin, admin.resendSetupEmail);
router.patch("/users/:id/phones", isSuperAdmin, admin.updateUserPhones);
router.delete("/users/:id", isSuperAdmin, admin.deleteUser);
router.get("/password-resets", isSuperAdmin, admin.listPasswordResets);
router.patch("/password-resets/:id/approve", isSuperAdmin, admin.approvePasswordReset);
router.patch("/password-resets/:id/reject", isSuperAdmin, admin.rejectPasswordReset);
router.get("/settings", isSuperAdmin, admin.getSettings);
router.put("/settings", isSuperAdmin, admin.updateSettings);
// MALAC Assistant management (master-prompt §10): conversations,
// manual replies + takeover, support tickets, chatbot settings/FAQs
// and analytics — gated by the "chatbot" section permission so an
// authorized Vice-Admin can run support without store-settings access.
router.get("/chatbot/analytics", requirePermission("chatbot"), chatAdmin.chatbotAnalytics);
router.get("/chatbot/conversations", requirePermission("chatbot"), chatAdmin.listConversations);
router.get("/chatbot/conversations/:id", requirePermission("chatbot"), chatAdmin.getConversation);
router.post("/chatbot/conversations/:id/reply", requirePermission("chatbot"), chatAdmin.replyConversation);
router.patch("/chatbot/conversations/:id", requirePermission("chatbot"), chatAdmin.setConversationState);
router.get("/chatbot/tickets", requirePermission("chatbot"), chatAdmin.listTickets);
router.patch("/chatbot/tickets/:id", requirePermission("chatbot"), chatAdmin.updateTicket);
router.get("/chatbot/settings", requirePermission("chatbot"), chatAdmin.getChatbotAdmin);
router.put("/chatbot/settings", requirePermission("chatbot"), chatAdmin.updateChatbotAdmin);
export default router;
