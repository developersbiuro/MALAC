import { Router } from "express";
import { protect, isStaff } from "../middleware/auth.js";
import { uploadPaymentScreenshot, uploadCatalogImage } from "../middleware/upload.js";
import { paymentScreenshot, catalogImage } from "../controllers/uploadController.js";

const router = Router();
router.post("/payment-screenshot", protect, uploadPaymentScreenshot.single("screenshot"), paymentScreenshot);
// Catalog images are staff-managed content: customers must not be able to
// upload them, so this route adds the isStaff guard on top of protect.
router.post("/catalog-image", protect, isStaff, uploadCatalogImage.single("image"), catalogImage);
export default router;
