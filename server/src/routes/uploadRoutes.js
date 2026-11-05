import { Router } from "express";
import { protect, isStaff } from "../middleware/auth.js";
import { uploadPaymentScreenshot, uploadCatalogImage, verifyImageMagicBytes } from "../middleware/upload.js";
import { paymentScreenshot, catalogImage } from "../controllers/uploadController.js";

const router = Router();
// Both upload paths verify the stored file's magic bytes after multer:
// the declared mimetype alone is forgeable (see middleware/upload.js).
router.post("/payment-screenshot", protect, uploadPaymentScreenshot.single("screenshot"), verifyImageMagicBytes, paymentScreenshot);
// Catalog images are staff-managed content: customers must not be able to
// upload them, so this route adds the isStaff guard on top of protect.
router.post("/catalog-image", protect, isStaff, uploadCatalogImage.single("image"), verifyImageMagicBytes, catalogImage);
export default router;
