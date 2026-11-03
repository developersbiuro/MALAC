import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the deployed filesystem is read-only — uploads must live in the
// OS temp dir there. Locally they live in server/uploads as before. This
// directory setup must NEVER crash module import: on serverless a top-level
// mkdirSync against the read-only bundle throws EROFS and takes down every
// API route (including /api/health) with FUNCTION_INVOCATION_FAILED.
const localUploadsDir = path.join(__dirname, "../../uploads");
export const uploadsDir =
  process.env.UPLOADS_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), "malac-uploads") : localUploadsDir);
export const screenshotsDir = path.join(uploadsDir, "payment-screenshots");
try {
  fs.mkdirSync(screenshotsDir, { recursive: true });
} catch (err) {
  console.error(`[MALAC] Could not create uploads dir ${screenshotsDir}: ${err.message}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, screenshotsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".png"}`);
  },
});

export const uploadPaymentScreenshot = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG or WEBP images are allowed"));
  },
});
export default uploadPaymentScreenshot;
