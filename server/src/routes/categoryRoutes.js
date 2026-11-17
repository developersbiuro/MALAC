import { Router } from "express";
import { protect, isStaff, requirePermission } from "../middleware/auth.js";
import { anonCache } from "../utils/anonCache.js";
import * as categories from "../controllers/categoryController.js";

const router = Router();
// Categories change rarely — CDN-cache anonymous reads at the edge
// (see productRoutes.js for why staff calls are excluded).
const publicCache = (seconds) => (req, res, next) => {
  if (!req.headers.authorization) {
    res.set("Cache-Control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=600`);
  }
  next();
};
router.get("/", publicCache(300), anonCache(120_000), categories.listCategories);
// Category management is gated by the "categories" permission.
router.post("/", protect, isStaff, requirePermission("categories"), categories.createCategory);
router.put("/:id", protect, isStaff, requirePermission("categories"), categories.updateCategory);
router.delete("/:id", protect, isStaff, requirePermission("categories"), categories.deleteCategory);
export default router;
