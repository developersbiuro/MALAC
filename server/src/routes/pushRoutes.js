import { Router } from "express";
import { protect } from "../middleware/auth.js";
import PushDevice from "../models/PushDevice.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Customer-app push registration: the customer app (signed in with the
// customer's own JWT) registers its FCM token here. Staff/admin devices
// use POST /api/admin/push/register instead — the two audiences never mix.
const router = Router();

router.post("/register", protect, asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token || token.length < 80) {
    return res.status(400).json({ message: "A valid device token is required." });
  }
  await PushDevice.findOneAndUpdate(
    { token },
    {
      user: req.user._id,
      platform: typeof req.body?.platform === "string" ? req.body.platform.slice(0, 20) : "android",
      app: "customer",
      active: true,
      lastSeenAt: new Date(),
    },
    { upsert: true }
  );
  return res.json({ ok: true });
}));

export default router;
