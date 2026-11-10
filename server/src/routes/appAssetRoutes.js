import { Router } from "express";
import { protect, isStaff } from "../middleware/auth.js";
import { CUSTOMER_APK_B64, ADMIN_APK_B64 } from "../assets/apkAssets.js";
import { ICON_B64 } from "../assets/iconAssets.js";
import { OG_IMAGE_B64 } from "../assets/ogImageAssets.js";

// Binary assets (Android APKs, PWA icons) ship inside this repo as base64
// text embedded in JS modules (server/src/assets/*Assets.js) — the
// snapshot-based GitHub push accepts UTF-8 text only, so no binary can be
// committed directly, and loose files read via fs at runtime are not
// reliably bundled into the serverless function. Decoded ONCE here at
// module load into in-memory buffers and served from memory. Decoding is
// guarded so a bad asset can never crash the API — its route just 503s.

const decode = (b64) => {
  try {
    return Buffer.from(String(b64).replace(/\s+/g, ""), "base64");
  } catch {
    return null;
  }
};

const customerApk = decode(CUSTOMER_APK_B64);
const adminApk = decode(ADMIN_APK_B64);
const ogImage = decode(OG_IMAGE_B64);

const APK_TYPE = "application/vnd.android.package-archive";
const sendApk = (buffer, filename) => (req, res) => {
  if (!buffer) return res.status(503).json({ message: "App download is temporarily unavailable." });
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

// App version manifest — the installed customer app polls this on
// startup and offers an in-app update when a newer build is published.
// Static on purpose: no DB access, so it answers even if the DB is down
// (same guarantee as the asset routes above). Bump versionCode here AND
// in the APK (AndroidManifest + MainActivity) whenever a new APK ships.
router.get("/api/app/version", (req, res) => {
  res.json({
    versionCode: 3,
    versionName: "1.2",
    apkUrl: "/download/malac-app.apk",
    notes: "Push notifications for your orders (confirm, ship, deliver), app-style layout, My Account, MALAC Assistant",
  });
});

// Social share image (og:image / twitter:image) — PUBLIC. Branded
// 1200x630 PNG built from the official logo artwork (assets/ogImageAssets).
router.get("/og-image.png", (req, res) => {
  if (!ogImage) return res.status(503).json({ message: "Share image unavailable." });
  res.set({
    "Content-Type": "image/png",
    "Content-Length": ogImage.length,
    "Cache-Control": "public, max-age=604800",
  });
  res.send(ogImage);
});

// PWA icons generated from the real MALAC monogram (see assets/icons).
for (const [name, b64] of Object.entries(ICON_B64)) {
  const buffer = decode(b64);
  router.get(`/app-icons/${name}`, (req, res) => {
    if (!buffer) return res.status(503).json({ message: "Icon unavailable." });
    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400",
    });
    res.send(buffer);
  });
}

export default router;
