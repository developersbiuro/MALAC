import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import env from "./config/env.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { createGzip } from "node:zlib";
import uploadRoutes from "./routes/uploadRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import appAssetRoutes from "./routes/appAssetRoutes.js";
import { uploadsDir } from "./middleware/upload.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders } from "./middleware/securityHeaders.js";

const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);

// CORS — allowed origins:
//  1. The configured CLIENT_URL (local dev defaults to the Vite URL).
//  2. Same-host origins: on Vercel (services mode) the client and this API
//     share ONE domain — the browser calls the relative path /api, which
//     the top-level rewrites in vercel.json route to this service — so the
//     request Origin is the deployment's own host, not CLIENT_URL.
// Requests with no Origin header (curl, server-to-server) pass through
// without CORS headers, as browsers are the only CORS consumers.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    let allowed = origin === env.clientUrl;
    if (!allowed) {
      try {
        allowed = new URL(origin).host === req.headers.host;
      } catch {
        allowed = false;
      }
    }
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] || "Content-Type, Authorization"
      );
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
  }
  next();
});

app.use(express.json({ limit: "2mb" }));

// Gzip JSON API responses (built-in zlib, no dependency). Product lists
// carry long image URLs and descriptions; compressing them cuts the bytes
// a phone on a slow connection must download before the page can render.
// Only /api JSON answers are touched — APK downloads, uploaded images and
// the XML feeds keep their own handling. Small bodies pass through as-is.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  if (!(req.headers["accept-encoding"] || "").includes("gzip")) return next();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    let payload;
    try { payload = JSON.stringify(body); } catch { return origJson(body); }
    if (!payload || payload.length < 1024) return origJson(body);
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
    res.removeHeader("Content-Length");
    createGzip().end(payload, (err, buf) => {
      if (err) return origJson(body);
      res.setHeader("Content-Length", buf.length);
      return res.send(buf);
    });
  };
  return next();
});
if (env.nodeEnv === "development") app.use(morgan("dev"));

// App downloads + PWA icons (APKs/icons decoded from base64 text assets
// at startup, served from memory). Mounted BEFORE the database gate below
// on purpose: the public customer-APK download and the icons never need
// the DB, and the staff-only admin-APK route runs its own protect+isStaff
// chain (which answers 401 without a token before any DB touch).
app.use(appAssetRoutes);

// Database readiness gate. On Vercel the Express app is loaded and served
// as a function WITHOUT executing server.js, so the startup connect there
// never runs in production — the connection is therefore established here,
// lazily, shared across concurrent requests, and retried on the next
// request if it fails. Until the connection is up, DB-backed routes answer
// 503 with the real connection error instead of Mongoose's opaque 10s
// buffering timeout. /api/health intentionally stays DB-free so process
// health and database health remain distinguishable.
let connectPromise = null;
function ensureDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectPromise) {
    connectPromise = connectDB().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  return connectPromise;
}
app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api") || req.path === "/api/health") return next();
  try {
    await ensureDb();
    return next();
  } catch (err) {
    // The real connection error is logged server-side; in production the
    // client gets a generic message (driver errors can expose internal
    // hostnames/URIs). Development keeps the detail for debugging.
    console.error(`[MALAC] Database connection failed: ${err.message}`);
    const detail = env.nodeEnv === "production" ? "" : `: ${err.message}`;
    return res.status(503).json({ message: `Database unavailable${detail}` });
  }
});

// Uploaded payment screenshots (and future uploads) are served from here.
// On Vercel this path is routed to this service by the /uploads/(.*)
// rewrite in vercel.json (it must NOT fall through to the client SPA).
// NOTE: in production, restrict this to staff or signed URLs if screenshots
// are considered sensitive in your deployment.
app.use("/uploads", express.static(uploadsDir));

// SEO: dynamic sitemap at the site root (routed here by the /sitemap.xml
// rewrite in vercel.json). Deliberately mounted outside the /api DB gate
// above — the handler itself tolerates a down database and always answers
// 200 (see routes/sitemapRoutes.js).
app.use(sitemapRoutes);
// Merchant Center product feed at /google-feed.xml — same outside-the-gate
// mounting and always-200 reasoning as the sitemap.
app.use(feedRoutes);

// Public API — mounted under /api, matching the /api/(.*) rewrite to this
// service in vercel.json and the client's baseURL ("/api").
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "MALAC API" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
