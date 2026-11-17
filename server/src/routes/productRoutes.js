import { Router } from "express";
import { protect, isStaff, requirePermission } from "../middleware/auth.js";
import { anonCache } from "../utils/anonCache.js";
import * as products from "../controllers/productController.js";

const router = Router();
// Public catalogue reads are CDN-cached at the edge for ANONYMOUS
// callers only (Abdullah, 2026-11-17: product lists took 1–2 s per
// call from Pakistan on slow mobile data, so pages sat on "Loading
// products…"). Staff calls carry an Authorization header — they skip
// this header entirely (and Vercel bypasses its cache for them), so
// the admin panel always sees fresh data including Archived items.
// Public prices/stock can lag by up to the s-maxage window; order
// placement re-prices and re-checks stock server-side, so a stale
// list can never sell anything at a wrong price.
const publicCache = (seconds) => (req, res, next) => {
  if (!req.headers.authorization) {
    res.set("Cache-Control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=600`);
  }
  next();
};
router.get("/", publicCache(120), anonCache(60_000), products.listProducts);
router.get("/suggest", products.suggest);
router.get("/:slug", publicCache(60), anonCache(30_000), products.getProduct);
// Product management is gated by the "products" permission (Super Admin
// has it always; a Vice-Admin only when the Super Admin granted it).
router.post("/", protect, isStaff, requirePermission("products"), products.createProduct);
router.put("/:id", protect, isStaff, requirePermission("products"), products.updateProduct);
router.patch("/:id/inline", protect, isStaff, requirePermission("products"), products.inlineUpdateProduct);
router.delete("/:id", protect, isStaff, requirePermission("products"), products.deleteProduct); // archives
router.get("/:id/reviews", products.listReviews);
router.post("/:id/reviews", protect, products.createReview);
router.post("/:id/questions", protect, products.askQuestion);
router.post("/:id/questions/:qid/answer", protect, isStaff, products.answerQuestion);
export default router;
