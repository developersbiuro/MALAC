import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { rateLimit, ipKey, userKey } from "../middleware/rateLimit.js";
import * as orders from "../controllers/orderController.js";

const router = Router();
// Tracking is a signed-in function (Abdullah, 2026-11-09: browsing is
// public, every function needs an account — this also stops strangers
// pulling up someone else's orders by phone number). protect runs
// first; the per-IP limit stays as the second guard.
router.post("/track", protect, rateLimit({ windowMs: 15 * 60 * 1000, max: 60, key: ipKey }), orders.trackOrder);
router.use(protect);
// Fake-order brake (Abdullah, 2026-11-14): placing an order needs a verified
// account, totals are priced server-side from the DB and stock is claimed
// atomically — these caps stop one account (or one network) from flooding
// the store with bogus COD orders. Real customers never come close.
router.post("/",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 15, key: userKey }),
  rateLimit({ windowMs: 60 * 60 * 1000, max: 40, key: ipKey }),
  orders.placeOrder);
router.get("/my", orders.myOrders);
router.get("/my-reviews", orders.myReviews);
router.get("/:orderId", orders.getOrder);
router.get("/:orderId/reviews", orders.myOrderReviews);
router.patch("/:orderId/cancel", orders.cancelMyOrder);
router.post("/:orderId/return-request", orders.requestReturn);
export default router;
