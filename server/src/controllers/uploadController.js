import fs from "fs";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryConfigured, cloudinaryUpload } from "../services/cloudinary.js";

// Durable-storage path for the two disk uploads (audit M6, 2026-11-24):
// when Cloudinary is configured, the file multer just saved to the
// (possibly ephemeral) disk is pushed to Cloudinary and the temp copy
// deleted. ANY Cloudinary failure falls back to the disk path — an
// upload must never fail an order or a product save because the cloud
// hiccuped. kind "screenshot" uploads PRIVATE (authenticated type,
// stored on the order as an opaque "cld:" marker — no public URL,
// audit M4); kind "catalog" uploads public and returns the CDN URL.
const MIME_BY_EXT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function tryCloudinary(req, kind) {
  if (!cloudinaryConfigured() || !req.file?.path) return null;
  const ext = (req.file.filename.match(/\.[^.]*$/) || [".jpg"])[0].toLowerCase();
  const buffer = await fs.promises.readFile(req.file.path);
  const rand = crypto.randomBytes(6).toString("hex");
  if (kind === "screenshot") {
    const up = await cloudinaryUpload(buffer, {
      publicId: `malac/payment-screenshots/${Date.now()}-${rand}`,
      type: "authenticated", mime: MIME_BY_EXT[ext],
    });
    fs.unlink(req.file.path, () => {});
    return { path: `cld:${up.publicId}.${up.format}`, storage: "cloudinary" };
  }
  const up = await cloudinaryUpload(buffer, {
    publicId: `malac/catalog/${Date.now()}-${rand}`,
    type: "upload", mime: MIME_BY_EXT[ext],
  });
  fs.unlink(req.file.path, () => {});
  return { path: up.secureUrl, storage: "cloudinary" };
}

// POST /api/uploads/payment-screenshot (login required)
// Returns the stored path, which the client then sends with the order.
export const paymentScreenshot = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file received" });
  try {
    const cloud = await tryCloudinary(req, "screenshot");
    if (cloud) return res.status(201).json({ ...cloud, filename: req.file.filename, size: req.file.size });
  } catch { /* fall through to the disk response below */ }
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
  try {
    const cloud = await tryCloudinary(req, "catalog");
    if (cloud) return res.status(201).json({ ...cloud, filename: req.file.filename, size: req.file.size });
  } catch { /* fall through to the disk response below */ }
  res.status(201).json({
    path: `/uploads/catalog/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
  });
});
