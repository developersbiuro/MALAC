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
