import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { rateLimit, ipKey, identifierKey } from "../middleware/rateLimit.js";
import * as auth from "../controllers/authController.js";

const router = Router();

// -- Brute-force / abuse limits (middleware/rateLimit.js) --
// Limits are set generously per IP because many Pakistani customers sit
// behind carrier-grade NAT and share one public IP; the strict controls
// are the PER-IDENTIFIER limits and the per-account lockout
// (utils/loginGuard.js). Exceeding any limit answers 429 with a generic
// message — it never reveals whether an account exists.
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
router.use(rateLimit({ windowMs: 15 * MIN, max: 300, key: ipKey })); // backstop for the whole router
const otpSend = [
  rateLimit({ windowMs: HOUR, max: 60, key: ipKey }),
  rateLimit({ windowMs: HOUR, max: 5, key: identifierKey }),
];
const otpVerify = [
  rateLimit({ windowMs: 15 * MIN, max: 100, key: ipKey }),
  rateLimit({ windowMs: 15 * MIN, max: 20, key: identifierKey }),
];
const passwordLogin = [
  rateLimit({ windowMs: 15 * MIN, max: 60, key: ipKey }),
  rateLimit({ windowMs: 15 * MIN, max: 20, key: identifierKey }),
];
const resetRequest = [
  rateLimit({ windowMs: HOUR, max: 30, key: ipKey }),
  rateLimit({ windowMs: HOUR, max: 5, key: identifierKey }),
];
const resetComplete = [rateLimit({ windowMs: 15 * MIN, max: 30, key: ipKey })];

// Sign-up is ONE-method (Daraz-style): start sends a single OTP on the
// chosen channel (email, or WhatsApp for phone); verify creates the account.
router.post("/signup/start", ...otpSend, auth.signupStart);
router.post("/signup/verify", ...otpVerify, auth.signupVerify);
router.post("/login/otp", ...otpSend, auth.loginOtp);
router.post("/login/verify", ...otpVerify, auth.loginVerify);
router.post("/login/password", ...passwordLogin, auth.loginPassword); // staff only (controller-enforced)
router.post("/login/customer-password", ...passwordLogin, auth.loginCustomerPassword); // customers only; staff refused
// Forgot password (staff): request -> Super Admin approval -> emailed token.
// The owner (SUPER_ADMIN_EMAIL) completes his own reset with an email OTP.
router.post("/password-reset/request", ...resetRequest, auth.requestPasswordReset);
router.post("/password-reset/owner/verify", ...otpVerify, auth.verifyOwnerPasswordReset);
router.post("/password-reset/complete", ...resetComplete, auth.completePasswordReset);
// Forgot password (customers): self-service emailed reset link — no
// approval gate (inbox ownership is the proof). Generic responses only.
router.post("/password/forgot", ...resetRequest, auth.forgotCustomerPassword);
router.post("/password/reset", ...resetComplete, auth.resetCustomerPassword);
router.post("/google", rateLimit({ windowMs: 15 * MIN, max: 60, key: ipKey }), auth.googleLogin);
router.get("/me", protect, auth.me);
router.put("/me", protect, auth.updateProfile);
router.put("/me/password", protect, auth.changePassword);
router.post("/addresses", protect, auth.addAddress);
router.put("/addresses/:addressId", protect, auth.updateAddress);
router.delete("/addresses/:addressId", protect, auth.deleteAddress);
export default router;
