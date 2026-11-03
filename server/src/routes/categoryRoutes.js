import { Router } from "express";
import { protect, isStaff, isSuperAdmin } from "../middleware/auth.js";
import * as categories from "../controllers/categoryController.js";

const router = Router();
router.get("/", categories.listCategories);
router.post("/", protect, isStaff, categories.createCategory);
router.put("/:id", protect, isStaff, categories.updateCategory);
router.delete("/:id", protect, isSuperAdmin, categories.deleteCategory);
export default router;
