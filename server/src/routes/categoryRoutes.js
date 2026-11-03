import { Router } from "express";
import { protect, isStaff, requirePermission } from "../middleware/auth.js";
import * as categories from "../controllers/categoryController.js";

const router = Router();
router.get("/", categories.listCategories);
// Category management is gated by the "categories" permission.
router.post("/", protect, isStaff, requirePermission("categories"), categories.createCategory);
router.put("/:id", protect, isStaff, requirePermission("categories"), categories.updateCategory);
router.delete("/:id", protect, isStaff, requirePermission("categories"), categories.deleteCategory);
export default router;
