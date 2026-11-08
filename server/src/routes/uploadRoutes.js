import { Router } from "express";
import { protect, isStaff } from "../middleware/auth.js";
import { uploadPaymentScreenshot, uploadCatalogImage, uploadReviewImages, verifyImageMagicBytes, verifyReviewImageBuffers } from "../middleware/upload.js";
import { paymentScreenshot, catalogImage, reviewImages } from "../controllers/uploadController.js";

const router = Router();
// Both upload paths verify the stored file's magic bytes after multer:
// the declared mimetype alone is forgeable (see middleware/upload.js).
router.post("/payment-screenshot", protect, uploadPaymentScreenshot.single("screenshot"), verifyImageMagicBytes, paymentScreenshot);
// Catalog images are staff-managed content: customers must not be able to
// upload them, so this route adds the isStaff guard on top of protect.
router.post("/catalog-image", protect, isStaff, uploadCatalogImage.single("image"), verifyImageMagicBytes, catalogImage);
// Review photos: any signed-in customer, up to 3 per review; returned as
// data URIs for the client to attach to its review submission.
router.post("/review-images", protect, uploadReviewImages.array("images", 3), verifyReviewImageBuffers, reviewImages);
export default router;
