// MALAC Assistant — ADMIN side (master-prompt §10): conversation
// management, manual replies + takeover, support tickets, the chatbot
// knowledge/settings editor, and basic analytics.
//
// Mounted under /api/admin (router-level protect + isStaff in
// adminRoutes) and every route here is additionally gated by the
// "chatbot" section permission. The chatbot's own settings live on the
// shared Settings document; the generic settings editor stays
// Super-Admin-only, while THIS editor is permission-gated so an
// authorized Vice-Admin can run support without store-settings access.
//
// Records are never deleted (owner's data-retention rule): a
// conversation can be closed, a ticket resolved — nothing is erased.
import ChatConversation from "../models/ChatConversation.js";
import SupportTicket from "../models/SupportTicket.js";
import { sendPushToStaff } from "../services/pushService.js";
import Notification from "../models/Notification.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- Conversations ----

export const listConversations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status === "open" || req.query.status === "closed") filter.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), "i");
    filter.$or = [{ customerName: re }, { sessionId: re }, { "messages.text": re }];
  }
  if (req.query.from || req.query.to) {
    filter.lastMessageAt = {};
    if (req.query.from) filter.lastMessageAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.lastMessageAt.$lte = new Date(req.query.to);
  }
  const conversations = await ChatConversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .select("sessionId user customerName status takenOverBy lastMessageAt messages")
    .populate("user", "name email phone")
    .lean();
  const shaped = conversations.map((c) => ({
    _id: c._id,
    sessionId: c.sessionId,
    customer: c.user ? { name: c.user.name, email: c.user.email, phone: c.user.phone } : null,
    customerName: c.customerName || "",
    status: c.status,
    takenOver: !!c.takenOverBy,
    lastMessageAt: c.lastMessageAt,
    messageCount: (c.messages || []).length,
    lastMessage: (c.messages || []).slice(-1)[0] || null,
  }));
  res.json({ conversations: shaped });
});

export const getConversation = asyncHandler(async (req, res) => {
  const convo = await ChatConversation.findById(req.params.id)
    .populate("user", "name email phone")
    .lean();
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  res.json({ conversation: convo });
});

export const replyConversation = asyncHandler(async (req, res) => {
  const text = clean(req.body?.text, 2000);
  if (!text) return res.status(400).json({ message: "A reply message is required." });
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  // Replying as staff IS the takeover: the bot steps aside so the
  // customer hears one voice (the human's) from here on.
  if (!convo.takenOverBy) {
    convo.takenOverBy = req.user._id;
    await Notification.create({
      type: "chat_takeover",
      message: `Chatbot conversation taken over by ${req.user.name || "staff"} (${convo.customerName || "guest"})`,
    }).catch(() => {});
    sendPushToStaff({
      title: "MALAC — Chat Takeover",
      body: `Chat conversation taken over by ${req.user.name || "staff"} (${convo.customerName || "customer"})`,
      data: { type: "chat_takeover" },
    }).catch(() => {});
  }
  convo.appendMessages([{ from: "admin", text }]);
  await convo.save();
  res.json({ conversation: convo });
});

export const setConversationState = asyncHandler(async (req, res) => {
  const convo = await ChatConversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  if (req.body?.action === "close") convo.status = "closed";
  if (req.body?.action === "reopen") convo.status = "open";
  if (req.body?.action === "release") convo.takenOverBy = null; // hand back to the bot
  if (req.body?.action === "takeover") convo.takenOverBy = req.user._id;
  await convo.save();
  res.json({ conversation: convo });
});

// ---- Support tickets ----

const TICKET_STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Resolved"];

export const listTickets = asyncHandler(async (req, res) => {
  const filter = {};
  if (TICKET_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), "i");
    filter.$or = [{ ticketId: re }, { orderId: re }, { name: re }, { phone: re }];
  }
  const tickets = await SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("user", "name email phone")
    .populate("assignedTo", "name")
    .lean();
  const openCount = await SupportTicket.countDocuments({ status: { $in: ["Pending", "Under Review"] } });
  res.json({ tickets, openCount });
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (req.body?.status && TICKET_STATUSES.includes(req.body.status)) ticket.status = req.body.status;
  if (req.body?.assignTo !== undefined) {
    if (req.body.assignTo === null || req.body.assignTo === "") {
      ticket.assignedTo = null;
    } else {
      const assignee = await User.findOne({ _id: req.body.assignTo, role: { $in: ["admin", "vice-admin"] } }).select("_id");
      if (!assignee) return res.status(400).json({ message: "Assignee must be a staff account." });
      ticket.assignedTo = assignee._id;
    }
  }
  const replyText = clean(req.body?.reply, 2000);
  if (replyText) ticket.replies.push({ by: "staff", text: replyText });
  await ticket.save();
  res.json({ ticket });
});

// ---- Chatbot settings + knowledge base ----

export const getChatbotAdmin = asyncHandler(async (req, res) => {
  const s = await Settings.getStore();
  res.json({
    chatbot: {
      enabled: s.chatbotEnabled !== false,
      name: s.chatbotName || "MALAC Assistant",
      welcome: s.chatbotWelcome || "",
      instructions: s.chatbotInstructions || "",
      faqs: s.chatbotFaqs || [],
    },
  });
});

export const updateChatbotAdmin = asyncHandler(async (req, res) => {
  const s = await Settings.getStore();
  const b = req.body || {};
  if (b.enabled !== undefined) s.chatbotEnabled = !!b.enabled;
  if (b.name !== undefined) s.chatbotName = clean(b.name, 60) || "MALAC Assistant";
  if (b.welcome !== undefined) s.chatbotWelcome = clean(b.welcome, 600);
  if (b.instructions !== undefined) s.chatbotInstructions = clean(b.instructions, 1200);
  if (b.faqs !== undefined) {
    if (!Array.isArray(b.faqs) || b.faqs.length > 50) {
      return res.status(400).json({ message: "FAQs must be a list of at most 50 items." });
    }
    s.chatbotFaqs = b.faqs
      .map((f) => ({ question: clean(f?.question, 200), answer: clean(f?.answer, 800) }))
      .filter((f) => f.question && f.answer);
  }
  await s.save();
  res.json({
    chatbot: {
      enabled: s.chatbotEnabled !== false,
      name: s.chatbotName,
      welcome: s.chatbotWelcome,
      instructions: s.chatbotInstructions,
      faqs: s.chatbotFaqs,
    },
  });
});

// ---- Analytics (honest, computable subset) ----
// "Unanswered questions" and satisfaction ratings are NOT tracked:
// when the AI is down the widget silently uses rule-based replies, so
// no reliable unanswered-signal exists — better to say so than to
// invent a number.
export const chatbotAnalytics = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalConversations, openConversations, takenOver, openTickets,
    totalTickets, productCardsShown, userMessages, staffList] = await Promise.all([
    ChatConversation.countDocuments({ createdAt: { $gte: since } }),
    ChatConversation.countDocuments({ status: "open" }),
    ChatConversation.countDocuments({ takenOverBy: { $ne: null } }),
    SupportTicket.countDocuments({ status: { $in: ["Pending", "Under Review"] } }),
    SupportTicket.countDocuments({ createdAt: { $gte: since } }),
    ChatConversation.aggregate([
      { $unwind: "$messages" },
      { $match: { "messages.from": "bot", "messages.products.0": { $exists: true } } },
      { $count: "n" },
    ]),
    ChatConversation.aggregate([
      { $unwind: "$messages" },
      { $match: { "messages.from": "user" } },
      { $count: "n" },
    ]),
    User.find({ role: { $in: ["admin", "vice-admin"] } }).select("name email role").lean(),
  ]);
  res.json({
    analytics: {
      days: 30,
      totalConversations,
      openConversations,
      takenOver,
      openTickets,
      totalTickets,
      productCardsShown: productCardsShown[0]?.n || 0,
      customerMessages: userMessages[0]?.n || 0,
    },
    staff: staffList,
  });
});
