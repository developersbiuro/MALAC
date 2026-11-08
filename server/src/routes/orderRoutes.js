import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { rateLimit, ipKey } from "../middleware/rateLimit.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
// Public tracking must be registered BEFORE protect: guests track an
// order with its order ID alone (no login, no phone — Abdullah,
// 2026-11-07). IDs are not enumerable in practice; the per-IP limit is
// the second guard against guessing.
router.post("/track", rateLimit({ windowMs: 15 * 60 * 1000, max: 60, key: ipKey }), orders.trackOrder);
router.use(protect);
router.post("/", orders.placeOrder);
router.get("/my", orders.myOrders);
router.get("/:orderId", orders.getOrder);
router.patch("/:orderId/cancel", orders.cancelMyOrder);
router.post("/:orderId/return-request", orders.requestReturn);
export default router;
