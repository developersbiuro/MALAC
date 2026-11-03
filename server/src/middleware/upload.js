import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "../../uploads");
export const screenshotsDir = path.join(uploadsDir, "payment-screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

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
