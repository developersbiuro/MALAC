import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
// Public tracking must be registered BEFORE protect: guests track an
// order with its order ID + the phone number on the order (no login).
router.post("/track", orders.trackOrder);
router.use(protect);
router.post("/", orders.placeOrder);
router.get("/my", orders.myOrders);
router.get("/:orderId", orders.getOrder);
router.patch("/:orderId/cancel", orders.cancelMyOrder);
export default router;
