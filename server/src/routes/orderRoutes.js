import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
router.use(protect);
router.post("/", orders.placeOrder);
router.get("/my", orders.myOrders);
router.get("/:orderId", orders.getOrder);
router.patch("/:orderId/cancel", orders.cancelMyOrder);
export default router;
