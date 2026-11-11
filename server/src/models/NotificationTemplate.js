import mongoose from "mongoose";

// Staff-saved notification templates (owner's ask, 2026-11-12): in
// Admin → Notifications the team can write a title + message once and
// SAVE it, then reuse it any time with one tap in the broadcast
// composer. These are the store's own marketing drafts — not customer
// data — so staff may also delete ones they no longer need.
const notificationTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 60 },
  body: { type: String, required: true, trim: true, maxlength: 180 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("NotificationTemplate", notificationTemplateSchema);
