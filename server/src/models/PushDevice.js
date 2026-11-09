import mongoose from "mongoose";

// FCM device tokens for the MALAC Admin app (staff phones). One row per
// token; a staff account can have several devices. Tokens are refreshed
// by the app itself (onNewToken → bridge → POST /admin/push/register).
// Rows are deactivated (active:false), never deleted, when FCM reports
// the token dead — the owner's retention rule.
const pushDeviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, default: "android" },
  app: { type: String, default: "admin" },
  active: { type: Boolean, default: true, index: true },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("PushDevice", pushDeviceSchema);
