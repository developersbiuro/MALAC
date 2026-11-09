import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, PackageSearch, ShoppingCart, Minus, Plus, Trash2, Check } from "lucide-react";
import api from "../api/client.js";
import { useAppMode } from "../utils/appMode.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { hasSession, loginPath } from "../utils/authGate.js";

// MALAC Assistant (v3 — master-prompt build).
//
// Layers, fastest first:
//  1. Deterministic tools (instant, database-true): order tracking with
//     the Daraz-style own-orders picker, structured browse ("2000 ke
//     andar shoes dikhao" → real filtered DB query), compare/similar,
//     cart view, support-ticket intake, cancellation guidance.
//  2. FAQ rules for the store's fixed policies.
//  3. The AI layer (POST /assistant/chat, Gemini free tier) for
//     everything else — grounded in the full live catalogue, the real
//     store Settings, owner FAQs and the customer's cart (priced
//     server-side). Any AI failure silently falls back to product
//     search + rules, so the chat always works.
//
// Persistence: every turn is stored server-side (ChatConversation)
// keyed by a random local session id; signed-in customers' chats
// attach to their account. Admin replies/takeover arrive by polling
// while the panel is open — when a human takes over, the bot steps
// aside honestly (it never pretends a human is the bot or vice versa).
// Config (enabled / name / welcome) comes from Admin → Chatbot.

const WHATSAPP_URL = "https://wa.me/923236016684";

const QUICK_REPLIES = [
  { label: "Find Products", text: "Product dhundhna hai" },
  { label: "Track My Order", text: "Order track karna hai" },
  { label: "Shopping Assistance", text: "Shopping me madad chahiye" },
  { label: "Delivery Information", text: "Delivery charges aur time?" },
  { label: "Return & Refund", text: "Return karna hai" },
  { label: "Contact Support", text: "Support se baat karni hai" },
];

const DEFAULT_GREETING =
  "Welcome to MALAC! 👋 I'm your AI Shopping Assistant. How can I help you today? Product dhundhne, order track karne ya delivery/payment ki maloomat ke liye neeche se choose karein ya apna sawal likhein.";

const FALLBACK =
  "Is bare me main abhi jawab nahi de paya. Aap product ka naam likh kar dhundh sakte hain, order track kar sakte hain, ya hum se WhatsApp par baat kar sakte hain.";

// FAQ intents: first match wins, so keep specific intents above generic ones.
const FAQS = [
  {
    keys: ["whatsapp", "contact", "baat kar", "insan", "human", "agent", "call kar", "rabta", "support se", "support ticket"],
    text: "Aap hum se WhatsApp par foran baat kar sakte hain — team wahan jawab degi. Ya yahin 'ticket' likh dein, main aap ki support request admin tak pohncha dunga.",
    link: { href: WHATSAPP_URL, label: "WhatsApp par message karein" },
  },
  {
    keys: ["track", "order kahan", "mera order", "order status", "parcel kahan"],
    text: "Order track karne ke liye apna order ID (jaise MLC-ABC123) ya wo phone number likhein jo order par diya tha — dono me se jo bhi likhein, order mil jayega. Ya seedha Track Order page use karein.",
    link: { to: "/track-order", label: "Track Order page kholein" },
  },
  {
    keys: ["return", "refund", "exchange", "wapis", "wapsi", "tabdeel", "kharab", "damage", "ghalat product", "wrong item"],
    text: "Return/exchange sirf 7 din ke andar, damaged/defective ya ghalat item par hota hai. Agar aap ka yahi masla hai to 'ticket' likh dein — main aap ki request admin tak pohncha dunga, faisla admin karega. Mukammal policy Policy page par hai.",
    link: { to: "/policy", label: "Policy page dekhein" },
  },
  {
    keys: ["payment", "jazzcash", "easypaisa", "paise", "cod", "cash on delivery", "advance"],
    text: "Payment ke tareeqay ye hain: (1) Cash on Delivery — paise parcel milne par; (2) JazzCash / Easypaisa — pehle transfer karke screenshot checkout par upload kar dein; (3) Meezan Bank transfer, ya NayaPay / SadaPay / FirstPay (HBL Microfinance) se store ke number par bhejein aur screenshot upload kar dein. Hamari team payment verify karke order confirm kar degi.",
  },
  {
    keys: ["delivery", "shipping", "charges", "kitne din", "kab milega", "kab ayega", "ship"],
    text: "Delivery pure Pakistan me 2–5 working days me ho jati hai. Standard delivery Rs. 199 aur Express Rs. 399 hai — aur Rs. 5,000 se zyada ke orders par delivery bilkul FREE hai.",
  },
  {
    keys: ["free shipping", "free delivery"],
    text: "Ji haan — Rs. 5,000 ya us se zyada ke order par delivery FREE hai. Us se kam par standard delivery Rs. 199 hai.",
  },
  {
    keys: ["login", "sign up", "account", "order karna", "checkout", "password bhool", "forgot"],
    text: "MALAC par sirf browsing baghair account ke ho sakti hai — cart, wishlist, order tracking, chat aur order karna, har function ke liye login/sign up zaroori hai. Password bhool jayein to Login page par 'Forgot password' se reset ho jata hai.",
    link: { to: "/login", label: "Login page kholein" },
  },
  {
    keys: ["cancel"],
    text: "Order cancel sirf tab ho sakta hai jab parcel ship na hua ho (Pending / Processing). My Orders page par apne order ke neeche 'Cancel Order' button hai — wajah select karke confirm kar dein. Shipped order cancel nahi hota; masla ho to 'ticket' likh kar support request bhej dein.",
    link: { to: "/orders", label: "My Orders kholein" },
  },
];

// Support-ticket categories offered in the intake flow.
const TICKET_TYPES = [
  { key: "return", label: "Return request" },
  { key: "exchange", label: "Exchange" },
  { key: "refund", label: "Refund inquiry" },
  { key: "damaged", label: "Damaged product" },
  { key: "wrong_item", label: "Wrong product mila" },
  { key: "missing_item", label: "Item missing hai" },
  { key: "delivery_issue", label: "Delivery ka masla" },
  { key: "general", label: "General support" },
];

const getSessionId = () => {
  try {
    let id = localStorage.getItem("malac_chat_session");
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("malac_chat_session", id);
    }
    return id;
  } catch {
    return `s-${Date.now().toString(36)}-guest`;
  }
};

const timeOf = (ts) =>
  new Date(ts || Date.now()).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });

let msgSeq = 0;
const nextId = () => ++msgSeq;

export default function ChatWidget() {
  const appMode = useAppMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cart = useCart();
  const { user } = useAuth();
  // Guest lock (Abdullah, 2026-11-09): the assistant is a function, not
  // browsing — guests tapping the bubble go to login and come back here.
  const authed = !!user || hasSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(null); // { enabled, name, welcome }
  const [fees, setFees] = useState({ std: 199, exp: 399, free: 5000 }); // live Settings, fetched below
  const [takeover, setTakeover] = useState(false);
  const [addedKey, setAddedKey] = useState("");
  const scrollRef = useRef(null);
  const sessionRef = useRef(getSessionId());
  const lastPollRef = useRef(null);
  const logQueueRef = useRef([]);
  const logTimerRef = useRef(null);

  // The admin suite has its own chrome — never float over it.
  const isAdmin = pathname.startsWith("/admin");

  // Bot config from the server (Admin → Chatbot controls it).
  useEffect(() => {
    api.get("/assistant/config")
      .then((r) => setConfig(r.data.chatbot))
      .catch(() => setConfig({ enabled: true, name: "MALAC Assistant", welcome: "" }));
    // Real delivery fees from the store Settings — the bot must quote
    // the CURRENT charges, never a hard-coded copy.
    api.get("/settings/public")
      .then((r) => {
        const p = r.data.payments || {};
        setFees({
          std: p.defaultShippingFee ?? 199,
          exp: p.expressShippingFee ?? 399,
          free: p.freeShippingThreshold ?? 5000,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      push({
        id: nextId(), from: "bot", at: Date.now(),
        text: config?.welcome || DEFAULT_GREETING, quick: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  // Admin replies arrive by polling while the panel is open.
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    const poll = () => {
      const since = lastPollRef.current ? `&since=${encodeURIComponent(lastPollRef.current)}` : "";
      api.get(`/assistant/poll?sessionId=${sessionRef.current}${since}`)
        .then((r) => {
          if (!alive) return;
          setTakeover(!!r.data.takeover);
          const fresh = r.data.messages || [];
          if (fresh.length) {
            lastPollRef.current = fresh[fresh.length - 1].at;
            push(...fresh.map((m) => ({
              id: nextId(), from: "admin", text: m.text, at: new Date(m.at).getTime(),
            })));
          }
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Conversation persistence: every locally-produced turn (rule-based
  // FAQ, tracking, browse, ticket steps…) is queued here and flushed to
  // POST /assistant/log so Admin → Chatbot can read the WHOLE chat, not
  // just AI turns. Turns the /assistant/chat route already stored are
  // marked noLog by the caller; the server also de-duplicates repeats.
  const flushLog = () => {
    const entries = logQueueRef.current.splice(0, 50);
    if (!entries.length) return;
    api.post("/assistant/log", { sessionId: sessionRef.current, entries }).catch(() => {});
  };
  const queueLog = (m) => {
    logQueueRef.current.push({
      from: m.from, text: m.text,
      products: (m.products || []).map((p) => ({
        slug: p.slug, title: p.title, category: p.category,
        image: p.image, price: p.price, wasPrice: p.wasPrice,
      })),
    });
    if (logTimerRef.current) clearTimeout(logTimerRef.current);
    logTimerRef.current = setTimeout(flushLog, 4000);
  };

  const push = (...msgs) => {
    for (const m of msgs) {
      if ((m.from === "user" || m.from === "bot") && !m.noLog) queueLog(m);
    }
    setMessages((prev) => [...prev, ...msgs]);
  };
  const botSay = (text, extra = {}) => ({ id: nextId(), from: "bot", text, at: Date.now(), ...extra });
  const userSay = (text) => ({ id: nextId(), from: "user", text, at: Date.now() });

  const messagesRef = useRef([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Daraz-style order picker state: while a tracking picker/input is
  // pending, the candidate orders live here so an unclear reply
  // ("konsa?") re-shows them instantly instead of hitting the AI layer.
  const awaitingRef = useRef(null); // null | "track-choice" | "track-input" | "ticket"
  const choicesRef = useRef(null);
  const ticketRef = useRef(null); // { type?, orderId?, step }

  const goTo = (to) => { setOpen(false); navigate(to); };

  // ---- Product cards: Add to Cart through the real cart ----
  const addToCart = (p) => {
    if (!p.id || p.outOfStock) return;
    if (!cart.add(
      { _id: p.id, title: p.title, images: [p.image || ""], sku: p.sku || "", stock: p.stock ?? 99, salePrice: p.wasPrice > 0 ? p.price : 0, basePrice: p.wasPrice > 0 ? p.wasPrice : p.price },
      1
    )) {
      push(botSay("Cart me daalne ke liye pehle login/sign up kar lein — browsing baghair account ke ho sakti hai, baqi har function ke liye account chahiye.", { link: { to: "/login", label: "Login / Sign Up karein" } }));
      return;
    }
    setAddedKey(p.slug);
    setTimeout(() => setAddedKey(""), 1500);
  };

  // ---- Cart view inside chat ----
  const showCart = () => {
    if (!cart.items.length) {
      push(botSay("Aap ka cart abhi khaali hai. Koi product pasand aye to card par 'Add to Cart' dabayein, ya mujhe naam likh dein — main dhundh deta hoon.", { quick: true }));
      return;
    }
    push(botSay(`Aap ke cart me ${cart.count} item(s) hain — kul Rs. ${cart.subtotal.toLocaleString("en-PK")} (delivery alag, Rs. 5,000+ par FREE).`, { cartView: true }));
  };

  // ---- Order tracking (Daraz-style picker, as before) ----
  const customerStatus = (s) => (s === "Confirmed" || s === "Packed" ? "Processing" : s);
  const choiceOf = (o) => ({
    orderId: o.orderId,
    status: customerStatus(o.status),
    title: o.items?.[0]?.title || "",
    date: o.createdAt
      ? new Date(o.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })
      : "",
  });

  const trackWith = async (body) => {
    setBusy(true);
    try {
      const r = await api.post("/orders/track", body);
      const list = r.data.orders || [];
      if (!r.data.order && list.length > 1) {
        const cs = list.slice(0, 5).map(choiceOf);
        choicesRef.current = cs;
        awaitingRef.current = "track-choice";
        push(botSay(`Is number par ${list.length} orders mile hain. In me se konsa track karna hai? Neeche tap karein, ya apna order ID likh dein.`, { choices: cs }));
        return;
      }
      const o = r.data.order || list[0];
      awaitingRef.current = null;
      choicesRef.current = null;
      const itemsLine = (o.items || []).length
        ? ` Items: ${o.items.map((i) => `${i.title} x${i.qty}`).join(", ")}. Kul Rs. ${Number(o.total || 0).toLocaleString("en-PK")}.`
        : "";
      push(botSay(
        `Order ${o.orderId} ka status: ${o.status}. Payment: ${o.paymentMethod} (${o.paymentStatus})` +
        (o.status === "Cancelled" && o.cancelReason ? ` — wajah: ${o.cancelReason}.` : "") +
        (["Shipped", "Delivered"].includes(o.status) && (o.courier || o.trackingId)
          ? ` — Courier: ${o.courier || "-"}${o.trackingId ? `, Tracking: ${o.trackingId}` : ""}.`
          : "") +
        (o.estimatedDelivery && o.status !== "Delivered" && o.status !== "Cancelled"
          ? ` — expected delivery ${new Date(o.estimatedDelivery).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}.`
          : ".") + itemsLine,
        { link: { to: "/track-order", label: "Poori tafseel dekhein" } }
      ));
    } catch {
      awaitingRef.current = "track-input";
      push(botSay("Is se koi order match nahi hua. Order ID (jaise MLC-ABC123) ya order wala mukammal phone number dobara check karke likhein."));
    } finally {
      setBusy(false);
    }
  };

  const startTracking = async () => {
    if (localStorage.getItem("malac_token")) {
      setBusy(true);
      try {
        const r = await api.get("/orders/my");
        const mine = (r.data.orders || []).slice(0, 5);
        if (mine.length > 0) {
          const cs = mine.map(choiceOf);
          choicesRef.current = cs;
          awaitingRef.current = "track-choice";
          push(botSay("Aap ke recent orders ye hain — jisay track karna hai us par tap karein. Ya apna order ID / phone number likh dein.", { choices: cs }));
          return;
        }
        awaitingRef.current = "track-input";
        push(botSay("Aap ke account me abhi koi order nahi mila. Agar order kisi aur number se kiya tha to wo phone number ya order ID likh dein — main check kar deta hoon."));
        return;
      } catch {
        // Token expired/invalid — generic prompt below.
      } finally {
        setBusy(false);
      }
    }
    awaitingRef.current = "track-input";
    push(botSay("Zaroor! Apna order ID (jaise MLC-ABC123) ya order wala phone number likhein — main foran status bata deta hoon."));
  };

  const pickOrder = (c) => {
    if (busy) return;
    awaitingRef.current = null;
    choicesRef.current = null;
    push(userSay(c.orderId));
    trackWith({ orderId: c.orderId });
  };

  // ---- Support ticket intake (step flow, saved server-side) ----
  const startTicket = () => {
    ticketRef.current = { step: "type" };
    awaitingRef.current = "ticket";
    push(botSay("Bilkul, main aap ki support request admin tak pohncha deta hoon. Pehle ye batayein masla kis qisam ka hai?", { ticketTypes: TICKET_TYPES }));
  };

  const pickTicketType = (t) => {
    push(userSay(t.label));
    ticketRef.current = { step: "order", type: t.key };
    push(botSay("Agar ye kisi order ke bare me hai to apna Order ID likh dein (jaise MLC-ABC123) — warna 'skip' likh dein."));
  };

  const finishTicket = async (description) => {
    const t = ticketRef.current || {};
    setBusy(true);
    let keepFlow = false; // phone-verification retry keeps the flow alive
    try {
      const body = { type: t.type || "general", description };
      if (t.orderId) body.orderId = t.orderId;
      if (t.phone) body.phone = t.phone;
      const r = await api.post("/assistant/tickets", body);
      const tk = r.data.ticket;
      push(botSay(`Aap ki request save ho gayi hai. Ticket ID: ${tk.ticketId} — status abhi 'Pending' hai, admin review karke jawab dega. Apne tickets My Orders page ke neeche 'My Support Tickets' me bhi dekh sakte hain. Shukriya!`));
    } catch (e) {
      const msg = e?.response?.data?.message;
      if (msg && /phone number used at checkout/i.test(msg) && t.orderId && !t.phone) {
        keepFlow = true;
        ticketRef.current = { ...t, step: "phone", pendingDescription: description };
        push(botSay("Order verify karne ke liye wo phone number likh dein jo checkout par diya tha — phir request bhej deta hoon."));
        return;
      }
      push(botSay(msg || "Request abhi save nahi ho saki. Thodi der baad dobara try karein, ya WhatsApp par bata dein.", { link: { href: WHATSAPP_URL, label: "WhatsApp par message karein" } }));
    } finally {
      if (!keepFlow) {
        ticketRef.current = null;
        awaitingRef.current = null;
      }
      setBusy(false);
    }
  };

  const handleTicketStep = (text) => {
    const t = ticketRef.current || {};
    if (t.step === "order") {
      const idMatch = text.match(/MLC[-\s]?[A-Z0-9][A-Z0-9-]{3,}/i);
      if (idMatch) ticketRef.current = { ...t, step: "desc", orderId: idMatch[0].toUpperCase() };
      else ticketRef.current = { ...t, step: "desc" };
      push(botSay("Ab apna masla thori tafseel se likh dein — kya hua, kab hua? (kam az kam 2-3 jumlay)"));
      return true;
    }
    if (t.step === "desc") {
      if (text.trim().length < 10) {
        push(botSay("Thori si aur tafseel likh dein taake admin ko masla samajh aye."));
        return true;
      }
      finishTicket(text.trim());
      return true;
    }
    if (t.step === "phone") {
      ticketRef.current = { ...t, phone: text.trim() };
      finishTicket(t.pendingDescription || "Support request");
      return true;
    }
    return false;
  };

  // ---- Structured browse / compare (instant DB tools) ----
  const tryBrowse = async (text) => {
    try {
      const r = await api.post("/assistant/browse", { message: text });
      const found = r.data.products || [];
      if (!found.length && !r.data.filter) return false;
      if (!found.length) {
        push(botSay("Is filter par abhi koi product available nahi hai. Price range ya category badal kar try karein — ya product ka naam likh dein."));
        return true;
      }
      push(botSay("Ye rahe matching products — card par tap karke tafseel dekhein, ya wahin se cart me daal lein:", { products: found }));
      return true;
    } catch {
      return false;
    }
  };

  const tryCompare = async (text) => {
    try {
      const r = await api.post("/assistant/compare", { message: text });
      if (r.data.compare) {
        push(botSay("Dono products ka muqabla neeche de diya hai — tafseel table me hai:", { compare: r.data.compare, products: r.data.products || [] }));
        return true;
      }
      if (r.data.similarTo && (r.data.products || []).length) {
        push(botSay(`"${r.data.similarTo}" jaisi aur items ye hain:`, { products: r.data.products }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSend = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    if (!authed) {
      // Guest lock: no chat function without an account (server agrees — 401).
      push(userSay(text));
      push(botSay("MALAC Assistant aur baqi tamam functions sirf signed-in customers ke liye hain. Pehle login ya sign up kar lein — browsing baghair account ke bhi ho sakti hai.", { link: { to: "/login", label: "Login / Sign Up karein" } }));
      return;
    }
    push(userSay(text));
    const lower = text.toLowerCase();

    // --- Support ticket flow consumes its own steps first ---
    if (awaitingRef.current === "ticket" && handleTicketStep(text)) return;
    if (["ticket", "support ticket", "complaint", "shikayat", "masla hai", "problem hai"].some((k) => lower.includes(k))) {
      startTicket();
      return;
    }

    // --- Order tracking: order ID ya phone number ---
    const idMatch = text.match(/MLC[-\s]?[A-Z0-9][A-Z0-9-]{3,}/i);
    if (idMatch) {
      trackWith({ orderId: idMatch[0].toUpperCase() });
      return;
    }
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13 && !/[a-z]/i.test(text.replace(/mlc/i, ""))) {
      trackWith({ phone: text });
      return;
    }

    // --- Tracking picker open: unclear replies re-show it instantly ---
    if (awaitingRef.current) {
      const isNewIntent = FAQS.some((f) => f.keys.some((k) => lower.includes(k)));
      if (!isNewIntent) {
        if (choicesRef.current?.length) {
          push(botSay("In me se konsa order track karna hai? Neeche kisi order par tap karein, ya apna order ID likh dein.", { choices: choicesRef.current }));
        } else {
          push(botSay("Order track karne ke liye apna order ID (jaise MLC-ABC123) ya order wala phone number likhein — main foran status bata deta hoon."));
        }
        return;
      }
      awaitingRef.current = null;
      choicesRef.current = null;
    }

    // --- Cart view ---
    if (/\b(cart|basket|tokri)\b/i.test(text) && /\b(show|dikhao|dekho|view|kholo|kya hai|empty|khaali)\b/i.test(text)) {
      showCart();
      return;
    }

    // --- FAQ intents (tracking first: it opens the picker) ---
    if (FAQS[1].keys.some((k) => lower.includes(k))) {
      startTracking();
      return;
    }
    if (FAQS[2].keys.some((k) => lower.includes(k)) && /\b(return|refund|exchange|wapis|kharab|damage|ghalat|wrong)\b/i.test(text) && /\b(karna|chahiye|hai|karna hai|process)\b/i.test(text)) {
      // A return/complaint ACTION (not just policy info) → intake flow.
      startTicket();
      return;
    }
    // --- Delivery fees: quoted from the LIVE store Settings ---
    if (FAQS[5].keys.some((k) => lower.includes(k))) {
      push(botSay(`Rs. ${fees.free.toLocaleString("en-PK")} ya us se zyada ke order par delivery bilkul FREE hai. Us se kam par standard delivery Rs. ${fees.std} hai.`));
      return;
    }
    if (FAQS[4].keys.some((k) => lower.includes(k))) {
      push(botSay(`Delivery pure Pakistan me 2–5 working days me ho jati hai (Express 1–2 din). Standard delivery Rs. ${fees.std} aur Express Rs. ${fees.exp} hai — aur Rs. ${fees.free.toLocaleString("en-PK")} se zyada ke orders par delivery bilkul FREE hai.`));
      return;
    }
    for (const faq of FAQS) {
      if (faq.keys.some((k) => lower.includes(k))) {
        push(botSay(faq.text, faq.link ? { link: faq.link } : {}));
        return;
      }
    }

    // --- Compare / similar (deterministic, DB-true) ---
    if (/\b(compare|muqabla|difference|farq|vs|versus|similar|jaisa|jaisi|alternative|mutabadil)\b/i.test(text)) {
      setBusy(true);
      const done = await tryCompare(text);
      setBusy(false);
      if (done) return;
    }

    // --- Structured browse (budget/category/sale/latest → real query) ---
    if (await tryBrowse(text)) return;

    // --- Admin takeover: the human owns the conversation now ---
    if (takeover) {
      push(botSay("Aap ki baat hamare support member tak pohnch gayi hai — wo yahin jawab dein ge. Thora intezar kar lein, ya jaldi ho to WhatsApp par message kar dein.", { link: { href: WHATSAPP_URL, label: "WhatsApp par message karein" } }));
      return;
    }

    // --- AI layer (Gemini) ---
    setBusy(true);
    let aiAnswered = false;
    try {
      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ from: m.from === "user" ? "user" : "bot", text: m.text }));
      const cartPayload = cart.items.map((i) => ({ product: i.product, qty: i.qty }));
      const r = await api.post("/assistant/chat", {
        message: text, history, cart: cartPayload, sessionId: sessionRef.current,
      });
      if (r.data?.takeover) {
        setTakeover(true);
        aiAnswered = true;
        // The server stored the customer's message; this bot line is
        // local-only, so it goes through the log queue (no noLog flag).
        push(botSay("Aap ki conversation ab hamare support member ke paas hai — wo yahin jawab dein ge."));
      } else if (r.data?.reply) {
        aiAnswered = true;
        // Server already persisted this turn in /assistant/chat.
        push(botSay(r.data.reply, {
          noLog: true,
          ...(r.data.products?.length ? { products: r.data.products } : {}),
          ...(r.data.compare ? { compare: r.data.compare } : {}),
        }));
      }
    } catch {
      // AI unavailable — rule-based fallback below.
    } finally {
      setBusy(false);
    }
    if (aiAnswered) return;

    // --- Product search (classic fallback) ---
    if (["dhundh", "dhundo", "product", "chahiye", "dikhao", "show"].some((k) => lower.includes(k)) || text.split(/\s+/).length <= 4) {
      setBusy(true);
      try {
        const r = await api.get("/products/suggest", { params: { q: text } });
        const found = (r.data.suggestions || []).slice(0, 3);
        if (found.length > 0) {
          push(botSay(`"${text}" ke liye ye products mile:`, {
            products: found.map((s) => ({
              id: s.id || "", slug: s.slug, title: s.title, category: s.category,
              image: s.image || "", price: s.price || 0,
              wasPrice: s.wasPrice || 0, outOfStock: !!s.outOfStock,
            })),
          }));
        } else {
          push(botSay(`"${text}" se koi product match nahi hua. Koi aur naam ya category likh kar try karein (jaise "lawn suit" ya "watch").`), { quick: true });
        }
      } catch {
        push(botSay("Search abhi kaam nahi kar rahi, thodi der baad try karein. Ya Shop page se browse kar lein.", { link: { to: "/shop", label: "Shop page kholein" } }));
      } finally {
        setBusy(false);
      }
      return;
    }

    push(botSay(FALLBACK, { quick: true }));
  };

  if (isAdmin) return null;
  if (config && config.enabled === false) return null;

  const panelBottom = appMode ? "bottom-20" : "bottom-20 sm:bottom-24";
  const botName = config?.name || "MALAC Assistant";

  const ProductCard = (p) => (
    <div key={p.slug} className="bg-cream-soft border border-cream-line rounded-xl px-3 py-2">
      <button type="button" onClick={() => goTo(`/product/${p.slug}`)} className="block w-full text-left">
        <span className="flex items-center gap-2.5">
          {p.image && (
            <img src={p.image} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover border border-cream-line shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-lux-ink leading-snug">{p.title}</span>
            <span className="block text-[11px] text-lux-burnt">{p.category}</span>
            {p.price > 0 && (
              <span className="block text-[12px] font-semibold text-lux-ink">
                Rs. {p.price.toLocaleString("en-PK")}
                {p.wasPrice > 0 && (
                  <span className="ml-1.5 font-normal text-gray-400 line-through">Rs. {p.wasPrice.toLocaleString("en-PK")}</span>
                )}
                {p.outOfStock && <span className="ml-1.5 font-semibold text-red-500">Out of stock</span>}
              </span>
            )}
          </span>
        </span>
      </button>
      {p.id && !p.outOfStock && (
        <button
          type="button"
          onClick={() => addToCart(p)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold bg-lux-gradient text-white rounded-full px-2.5 py-1"
        >
          {addedKey === p.slug ? <><Check size={12} /> Added</> : <><ShoppingCart size={12} /> Add to Cart</>}
        </button>
      )}
    </div>
  );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => (authed ? setOpen(true) : navigate(loginPath(pathname)))}
          aria-label="MALAC Assistant se chat karein"
          className={`fixed right-4 z-50 w-14 h-14 rounded-full bg-lux-gradient text-white shadow-lg flex items-center justify-center hover:brightness-105 active:brightness-95 transition ${appMode ? "bottom-20" : "bottom-20 sm:bottom-6"}`}
        >
          <MessageCircle size={26} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="MALAC Assistant chat"
          className={`fixed right-3 sm:right-4 z-50 w-[calc(100vw-1.5rem)] max-w-[360px] bg-white border border-cream-line rounded-2xl shadow-2xl flex flex-col overflow-hidden fade-up ${panelBottom}`}
          style={{ height: "min(70vh, 560px)" }}
        >
          <div className="bg-lux-ink text-white px-4 py-3 flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full bg-lux-gradient flex items-center justify-center shrink-0">
              <MessageCircle size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{botName}</p>
              <p className="text-[11px] text-white/60 leading-tight">
                {takeover ? "Support member se connected" : "Products, orders aur maloomat — foran jawab"}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Chat band karein" className="p-1.5 hover:bg-white/10 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-cream-soft/60">
            {messages.map((m) => (
              <div key={m.id}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                  m.from === "user"
                    ? "ml-auto bg-lux-gradient text-white rounded-br-md"
                    : m.from === "admin"
                      ? "bg-lux-ink text-white rounded-bl-md shadow-sm"
                      : "bg-white border border-cream-line text-lux-ink rounded-bl-md shadow-sm"
                }`}>
                  {m.from === "admin" && <span className="block text-[10px] font-semibold text-lux-amber mb-0.5">MALAC Support</span>}
                  {m.text}
                  {m.products && (
                    <span className="block mt-2 space-y-1.5">
                      {m.products.map((p) => ProductCard(p))}
                    </span>
                  )}
                  {m.compare && (
                    <span className="block mt-2 overflow-x-auto">
                      <table className="w-full text-[11px] border border-cream-line rounded-lg overflow-hidden">
                        <tbody>
                          <tr className="bg-cream-soft">
                            <td className="px-2 py-1 font-semibold"></td>
                            {m.compare.map((c) => (
                              <td key={c.slug} className="px-2 py-1 font-semibold text-lux-ink">{c.title}</td>
                            ))}
                          </tr>
                          {[
                            ["Price", (c) => `Rs. ${c.price.toLocaleString("en-PK")}${c.wasPrice > 0 ? ` (was Rs. ${c.wasPrice.toLocaleString("en-PK")})` : ""}`],
                            ["Category", (c) => c.category],
                            ["Stock", (c) => c.stock],
                            ["Rating", (c) => c.rating],
                            ["Options", (c) => c.options],
                          ].map(([label, fn]) => (
                            <tr key={label} className="border-t border-cream-line bg-white">
                              <td className="px-2 py-1 font-semibold text-lux-burnt">{label}</td>
                              {m.compare.map((c) => (
                                <td key={c.slug} className="px-2 py-1 text-lux-ink">{fn(c)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </span>
                  )}
                  {m.choices && (
                    <span className="block mt-2 space-y-1.5">
                      {m.choices.map((c) => (
                        <button
                          key={c.orderId}
                          type="button"
                          onClick={() => pickOrder(c)}
                          className="block w-full text-left bg-cream-soft hover:bg-cream-deep/70 border border-cream-line rounded-xl px-3 py-2 transition-colors"
                        >
                          <span className="block text-[13px] font-medium text-lux-ink leading-snug">{c.orderId} · {c.status}</span>
                          {(c.title || c.date) && (
                            <span className="block text-[11px] text-lux-burnt">{[c.title, c.date].filter(Boolean).join(" — ")}</span>
                          )}
                        </button>
                      ))}
                    </span>
                  )}
                  {m.ticketTypes && (
                    <span className="block mt-2 space-y-1.5">
                      {m.ticketTypes.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => pickTicketType(t)}
                          className="block w-full text-left bg-cream-soft hover:bg-cream-deep/70 border border-cream-line rounded-xl px-3 py-2 transition-colors text-[13px] font-medium text-lux-ink"
                        >
                          {t.label}
                        </button>
                      ))}
                    </span>
                  )}
                  {m.cartView && (
                    <span className="block mt-2 space-y-1.5">
                      {cart.items.map((i) => (
                        <span key={i.key} className="flex items-center gap-2 bg-cream-soft border border-cream-line rounded-xl px-2.5 py-1.5">
                          {i.image && <img src={i.image} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />}
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12px] font-medium text-lux-ink truncate">{i.title}</span>
                            <span className="block text-[11px] text-lux-burnt">Rs. {i.price.toLocaleString("en-PK")} x {i.qty}</span>
                          </span>
                          <button type="button" aria-label="Quantity kam karein" onClick={() => cart.updateQty(i.key, i.qty - 1)} className="p-1 border border-cream-line rounded-full bg-white"><Minus size={12} /></button>
                          <button type="button" aria-label="Quantity barhayein" onClick={() => cart.updateQty(i.key, i.qty + 1)} className="p-1 border border-cream-line rounded-full bg-white"><Plus size={12} /></button>
                          <button type="button" aria-label="Cart se hatayein" onClick={() => cart.remove(i.key)} className="p-1 border border-cream-line rounded-full bg-white text-red-500"><Trash2 size={12} /></button>
                        </span>
                      ))}
                      <button type="button" onClick={() => goTo("/checkout")} className="block w-full text-center bg-lux-gradient text-white text-[12px] font-semibold rounded-full px-3 py-2">
                        Checkout par jayein — Rs. {cart.subtotal.toLocaleString("en-PK")}
                      </button>
                    </span>
                  )}
                  {m.link && (
                    m.link.to ? (
                      <button type="button" onClick={() => goTo(m.link.to)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-lux-burnt underline underline-offset-2">
                        <PackageSearch size={13} /> {m.link.label}
                      </button>
                    ) : (
                      <a href={m.link.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-lux-burnt underline underline-offset-2">
                        <MessageCircle size={13} /> {m.link.label}
                      </a>
                    )
                  )}
                  <span className={`block mt-1 text-[10px] ${m.from === "user" || m.from === "admin" ? "text-white/60 text-right" : "text-gray-400"}`}>
                    {timeOf(m.at)}
                  </span>
                </div>
                {m.quick && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {QUICK_REPLIES.map((q) => (
                      <button key={q.label} type="button" onClick={() => handleSend(q.text)}
                        className="text-xs font-medium bg-white border border-lux-amber/50 text-lux-burnt rounded-full px-3 py-1.5 hover:bg-cream-soft">
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-white border border-cream-line text-sm text-gray-400 shadow-sm">
                Likh raha hoon…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 border-t border-cream-line px-2.5 py-2 shrink-0 bg-white"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Apna sawal likhein…"
              aria-label="Message likhein"
              className="flex-1 min-w-0 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-lux-amber"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Message bhejein"
              className="w-10 h-10 rounded-full bg-lux-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-40">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
