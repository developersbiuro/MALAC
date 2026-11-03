import { Router } from "express";
import { publicSettings } from "../controllers/adminController.js";

const router = Router();
// Public, safe subset: payment methods + store wallet accounts for checkout.
router.get("/public", publicSettings);
export default router;
