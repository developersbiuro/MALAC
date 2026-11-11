import { Router } from "express";
import { runReviewReminders } from "../services/reviewReminderService.js";
import { runDailyEngagement } from "../services/notificationBot.js";

// Machine-to-machine endpoints, invoked by Vercel Cron (see the
// "crons" section of vercel.json) — never by browsers. Vercel sends
// the project's CRON_SECRET env var as a Bearer token; without that
// exact header the endpoint refuses, and without the env var set the
// feature stays off entirely.
const router = Router();

router.get("/api/cron/review-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: "Cron is not configured." });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const summary = await runReviewReminders();
    return res.json({ ok: true, ...summary });
  } catch (err) {
    console.error(`[MALAC] review-reminder cron failed: ${err.message}`);
    return res.status(500).json({ message: "Reminder run failed." });
  }
});

// Notification Bot daily run: one rotating promo template to every
// customer app + "we miss you" win-backs for 3-day-inactive customers.
router.get("/api/cron/daily-engagement", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: "Cron is not configured." });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const summary = await runDailyEngagement();
    return res.json({ ok: true, ...summary });
  } catch (err) {
    console.error(`[MALAC] daily-engagement cron failed: ${err.message}`);
    return res.status(500).json({ message: "Engagement run failed." });
  }
});

export default router;
