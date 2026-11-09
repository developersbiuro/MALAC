// MALAC Assistant — public chat API (master-prompt build, §5/§7/§10/
// §12/§13). Routes:
//
// POST /api/assistant/chat         — one customer message → answer.
//                                    Persists the turn (ChatConversation).
// GET  /api/assistant/config       — widget config from Settings
//                                    (enabled / name / welcome).
// GET  /api/assistant/poll         — admin replies + takeover state for
//                                    the customer's conversation.
// POST /api/assistant/tickets      — open a support ticket from chat.
// GET  /api/assistant/tickets/mine — the signed-in customer's tickets.
//
// Security: identity comes ONLY from a verified JWT. Since 2026-11-09
// (Abdullah's guest lock) the whole assistant API except /config needs
// a signed-in account — browsing is public, functions are not. A
// signed-in customer's chat attaches to their account. The AI model
// has no tools — every action here is plain server code. Records are
// never deleted (owner's retention rule).
import { Router } from "express";
import rateLimit, { ipKey } from "../middleware/rateLimit.js";
import { optionalProtect, protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildAssistantReply, parseBrowse, runBrowse, resolveCompare } from "../services/assistantService.js";
import ChatConversation from "../models/ChatConversation.js";
import SupportTicket from "../models/SupportTicket.js";
import Notification from "../models/Notification.js";
import Settings from "../models/Settings.js";
import Order from "../models/Order.js";

const router = Router();

const cleanText = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validSession = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(v);

// Load (or start) the conversation for this session. When the caller is
// signed in, the row is claimed by their account; the display name is
// refreshed from the account, never from client input.
async function conversationFor(sessionId, user) {
  let convo = await ChatConversation.findOne({ sessionId });
  if (!convo) {
    convo = new ChatConversation({ sessionId, messages: [] });
  }
  if (user) {
    convo.user = user._id;
    convo.customerName = user.name || convo.customerName || "";
    if (convo.status === "closed") convo.status = "open";
  }
  return convo;
}

router.get("/config", asyncHandler(async (req, res) => {
  const settings = await Settings.getStore();
  res.json({ chatbot: settings.publicChatbot() });
}));

router.post(
  "/chat",
  protect,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, key: ipKey }),
  asyncHandler(async (req, res) => {
    const message = cleanText(req.body?.message, 500);
    if (!message) return res.status(400).json({ message: "A short message is required." });
    const settings = await Settings.getStore();
    if (settings.chatbotEnabled === false) {
      return res.status(503).json({ message: "assistant_disabled" });
    }
    const sessionId = validSession(req.body?.sessionId) ? req.body.sessionId : null;
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
    const cart = Array.isArray(req.body?.cart) ? req.body.cart.slice(0, 20) : [];

    let convo = null;
    if (sessionId) {
      convo = await conversationFor(sessionId, req.user || null);
      convo.appendMessages([{ from: "user", text: message }]);
      await convo.save();
      // Admin takeover: once a staff member owns this conversation the
      // bot stays silent — the customer is talking to a human now.
      if (convo.takenOverBy) {
        return res.json({ takeover: true, reply: null, products: [] });
      }
    }

    const result = await buildAssistantReply({ message, history, cart });
    if (!result) return res.status(503).json({ message: "assistant_unavailable" });

    if (convo) {
      convo.appendMessages([{
        from: "bot",
        text: result.reply,
        products: (result.products || []).map((p) => ({
          slug: p.slug, title: p.title, category: p.category,
          image: p.image, price: p.price, wasPrice: p.wasPrice,
        })),
      }]);
      await convo.save();
    }
    return res.json(result);
  })
);

// Deterministic tools the widget calls directly (no AI involved): the
// same parsers the AI path uses, exposed so common asks ("2000 ke
// andar shoes dikhao", "compare X and Y") answer INSTANTLY from the
// database even before/without an AI round-trip.
router.post(
  "/browse",
  protect,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, key: ipKey }),
  asyncHandler(async (req, res) => {
    const message = cleanText(req.body?.message, 300);
    const parsed = parseBrowse(message);
    if (!parsed) return res.json({ products: [] });
    const products = await runBrowse(parsed);
    return res.json({ products, filter: parsed });
  })
);

router.post(
  "/compare",
  protect,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 30, key: ipKey }),
  asyncHandler(async (req, res) => {
    const message = cleanText(req.body?.message, 300);
    const out = await resolveCompare(message);
    if (!out) return res.json({ products: [] });
    return res.json(out);
  })
);

// Local-turn logging: the widget's instant rule-based answers (FAQs,
// tracking picker, browse/compare results, ticket steps) never pass
// through /assistant/chat, so the widget batches them here to keep the
// stored conversation complete for Admin → Chatbot. Entries identical
// to one of the last few stored messages (same sender + text, within
// two minutes) are skipped — that is the /assistant/chat copy of the
// same turn arriving twice.
router.post(
  "/log",
  protect,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 60, key: ipKey }),
  asyncHandler(async (req, res) => {
    const sessionId = validSession(req.body?.sessionId) ? req.body.sessionId : null;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    const raw = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, 50) : [];
    const entries = raw
      .filter((e) => (e?.from === "user" || e?.from === "bot") && cleanText(e?.text, 2000))
      .map((e) => ({
        from: e.from,
        text: cleanText(e.text, 2000),
        products: (Array.isArray(e.products) ? e.products : []).slice(0, 6).map((p) => ({
          slug: cleanText(p?.slug, 200), title: cleanText(p?.title, 200),
          category: cleanText(p?.category, 80), image: cleanText(p?.image, 1000),
          price: Number(p?.price) || 0, wasPrice: Number(p?.wasPrice) || 0,
        })),
      }));
    if (!entries.length) return res.json({ ok: true, stored: 0 });
    const convo = await conversationFor(sessionId, req.user || null);
    const recent = (convo.messages || []).slice(-4);
    const fresh = entries.filter((e) => !recent.some(
      (m) => m.from === e.from && m.text === e.text && Date.now() - new Date(m.at).getTime() < 120000
    ));
    if (fresh.length) {
      convo.appendMessages(fresh);
      await convo.save();
    }
    return res.json({ ok: true, stored: fresh.length });
  })
);

// The customer's widget polls this while open: any staff replies typed
// in Admin → Chatbot arrive here, plus the takeover flag.
router.get(
  "/poll",
  protect,
  rateLimit({ windowMs: 60 * 1000, max: 30, key: ipKey }),
  asyncHandler(async (req, res) => {
    const sessionId = validSession(req.query.sessionId) ? req.query.sessionId : null;
    if (!sessionId) return res.json({ messages: [], takeover: false });
    const convo = await ChatConversation.findOne({ sessionId }).select("messages takenOverBy").lean();
    if (!convo) return res.json({ messages: [], takeover: false });
    const since = req.query.since ? new Date(req.query.since) : null;
    const fresh = (convo.messages || []).filter(
      (m) => m.from === "admin" && (!since || new Date(m.at) > since)
    );
    return res.json({ messages: fresh, takeover: !!convo.takenOverBy });
  })
);

const TICKET_TYPES = ["return", "exchange", "refund", "damaged", "wrong_item", "missing_item", "delivery_issue", "general"];

router.post(
  "/tickets",
  protect,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: ipKey }),
  asyncHandler(async (req, res) => {
    const type = TICKET_TYPES.includes(req.body?.type) ? req.body.type : "general";
    const description = cleanText(req.body?.description, 1000);
    if (description.length < 10) {
      return res.status(400).json({ message: "Please describe the issue in a little more detail." });
    }
    const orderId = cleanText(req.body?.orderId, 40).toUpperCase();
    // Anti-fake-orders rule: a claimed order ID must either belong to
    // the signed-in customer or match the phone they provide here —
    // the same public verification the Track Order page uses.
    if (orderId) {
      const order = await Order.findOne({ orderId }).select("user address").lean();
      if (!order) return res.status(400).json({ message: "That order ID was not found — please check it and try again." });
      const phone = cleanText(req.body?.phone, 25).replace(/\D/g, "").slice(-10);
      const orderPhone = String(order.address?.phone || "").replace(/\D/g, "").slice(-10);
      const ownsIt = req.user && String(order.user) === String(req.user._id);
      if (!ownsIt && (!phone || phone !== orderPhone)) {
        return res.status(400).json({ message: "For this order, please provide the phone number used at checkout so we can verify it is yours." });
      }
    }
    const ticket = await SupportTicket.create({
      type,
      description,
      orderId,
      user: req.user?._id || null,
      name: cleanText(req.body?.name, 80) || req.user?.name || "",
      phone: cleanText(req.body?.phone, 25) || req.user?.phone || "",
    });
    await Notification.create({
      type: "support_ticket",
      ticket: ticket._id,
      ticketId: ticket.ticketId,
      message: `New support ticket ${ticket.ticketId} (${type.replace(/_/g, " ")})${orderId ? ` — order ${orderId}` : ""}`,
    }).catch(() => {});
    return res.status(201).json({ ticket: { ticketId: ticket.ticketId, status: ticket.status, type: ticket.type } });
  })
);

router.get(
  "/tickets/mine",
  protect,
  asyncHandler(async (req, res) => {
    if (!req.user) return res.json({ tickets: [] });
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("ticketId type status orderId createdAt replies")
      .lean();
    return res.json({ tickets });
  })
);

export default router;
