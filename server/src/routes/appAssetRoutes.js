import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import { protect, isStaff } from "../middleware/auth.js";

// Binary assets (Android APKs, PWA icons) ship inside this repo as base64
// TEXT files — the snapshot-based GitHub push accepts UTF-8 text only, so
// no binary can be committed directly. Each asset is decoded ONCE here at
// server start into an in-memory Buffer and then served from memory.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const decodeAsset = (rel) =>
  Buffer.from(
    readFileSync(path.join(__dirname, rel), "utf8").replace(/\s+/g, ""),
    "base64"
  );

const customerApk = decodeAsset("../assets/apk/malac-app.b64");
const adminApk = decodeAsset("../assets/apk/malac-admin-app.b64");

const ICONS = {
  "icon-512.png": decodeAsset("../assets/icons/icon-512.png.b64.txt"),
  "icon-192.png": decodeAsset("../assets/icons/icon-192.png.b64.txt"),
  "icon-maskable-512.png": decodeAsset("../assets/icons/icon-maskable-512.png.b64.txt"),
  "apple-touch-icon.png": decodeAsset("../assets/icons/apple-touch-icon.png.b64.txt"),
};

const APK_TYPE = "application/vnd.android.package-archive";
const sendApk = (buffer, filename) => (req, res) => {
  res.set({
    "Content-Type": APK_TYPE,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
  });
  res.send(buffer);
};

const router = Router();

// Customer app — PUBLIC download (the storefront "Download App" button
// links here; Android downloads the file and installs it from the file
// manager).
router.get("/download/malac-app.apk", sendApk(customerApk, "MALAC-App.apk"));

// Admin app — STAFF-ONLY. The admin panel's "Download Admin App" button
// fetches this with the staff Bearer token (as a blob) and saves it as
// MALAC-Admin-App.apk. Without a staff login there is no way to fetch
// the admin app from the site.
router.get("/api/admin/app-download", protect, isStaff, sendApk(adminApk, "MALAC-Admin-App.apk"));

// PWA icons generated from the real MALAC monogram (see assets/icons).
for (const [name, buffer] of Object.entries(ICONS)) {
  router.get(`/app-icons/${name}`, (req, res) => {
    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400",
    });
    res.send(buffer);
  });
}

export default router;
