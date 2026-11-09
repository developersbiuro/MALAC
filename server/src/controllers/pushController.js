import PushDevice from "../models/PushDevice.js";
import { sendPushToStaff } from "../services/pushService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/admin/push/register — the MALAC Admin app calls this (via the
// WebView bridge) with its FCM token after staff sign-in. Upsert by token
// so reinstalls/refreshes just refresh the row.
export const registerPushDevice = asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token || token.length < 80) {
    return res.status(400).json({ message: "A valid device token is required." });
  }
  const device = await PushDevice.findOneAndUpdate(
    { token },
    {
      user: req.user._id,
      platform: typeof req.body?.platform === "string" ? req.body.platform.slice(0, 20) : "android",
      app: "admin",
      active: true,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true }
  );
  return res.json({ ok: true, deviceId: device._id });
});

// POST /api/admin/push/test — send a test push to every registered staff
// device (used from Admin → Notifications to prove the phone receives it).
export const testPush = asyncHandler(async (req, res) => {
  const result = await sendPushToStaff({
    title: "MALAC — Test Notification",
    body: "Push notifications kaam kar rahe hain. Naye order par aisi hi notification ayegi.",
    data: { type: "test" },
  });
  return res.json(result);
});
