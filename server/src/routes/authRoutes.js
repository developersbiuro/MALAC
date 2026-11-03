import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";

const router = Router();
// Sign-up is ONE-method (Daraz-style): start sends a single OTP on the
// chosen channel (email, or WhatsApp for phone); verify creates the account.
router.post("/signup/start", auth.signupStart);
router.post("/signup/verify", auth.signupVerify);
router.post("/login/otp", auth.loginOtp);
router.post("/login/verify", auth.loginVerify);
router.post("/login/password", auth.loginPassword); // staff only (controller-enforced)
router.post("/login/customer-password", auth.loginCustomerPassword); // customers only; staff refused
// Forgot password (staff): request -> Super Admin approval -> emailed token.
// The owner (SUPER_ADMIN_EMAIL) completes his own reset with an email OTP.
router.post("/password-reset/request", auth.requestPasswordReset);
router.post("/password-reset/owner/verify", auth.verifyOwnerPasswordReset);
router.post("/password-reset/complete", auth.completePasswordReset);
// Forgot password (customers): self-service emailed reset link — no
// approval gate (inbox ownership is the proof). Generic responses only.
router.post("/password/forgot", auth.forgotCustomerPassword);
router.post("/password/reset", auth.resetCustomerPassword);
router.post("/google", auth.googleLogin);
router.get("/me", protect, auth.me);
router.put("/me", protect, auth.updateProfile);
router.put("/me/password", protect, auth.changePassword);
router.post("/addresses", protect, auth.addAddress);
router.put("/addresses/:addressId", protect, auth.updateAddress);
router.delete("/addresses/:addressId", protect, auth.deleteAddress);
export default router;
