import mongoose from "mongoose";

// FCM device tokens for the MALAC apps. app="admin" rows are staff phones
// (registered via POST /admin/push/register); app="customer" rows belong
// to shoppers (registered via POST /push/register with their customer
// JWT). One row per token; an account can have several devices.
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
