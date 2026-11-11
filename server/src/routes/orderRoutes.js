import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { rateLimit, ipKey } from "../middleware/rateLimit.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
// Tracking is a signed-in function (Abdullah, 2026-11-09: browsing is
// public, every function needs an account — this also stops strangers
// pulling up someone else's orders by phone number). protect runs
// first; the per-IP limit stays as the second guard.
router.post("/track", protect, rateLimit({ windowMs: 15 * 60 * 1000, max: 60, key: ipKey }), orders.trackOrder);
router.use(protect);
router.post("/", orders.placeOrder);
router.get("/my", orders.myOrders);
router.get("/my-reviews", orders.myReviews);
router.get("/:orderId", orders.getOrder);
router.get("/:orderId/reviews", orders.myOrderReviews);
router.patch("/:orderId/cancel", orders.cancelMyOrder);
router.post("/:orderId/return-request", orders.requestReturn);
export default router;
