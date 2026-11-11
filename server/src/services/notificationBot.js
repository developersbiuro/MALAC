import Product from "../models/Product.js";
import PushDevice from "../models/PushDevice.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { sendPushToAllCustomers, sendPushToUser } from "./pushService.js";

// MALAC Notification Bot (owner's ask, 2026-11-11: "bot b notification
// bhej sakta hai jo notification manage kare free me"). A zero-cost
// automatic manager on top of FCM (free tier — no per-message fee):
//
//  1. TEMPLATES — ready-made announcements (Flash Sale LIVE, New
//     Arrivals, Daily Deals, Free Delivery) computed from the LIVE
//     catalogue, so a template only claims what is actually true (the
//     Flash Sale template is "ready" only while a flash sale is live).
//     Staff pick one in Admin → Notifications and send with one tap.
//  2. DAILY PROMO — the daily cron sends ONE template per day to every
//     customer app, rotating through the ready ones.
//  3. WIN-BACK — a customer whose app has not been opened for 3 days
//     (PushDevice.lastSeenAt stands still) gets ONE personal
//     "we miss you" push per quiet spell, in their own name.
//
// Both automations are toggled by the Super Admin in
// Admin → Notifications (Settings.botDailyPromo / botInactivePush).

const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_AFTER_MS = 3 * DAY_MS;
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
const priceOf = (p) => (p.salePrice > 0 ? p.salePrice : p.basePrice);

// The broadcast templates with live-computed titles/bodies. `ready`
// says whether the claim is currently true; the admin composer lists
// all of them and marks the unready ones.
export async function buildBroadcastTemplates() {
  const now = new Date();
  const [flash, newest, deal] = await Promise.all([
    Product.findOne({
      status: "Active", flashSale: true,
      $or: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { $gt: now } }],
    }).sort({ createdAt: -1 }).lean(),
    Product.findOne({ status: "Active", createdAt: { $gte: new Date(now.getTime() - 7 * DAY_MS) } })
      .sort({ createdAt: -1 }).lean(),
    Product.findOne({ status: "Active", salePrice: { $gt: 0 } }).sort({ salePrice: 1 }).lean(),
  ]);

  const templates = [];
  templates.push(flash
    ? {
        key: "flash_sale", label: "⚡ Flash Sale LIVE", ready: true,
        title: "MALAC — ⚡ Flash Sale LIVE hai!",
        body: `${flash.title} sirf ${rs(priceOf(flash))} mein — stock mehdood hai, jaldi karein!`,
      }
    : {
        key: "flash_sale", label: "⚡ Flash Sale LIVE", ready: false,
        note: "Abhi koi flash sale live nahi — pehle kisi product par Flash Sale on karein.",
        title: "MALAC — ⚡ Flash Sale LIVE hai!",
        body: "Flash deals par behtareen prices — abhi MALAC app mein dekhein!",
      });
  if (newest) {
    templates.push({
      key: "new_arrivals", label: "🛍️ Naye Products", ready: true,
      title: "MALAC — 🛍️ Naya Product aa gaya!",
      body: `${newest.title} — ${rs(priceOf(newest))}. Abhi MALAC app mein dekhein!`,
    });
  }
  templates.push({
    key: "daily_deals", label: "🔥 Aaj ki Deals", ready: true,
    title: "MALAC — 🔥 Aaj ki Deals",
    body: deal
      ? `${deal.title} ab sirf ${rs(priceOf(deal))} — aaj ki deals miss na karein!`
      : "Aaj ki behtareen deals MALAC app mein — Rs. 3,000 se zyada par FREE delivery!",
  });
  templates.push({
    key: "free_delivery", label: "🚚 Free Delivery", ready: true,
    title: "MALAC — 🚚 FREE Delivery offer!",
    body: "Rs. 3,000 ya zyada ki shopping par delivery bilkul FREE — abhi order karein!",
  });
  return templates;
}

// One template per day, rotating deterministically through the ready
// ones so consecutive days do not repeat the same announcement.
export async function pickDailyTemplate() {
  const ready = (await buildBroadcastTemplates()).filter((t) => t.ready);
  if (!ready.length) return null;
  return ready[Math.floor(Date.now() / DAY_MS) % ready.length];
}

// Invoked by the daily Vercel cron (routes/cronRoutes.js). Everything
// is best-effort; one failure never stops the rest of the run.
export async function runDailyEngagement() {
  const settings = await Settings.getStore();
  const summary = { promo: null, promoSent: 0, inactiveUsers: 0, inactiveSent: 0 };

  if (settings.botDailyPromo !== false) {
    try {
      const tpl = await pickDailyTemplate();
      if (tpl) {
        const r = await sendPushToAllCustomers({
          title: tpl.title, body: tpl.body,
          data: { type: "bot_promo", template: tpl.key },
        });
        summary.promo = tpl.key;
        summary.promoSent = r?.sent || 0;
      }
    } catch (err) {
      console.error(`[MALAC] notification bot daily promo failed: ${err.message}`);
    }
  }

  if (settings.botInactivePush !== false) {
    try {
      const cutoff = new Date(Date.now() - INACTIVE_AFTER_MS);
      const devices = await PushDevice.find({ app: "customer", active: true, lastSeenAt: { $lte: cutoff } })
        .sort({ lastSeenAt: 1 }).limit(500).lean();
      // One win-back per customer per quiet spell: skip devices whose
      // stamp is already at/after their last sighting.
      const byUser = new Map();
      for (const d of devices) {
        if (d.inactivePushAt && new Date(d.inactivePushAt) >= new Date(d.lastSeenAt)) continue;
        const key = String(d.user);
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key).push(d);
      }
      summary.inactiveUsers = byUser.size;
      for (const [userId, devs] of byUser) {
        try {
          const user = await User.findById(userId).select("name").lean();
          const first = String(user?.name || "").trim().split(/\s+/)[0] || "Customer";
          const r = await sendPushToUser(userId, {
            title: `MALAC — 💛 ${first}, aap ko miss kar rahe hain!`,
            body: "Kuch din se aap ne MALAC app nahi khola. Nayi deals aap ka intezaar kar rahi hain — pehle order par WELCOME10 code se 10% OFF bhi milega!",
            data: { type: "bot_winback" },
          });
          if (r?.sent > 0) {
            summary.inactiveSent += 1;
            await PushDevice.updateMany(
              { _id: { $in: devs.map((d) => d._id) } },
              { inactivePushAt: new Date() },
            );
          }
        } catch { /* one customer never stops the run */ }
      }
    } catch (err) {
      console.error(`[MALAC] notification bot win-back failed: ${err.message}`);
    }
  }

  return summary;
}
