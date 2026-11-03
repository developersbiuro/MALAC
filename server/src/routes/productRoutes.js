import { Router } from "express";
import { protect, isStaff, isSuperAdmin } from "../middleware/auth.js";
import * as products from "../controllers/productController.js";

const router = Router();
router.get("/", products.listProducts);
router.get("/suggest", products.suggest);
router.get("/:slug", products.getProduct);
router.post("/", protect, isStaff, products.createProduct);
router.put("/:id", protect, isStaff, products.updateProduct);
router.patch("/:id/inline", protect, isStaff, products.inlineUpdateProduct);
router.delete("/:id", protect, isSuperAdmin, products.deleteProduct); // archives
router.get("/:id/reviews", products.listReviews);
router.post("/:id/reviews", protect, products.createReview);
router.post("/:id/questions", protect, products.askQuestion);
router.post("/:id/questions/:qid/answer", protect, isStaff, products.answerQuestion);
export default router;
