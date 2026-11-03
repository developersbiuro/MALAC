import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
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
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
if (env.nodeEnv === "development") app.use(morgan("dev"));

// Uploaded payment screenshots (and future uploads) are served from here.
// NOTE: in production, restrict this to staff or signed URLs if screenshots
// are considered sensitive in your deployment.
app.use("/uploads", express.static(uploadsDir));

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
