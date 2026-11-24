import { Router } from "express";
import { protect, isStaff, isSuperAdmin, requirePermission } from "../middleware/auth.js";
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
// Deleting a category is Super Admin only — the admin UI has always
// claimed exactly that (audit L10, 2026-11-24); the controller also
// refuses while products still carry the category name.
router.delete("/:id", protect, isStaff, isSuperAdmin, categories.deleteCategory);
export default router;
