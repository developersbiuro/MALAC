import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/uploads/payment-screenshot (login required)
// Returns the stored path, which the client then sends with the order.
export const paymentScreenshot = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file received" });
  res.status(201).json({
    path: `/uploads/payment-screenshots/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// POST /api/uploads/review-images (login required, up to 3 files)
// Review photos are returned as base64 data URIs (memory storage — see
// uploadReviewImages in middleware/upload.js): the client attaches
// them to the review it submits, and they live on the Review document,
// immune to the ephemeral-filesystem problem that affects /uploads.
export const reviewImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: "No image files received" });
  // Magic bytes were verified per file by verifyReviewImageBuffers; the
  // DETECTED type (never the declared mimetype) builds each data URI.
  const images = files.map((f) => `data:${f.detectedImage.mime};base64,${f.buffer.toString("base64")}`);
  res.status(201).json({ images });
});

// POST /api/uploads/catalog-image (staff only — see uploadRoutes)
// Stores a product/category image browsed from the admin's device and
// returns its served path, which the admin form saves on the product or
// category like any other image URL.
export const catalogImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file received" });
  res.status(201).json({
    path: `/uploads/catalog/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
  });
});
