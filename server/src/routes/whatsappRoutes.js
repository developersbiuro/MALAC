import { Router } from "express";
import { protect, isSuperAdmin } from "../middleware/auth.js";
import { embeddedSignup } from "../controllers/whatsappController.js";

const router = Router();
// One-off operator onboarding, NOT a customer/staff feature: the
// handler returns a live Meta access token, so it is restricted to
// the Super Admin (the owner). The owner signs in at /admin first,
// then opens /whatsapp-connect.html, which sends the stored token.
router.post("/embedded-signup", protect, isSuperAdmin, embeddedSignup);
export default router;
