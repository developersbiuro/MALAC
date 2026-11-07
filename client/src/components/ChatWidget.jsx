import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, PackageSearch } from "lucide-react";
import api from "../api/client.js";
import { useAppMode } from "../utils/appMode.js";

// MALAC Assistant — a small rule-based, fully client-side chat (v1: no AI
// backend). It can:
//   - search products via GET /products/suggest and link to product pages,
//   - track an order via the public POST /orders/track (order ID ya phone),
//   - answer store FAQs (delivery, payment, returns, contact) by keyword,
//     in English + Roman Urdu.
// Conversation lives in component state only; nothing is persisted and no
// calls are made besides suggest/track.

const WHATSAPP_URL = "https://wa.me/923236016684";

const QUICK_REPLIES = [
  { label: "Product dhundhein", text: "Product dhundhna hai" },
  { label: "Order track karein", text: "Order track karna hai" },
  { label: "Delivery info", text: "Delivery charges aur time?" },
  { label: "Payment tareeqa", text: "Payment ka tareeqa kya hai?" },
  { label: "WhatsApp par baat karein", href: WHATSAPP_URL },
];

const GREETING =
  "Assalam-o-Alaikum! Main MALAC Assistant hoon. Product dhundhne, order track karne ya delivery/payment ki maloomat me main madad kar sakta hoon — neeche se choose karein ya apna sawal likhein.";

const FALLBACK =
  "Is bare me main abhi jawab nahi de paya. Aap product ka naam likh kar dhundh sakte hain, order track kar sakte hain, ya hum se WhatsApp par baat kar sakte hain.";

// FAQ intents: first match wins, so keep specific intents above generic ones.
const FAQS = [
  {
    keys: ["whatsapp", "contact", "baat kar", "insan", "human", "agent", "call kar", "rabta"],
    text: "Aap hum se WhatsApp par foran baat kar sakte hain — team wahan jawab degi.",
    link: { href: WHATSAPP_URL, label: "WhatsApp par message karein" },
  },
  {
    keys: ["track", "order kahan", "mera order", "order status", "parcel kahan"],
    text: "Order track karne ke liye apna order ID (jaise MLC-ABC123) ya wo phone number likhein jo order par diya tha — dono me se jo bhi likhein, order mil jayega. Ya seedha Track Order page use karein.",
    link: { to: "/track-order", label: "Track Order page kholein" },
  },
  {
    keys: ["return", "refund", "exchange", "wapis", "wapsi", "tabdeel"],
    text: "Returns aur exchange ki mukammal policy hamari Privacy & Policy page par hai. Koi masla ho to WhatsApp par bata dein, team madad kare gi.",
    link: { to: "/policy", label: "Policy page dekhein" },
  },
  {
    keys: ["payment", "jazzcash", "easypaisa", "paise", "cod", "cash on delivery", "advance"],
    text: "Payment ke teen tareeqay hain: (1) Cash on Delivery — paise parcel milne par; (2) JazzCash aur (3) Easypaisa — pehle transfer karke payment ka screenshot checkout par upload kar dein, hamari team verify karke order confirm kar degi.",
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
    keys: ["login", "sign up", "account", "order karna", "checkout"],
    text: "Order karne ke liye MALAC account me login hona zaroori hai (guest checkout nahi hota). Browsing aur cart baghair login ke bhi chal sakta hai — checkout ke waqt login maanga jata hai.",
    link: { to: "/login", label: "Login page kholein" },
  },
];

let msgSeq = 0;
const nextId = () => ++msgSeq;

export default function ChatWidget() {
  const appMode = useAppMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // The admin suite has its own chrome — never float over it.
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: nextId(), from: "bot", text: GREETING, quick: true }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const push = (...msgs) => setMessages((prev) => [...prev, ...msgs]);
  const botSay = (text, extra = {}) => ({ id: nextId(), from: "bot", text, ...extra });

  const goTo = (to) => { setOpen(false); navigate(to); };

  // body: { orderId } ya { phone } — server dono me se aik se dhoond leta hai.
  const trackWith = async (body) => {
    setBusy(true);
    try {
      const r = await api.post("/orders/track", body);
      const o = r.data.order || (r.data.orders || [])[0];
      const extra = !r.data.order && (r.data.orders || []).length > 1
        ? ` Is number par kul ${r.data.orders.length} orders hain — ye sab se recent hai; baqi Track Order page par milenge.`
        : "";
      push(botSay(
        `Order ${o.orderId} ka status: ${o.status}. Payment: ${o.paymentMethod} (${o.paymentStatus})` +
        (o.status === "Cancelled" && o.cancelReason ? ` — wajah: ${o.cancelReason}.` : "") +
        (["Shipped", "Delivered"].includes(o.status) && (o.courier || o.trackingId)
          ? ` — Courier: ${o.courier || "-"}${o.trackingId ? `, Tracking: ${o.trackingId}` : ""}.`
          : "") +
        (o.estimatedDelivery && o.status !== "Delivered" && o.status !== "Cancelled"
          ? ` — expected delivery ${new Date(o.estimatedDelivery).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}.`
          : ".") + extra,
        { link: { to: "/track-order", label: "Poori tafseel dekhein" } }
      ));
    } catch {
      push(botSay("Is se koi order match nahi hua. Order ID (jaise MLC-ABC123) ya order wala mukammal phone number dobara check karke likhein."));
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    push({ id: nextId(), from: "user", text });
    const lower = text.toLowerCase();

    // --- Order tracking: order ID ya phone number, jo bhi likha jay ---
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

    // --- FAQ intents ---
    if (FAQS[1].keys.some((k) => lower.includes(k))) { // tracking intent
      push(botSay("Zaroor! Apna order ID (jaise MLC-ABC123) ya order wala phone number likhein — main foran status bata deta hoon."));
      return;
    }
    for (const faq of FAQS) {
      if (faq.keys.some((k) => lower.includes(k))) {
        push(botSay(faq.text, faq.link ? { link: faq.link } : {}));
        return;
      }
    }

    // --- Product search ---
    if (["dhundh", "dhundo", "product", "chahiye", "dikhao", "show"].some((k) => lower.includes(k)) || text.split(/\s+/).length <= 4) {
      setBusy(true);
      try {
        const r = await api.get("/products/suggest", { params: { q: text } });
        const found = (r.data.suggestions || []).slice(0, 3);
        if (found.length > 0) {
          push(botSay(`"${text}" ke liye ye products mile:`, {
            products: found.map((s) => ({ slug: s.slug, title: s.title, category: s.category })),
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

  const panelBottom = appMode ? "bottom-20" : "bottom-20 sm:bottom-24";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
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
              <p className="text-sm font-semibold leading-tight">MALAC Assistant</p>
              <p className="text-[11px] text-white/60 leading-tight">Products, orders aur maloomat — foran jawab</p>
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
                    : "bg-white border border-cream-line text-lux-ink rounded-bl-md shadow-sm"
                }`}>
                  {m.text}
                  {m.products && (
                    <span className="block mt-2 space-y-1.5">
                      {m.products.map((p) => (
                        <button
                          key={p.slug}
                          type="button"
                          onClick={() => goTo(`/product/${p.slug}`)}
                          className="block w-full text-left bg-cream-soft hover:bg-cream-deep/70 border border-cream-line rounded-xl px-3 py-2 transition-colors"
                        >
                          <span className="block text-[13px] font-medium text-lux-ink leading-snug">{p.title}</span>
                          <span className="block text-[11px] text-lux-burnt">{p.category}</span>
                        </button>
                      ))}
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
                </div>
                {m.quick && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {QUICK_REPLIES.map((q) => (
                      q.href ? (
                        <a key={q.label} href={q.href} target="_blank" rel="noreferrer"
                          className="text-xs font-medium bg-white border border-lux-amber/50 text-lux-burnt rounded-full px-3 py-1.5 hover:bg-cream-soft">
                          {q.label}
                        </a>
                      ) : (
                        <button key={q.label} type="button" onClick={() => handleSend(q.text)}
                          className="text-xs font-medium bg-white border border-lux-amber/50 text-lux-burnt rounded-full px-3 py-1.5 hover:bg-cream-soft">
                          {q.label}
                        </button>
                      )
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
