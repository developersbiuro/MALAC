import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import morgan from "morgan";
import env from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { uploadsDir } from "./middleware/upload.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

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
if (env.nodeEnv === "development") app.use(morgan("dev"));

// Uploaded payment screenshots (and future uploads) are served from here.
// On Vercel this path is routed to this service by the /uploads/(.*)
// rewrite in vercel.json (it must NOT fall through to the client SPA).
// NOTE: in production, restrict this to staff or signed URLs if screenshots
// are considered sensitive in your deployment.
app.use("/uploads", express.static(uploadsDir));

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

app.use(notFound);
app.use(errorHandler);
export default app;
