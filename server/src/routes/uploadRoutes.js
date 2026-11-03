import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { uploadPaymentScreenshot } from "../middleware/upload.js";
import { paymentScreenshot } from "../controllers/uploadController.js";

const router = Router();
router.post("/payment-screenshot", protect, uploadPaymentScreenshot.single("screenshot"), paymentScreenshot);
export default router;
