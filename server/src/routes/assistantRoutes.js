// MALAC Assistant AI endpoint — POST /api/assistant/chat.
//
// Body: { message: string, history?: [{ from: "user"|"bot", text }] }
// 200: { reply, products: [{ slug, title, category }] }
// 503: { message: "assistant_unavailable" } whenever the AI layer is
// off or failed — the client treats any non-200 as "use the built-in
// rule-based fallback", so the assistant degrades silently.
//
// The per-IP rate limit protects the free Gemini quota: 20 messages
// per 10 minutes per IP is far above any real shopper's usage.
import { Router } from "express";
import rateLimit, { ipKey } from "../middleware/rateLimit.js";
import { buildAssistantReply } from "../services/assistantService.js";

const router = Router();

router.post(
  "/chat",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, key: ipKey }),
  async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 500) {
      return res.status(400).json({ message: "A short message is required." });
    }
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
    try {
      const result = await buildAssistantReply({ message, history });
      if (!result) return res.status(503).json({ message: "assistant_unavailable" });
      return res.json(result);
    } catch {
      return res.status(503).json({ message: "assistant_unavailable" });
    }
  }
);

export default router;
