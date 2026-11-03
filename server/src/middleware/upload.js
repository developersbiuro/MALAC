import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Uploads must live somewhere WRITABLE. Locally that is server/uploads; on
// Vercel the deployed bundle is read-only, so the OS temp dir is used there.
// (process.env.VERCEL is not reliably set in every Vercel runtime, so this
// probes writability instead of trusting env flags.) This setup must NEVER
// crash module import: on serverless a top-level mkdirSync against the
// read-only bundle throws EROFS and takes down every API route (including
// /api/health) with FUNCTION_INVOCATION_FAILED.
const localUploadsDir = path.join(__dirname, "../../uploads");
function pickUploadsDir() {
  const candidates = [
    process.env.UPLOADS_DIR,
    localUploadsDir,
    path.join(os.tmpdir(), "malac-uploads"),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      fs.mkdirSync(path.join(dir, "payment-screenshots"), { recursive: true });
      return dir;
    } catch { /* not writable — try the next candidate */ }
  }
  return candidates[candidates.length - 1];
}
export const uploadsDir = pickUploadsDir();
export const screenshotsDir = path.join(uploadsDir, "payment-screenshots");

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
