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
router.post("/google", auth.googleLogin);
router.get("/me", protect, auth.me);
router.post("/addresses", protect, auth.addAddress);
export default router;
