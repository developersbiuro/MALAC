import Order from "../models/Order.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { sendPushToUser } from "./pushService.js";

// Daily review reminders (owner's rule): once an order is Delivered,
// the customer gets ONE push per day — "review dein" — until every
// product in that order has a submitted review from them (a review
// still pending moderation counts: the customer did their part).
// Reminders stop for good 30 days after delivery so nobody is nagged
// forever. Invoked once a day by the Vercel cron through
// routes/cronRoutes.js; everything is best-effort and a failure on one
// order never stops the rest of the run.

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REMINDER_DAYS = 30;

function deliveredAtOf(order) {
  const entries = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].status === "Delivered" && entries[i].at) return new Date(entries[i].at);
  }
  return order.updatedAt ? new Date(order.updatedAt) : null;
}

export async function runReviewReminders() {
  const now = Date.now();
  const orders = await Order.find({ status: "Delivered" })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  let checked = 0;
  let sent = 0;

  for (const order of orders) {
    try {
      const deliveredAt = deliveredAtOf(order);
      if (!deliveredAt) continue;
      const ageMs = now - deliveredAt.getTime();
      if (ageMs < 0 || ageMs > MAX_REMINDER_DAYS * DAY_MS) continue;
      // One reminder per day at most: skip if the last one went out
      // less than 20 hours ago (the cron runs daily; the slack absorbs
      // schedule jitter without ever doubling up on a day).
      if (order.reviewReminderLastSentAt
          && now - new Date(order.reviewReminderLastSentAt).getTime() < 20 * 60 * 60 * 1000) {
        continue;
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const productIds = [...new Set(
        items.map((it) => it.product).filter(Boolean).map((id) => String(id)),
      )];
      if (!productIds.length) continue;
      checked += 1;

      const reviewedIds = new Set(
        (await Review.find({ user: order.user, product: { $in: productIds } })
          .distinct("product")).map((id) => String(id)),
      );
      const pendingItem = items.find(
        (it) => it.product && !reviewedIds.has(String(it.product)),
      );
      if (!pendingItem) continue; // everything reviewed — reminders stop

      const user = await User.findById(order.user).select("name").lean();
      const first = ((user?.name || order.address?.fullName || "Customer")
        .trim().split(/\s+/)[0]) || "Customer";

      const result = await sendPushToUser(order.user, {
        title: "MALAC — Aap ka review baqi hai ⭐",
        body: `${first}, aap ka order ${order.orderId} kaisa raha? "${pendingItem.title}" ka review dein — aap ki raaye dusre customers ki bohat madad karegi.`,
        data: { type: "review_reminder", orderId: order.orderId || "" },
      });
      if (result.sent > 0) {
        sent += 1;
        await Order.updateOne(
          { _id: order._id },
          { reviewReminderLastSentAt: new Date(), $inc: { reviewReminderCount: 1 } },
        );
      }
    } catch (err) {
      console.error(`[MALAC] review reminder failed (${order.orderId}): ${err.message}`);
    }
  }

  return { checked, sent };
}
