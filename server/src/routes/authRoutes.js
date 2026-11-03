import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";

const router = Router();
router.post("/signup/email-otp", auth.signupEmailOtp);
router.post("/signup/verify-email", auth.signupVerifyEmail);
router.post("/signup/phone-otp", auth.signupPhoneOtp);
router.post("/signup/verify-phone", auth.signupVerifyPhone);
router.post("/login/otp", auth.loginOtp);
router.post("/login/verify", auth.loginVerify);
router.post("/login/password", auth.loginPassword); // staff only (controller-enforced)
// Forgot password (staff): request -> Super Admin approval -> emailed token.
// The owner (SUPER_ADMIN_EMAIL) completes his own reset with an email OTP.
router.post("/password-reset/request", auth.requestPasswordReset);
router.post("/password-reset/owner/verify", auth.verifyOwnerPasswordReset);
router.post("/password-reset/complete", auth.completePasswordReset);
router.post("/google", auth.googleLogin);
router.get("/me", protect, auth.me);
router.post("/addresses", protect, auth.addAddress);
export default router;
