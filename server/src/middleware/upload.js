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
// Catalog images (product/category photos uploaded from the admin panel)
// live in their own subfolder, created with the same never-crash guard.
// NOTE: on Vercel uploadsDir is the OS temp dir, so — exactly like payment
// screenshots — these files sit in EPHEMERAL storage and can vanish when
// the function instance is recycled. Durable object storage (e.g. S3 /
// Vercel Blob) is the future upgrade for both kinds of uploads.
export const catalogDir = path.join(uploadsDir, "catalog");
try {
  fs.mkdirSync(catalogDir, { recursive: true });
} catch (err) {
  console.error(`[MALAC] Could not create catalog uploads dir ${catalogDir}: ${err.message}`);
}

function makeStorage(dir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ".png"}`);
    },
  });
}

function imageFileFilter(req, file, cb) {
  if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
  else {
    // Client-facing validation message (safe to expose via errorHandler).
    const err = new Error("Only PNG, JPG or WEBP images are allowed");
    err.status = 400;
    err.expose = true;
    cb(err);
  }
}

export const uploadPaymentScreenshot = multer({
  storage: makeStorage(screenshotsDir),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
});

// Catalog image upload (staff only — enforced in the route). Same 5 MB
// limit and PNG/JPG/WEBP filter as payment screenshots.
export const uploadCatalogImage = multer({
  storage: makeStorage(catalogDir),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
});
export default uploadPaymentScreenshot;

// -- Magic-byte verification (runs AFTER multer has stored the file) --
// The multer filter above only sees the client-DECLARED mimetype, which
// any uploader can forge. This middleware reads the stored file's first
// bytes and checks them against the real PNG / JPEG / WebP signatures:
// a file whose content is not actually one of those image formats is
// deleted and rejected, whatever its name or mimetype claimed. The
// stored filename's extension is also normalized to the DETECTED type,
// so express.static later serves it with a truthful Content-Type (with
// nosniff set globally, a mismatched type would otherwise be blocked
// or, worse, sniffed).
const IMAGE_SIGNATURES = [
  { type: "png", ext: ".png", test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { type: "jpg", ext: ".jpg", test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "webp", ext: ".webp", test: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

export function verifyImageMagicBytes(req, res, next) {
  if (!req.file) return next();
  let header;
  try {
    const fd = fs.openSync(req.file.path, "r");
    header = Buffer.alloc(12);
    fs.readSync(fd, header, 0, 12, 0);
    fs.closeSync(fd);
  } catch (err) {
    return next(err);
  }
  const detected = IMAGE_SIGNATURES.find((sig) => sig.test(header));
  if (!detected) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: "Uploaded file is not a valid PNG, JPG or WEBP image" });
  }
  if (!req.file.filename.toLowerCase().endsWith(detected.ext)) {
    const newFilename = req.file.filename.replace(/\.[^.]*$/, "") + detected.ext;
    const newPath = path.join(req.file.destination, newFilename);
    try {
      fs.renameSync(req.file.path, newPath);
      req.file.filename = newFilename;
      req.file.path = newPath;
    } catch { /* keep the original name — the content check already passed */ }
  }
  return next();
}
