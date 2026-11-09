import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { customerContact } from "../../utils/customerContact.js";

// MALAC Assistant management (master-prompt §10): analytics strip,
// customer conversations (read / reply — replying takes the chat over
// from the bot), support tickets, and the chatbot settings + knowledge
// base editor. Everything here is gated server-side by the "chatbot"
// permission; records are never deleted, only closed/resolved.
const TICKET_STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Resolved"];
const TICKET_TYPES = {
  return: "Return", exchange: "Exchange", refund: "Refund", damaged: "Damaged",
  wrong_item: "Wrong item", missing_item: "Missing item",
  delivery_issue: "Delivery issue", general: "General",
};

const fmtWhen = (d) => (d ? new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export default function AdminChatbot() {
  const [tab, setTab] = useState("conversations");
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [staff, setStaff] = useState([]);

  const [convos, setConvos] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openConvo, setOpenConvo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [tickets, setTickets] = useState([]);
  const [ticketQ, setTicketQ] = useState("");
  const [openTicket, setOpenTicket] = useState(null);
  const [ticketDraft, setTicketDraft] = useState({ status: "", reply: "", assignTo: "" });

  const [settings, setSettings] = useState(null);
  const [savedNote, setSavedNote] = useState("");

  const loadAnalytics = () => {
    api.get("/admin/chatbot/analytics")
      .then((r) => { setAnalytics(r.data.analytics); setStaff(r.data.staff || []); })
      .catch(() => {});
  };
  useEffect(loadAnalytics, []);

  const loadConvos = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/admin/chatbot/conversations?${params.toString()}`)
      .then((r) => setConvos(r.data.conversations))
      .catch(() => setError("Could not load conversations."));
  };
  useEffect(loadConvos, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTickets = () => {
    const params = new URLSearchParams();
    if (ticketQ) params.set("q", ticketQ);
    api.get(`/admin/chatbot/tickets?${params.toString()}`)
      .then((r) => setTickets(r.data.tickets))
      .catch(() => setError("Could not load tickets."));
  };
  useEffect(loadTickets, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSettings = () => {
    api.get("/admin/chatbot/settings")
      .then((r) => setSettings(r.data.chatbot))
      .catch(() => setError("Could not load chatbot settings."));
  };
  useEffect(loadSettings, []);

  const viewConvo = (id) => {
    api.get(`/admin/chatbot/conversations/${id}`)
      .then((r) => { setOpenConvo(r.data.conversation); setReplyText(""); })
      .catch(() => setError("Could not open that conversation."));
  };

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || !openConvo) return;
    try {
      const r = await api.post(`/admin/chatbot/conversations/${openConvo._id}/reply`, { text });
      setOpenConvo(r.data.conversation);
      setReplyText("");
      loadConvos();
    } catch { setError("Could not send that reply."); }
  };

  const convoAction = async (action) => {
    if (!openConvo) return;
    try {
      const r = await api.patch(`/admin/chatbot/conversations/${openConvo._id}`, { action });
      setOpenConvo(r.data.conversation);
      loadConvos();
    } catch { setError("Could not update that conversation."); }
  };

  const editTicket = (t) => {
    setOpenTicket(t);
    setTicketDraft({ status: t.status, reply: "", assignTo: t.assignedTo?._id || "" });
  };

  const saveTicket = async () => {
    if (!openTicket) return;
    try {
      const body = { status: ticketDraft.status, assignTo: ticketDraft.assignTo || null };
      if (ticketDraft.reply.trim()) body.reply = ticketDraft.reply.trim();
      const r = await api.patch(`/admin/chatbot/tickets/${openTicket._id}`, body);
      setOpenTicket(r.data.ticket);
      loadTickets();
      loadAnalytics();
    } catch { setError("Could not update that ticket."); }
  };

  const saveSettings = async () => {
    try {
      const r = await api.put("/admin/chatbot/settings", {
        enabled: settings.enabled, name: settings.name, welcome: settings.welcome,
        instructions: settings.instructions, faqs: settings.faqs,
      });
      setSettings(r.data.chatbot);
      setSavedNote("Saved — the storefront bot uses the new settings right away.");
      setTimeout(() => setSavedNote(""), 4000);
    } catch { setError("Could not save chatbot settings."); }
  };

  const badge = (s) => {
    const map = {
      Pending: "text-amber-700 bg-amber-50 border-amber-200",
      "Under Review": "text-sky-700 bg-sky-50 border-sky-200",
      Approved: "text-green-700 bg-green-50 border-green-200",
      Resolved: "text-green-700 bg-green-50 border-green-200",
      Rejected: "text-red-600 bg-red-50 border-red-200",
      open: "text-green-700 bg-green-50 border-green-200",
      closed: "text-gray-500 bg-gray-50 border-gray-200",
    };
    return <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${map[s] || map.closed}`}>{s}</span>;
  };

  const tabs = [
    { key: "conversations", label: "Conversations" },
    { key: "tickets", label: `Support Tickets${analytics?.openTickets ? ` (${analytics.openTickets})` : ""}` },
    { key: "settings", label: "Bot Settings & FAQs" },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold">MALAC Assistant — Chatbot</h1>
      <p className="text-sm text-gray-500 mt-1">
        Customer chats, support tickets and the bot's own settings. Replying to a conversation takes it over from the bot;
        the customer then sees your messages as MALAC Support.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
          {[
            ["Conversations (30d)", analytics.totalConversations],
            ["Open now", analytics.openConversations],
            ["Taken over", analytics.takenOver],
            ["Tickets (30d)", analytics.totalTickets],
            ["Open tickets", analytics.openTickets],
            ["Product cards shown", analytics.productCardsShown],
          ].map(([label, v]) => (
            <div key={label} className="bg-white border border-cream-line rounded-md p-3">
              <p className="text-lg font-bold leading-none">{v}</p>
              <p className="text-[11px] text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${tab === t.key ? "bg-lux-gradient text-white border-transparent" : "border-cream-line text-gray-600 bg-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conversations" && (
        <div className="mt-4">
          <div className="flex gap-2 flex-wrap">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadConvos()}
              placeholder="Search name, session or message text…" className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={loadConvos} className="px-4 py-2 rounded-full text-sm font-semibold bg-lux-gradient text-white">Search</button>
          </div>

          <div className="space-y-2 mt-3">
            {convos.map((c) => (
              <button key={c._id} onClick={() => viewConvo(c._id)}
                className="block w-full text-left bg-white rounded-md border border-cream-line p-3 hover:bg-cream-soft/60">
                <span className="flex items-center gap-2 flex-wrap">
                  <b className="text-sm">{c.customer?.name || c.customerName || "Guest"}</b>
                  {badge(c.status)}
                  {c.takenOver && <span className="text-[11px] font-semibold text-lux-burnt">Taken over</span>}
                  <span className="ml-auto text-xs text-gray-400">{fmtWhen(c.lastMessageAt)}</span>
                </span>
                <span className="block text-xs text-gray-500 mt-1 truncate">
                  {c.lastMessage ? `${c.lastMessage.from === "user" ? "Customer: " : c.lastMessage.from === "admin" ? "Support: " : "Bot: "}${c.lastMessage.text}` : "No messages"}
                  {" · "}{c.messageCount} messages
                  {c.customer ? ` · ${customerContact(c.customer).line}` : ""}
                </span>
              </button>
            ))}
            {convos.length === 0 && <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line">No conversations yet.</p>}
          </div>

          {openConvo && (
            <div className="bg-white rounded-md border border-cream-line p-4 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <b className="text-sm">{openConvo.user?.name || openConvo.customerName || "Guest"}</b>
                {badge(openConvo.status)}
                {openConvo.takenOverBy && <span className="text-[11px] font-semibold text-lux-burnt">You/your team are handling this chat</span>}
                <span className="ml-auto flex gap-2">
                  {openConvo.status === "open"
                    ? <button onClick={() => convoAction("close")} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-cream-line">Close</button>
                    : <button onClick={() => convoAction("reopen")} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-cream-line">Reopen</button>}
                  {openConvo.takenOverBy
                    ? <button onClick={() => convoAction("release")} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-cream-line">Give back to bot</button>
                    : <button onClick={() => convoAction("takeover")} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-cream-line">Take over</button>}
                </span>
              </div>
              {openConvo.user && <p className="text-xs text-gray-400 mt-1">{customerContact(openConvo.user).line}</p>}
              <div className="space-y-2 mt-3 max-h-[420px] overflow-y-auto pr-1">
                {(openConvo.messages || []).map((m, i) => (
                  <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                    m.from === "user"
                      ? "ml-auto bg-lux-gradient text-white rounded-br-md"
                      : m.from === "admin"
                        ? "bg-lux-ink text-white rounded-bl-md"
                        : "bg-cream-soft border border-cream-line text-lux-ink rounded-bl-md"
                  }`}>
                    {m.from === "admin" && <span className="block text-[10px] font-semibold text-lux-amber">MALAC Support</span>}
                    {m.from === "bot" && <span className="block text-[10px] font-semibold text-gray-400">Bot</span>}
                    {m.text}
                    {(m.products || []).length > 0 && (
                      <span className="block text-[11px] mt-1 opacity-70">Cards: {m.products.map((p) => p.title).join(" · ")}</span>
                    )}
                    <span className="block text-[10px] opacity-60 mt-0.5">{fmtWhen(m.at)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Reply as MALAC Support (sending takes over from the bot)…"
                  className="border rounded px-3 py-2 text-sm flex-1 min-w-0" />
                <button onClick={sendReply} className="px-4 py-2 rounded-full text-sm font-semibold bg-lux-gradient text-white shrink-0">Send</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "tickets" && (
        <div className="mt-4">
          <div className="flex gap-2">
            <input value={ticketQ} onChange={(e) => setTicketQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadTickets()}
              placeholder="Search ticket ID, order ID, name or phone…" className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]" />
            <button onClick={loadTickets} className="px-4 py-2 rounded-full text-sm font-semibold bg-lux-gradient text-white">Search</button>
          </div>
          <div className="space-y-2 mt-3">
            {tickets.map((t) => (
              <article key={t._id} className="bg-white rounded-md border border-cream-line p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-sm">{t.ticketId}</b>
                  <span className="text-xs text-gray-500">{TICKET_TYPES[t.type] || t.type}</span>
                  {badge(t.status)}
                  <span className="ml-auto text-xs text-gray-400">{fmtWhen(t.createdAt)}</span>
                </div>
                <p className="text-sm mt-1.5 whitespace-pre-wrap">{t.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {[t.name || t.user?.name, t.phone || t.user?.phone, t.orderId ? `Order ${t.orderId}` : "", t.assignedTo ? `Assigned: ${t.assignedTo.name}` : ""].filter(Boolean).join(" · ")}
                </p>
                {(t.replies || []).map((r, i) => (
                  <p key={i} className="text-sm mt-1.5 text-gray-700"><b>{r.by === "staff" ? "Support:" : "Customer:"}</b> {r.text} <span className="text-gray-400 text-xs">{fmtWhen(r.at)}</span></p>
                ))}
                <button onClick={() => editTicket(t)} className="mt-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-lux-amber/60 text-lux-burnt">Manage</button>
                {openTicket?._id === t._id && (
                  <div className="mt-3 border-t border-cream-line pt-3 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <select value={ticketDraft.status} onChange={(e) => setTicketDraft((d) => ({ ...d, status: e.target.value }))} className="border rounded px-3 py-2 text-sm bg-white">
                        {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={ticketDraft.assignTo} onChange={(e) => setTicketDraft((d) => ({ ...d, assignTo: e.target.value }))} className="border rounded px-3 py-2 text-sm bg-white">
                        <option value="">Unassigned</option>
                        {staff.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                      </select>
                    </div>
                    <input value={ticketDraft.reply} onChange={(e) => setTicketDraft((d) => ({ ...d, reply: e.target.value }))}
                      placeholder="Reply to the customer (they see it under My Tickets)…" className="border rounded px-3 py-2 text-sm w-full" />
                    <button onClick={saveTicket} className="px-4 py-2 rounded-full text-sm font-semibold bg-lux-gradient text-white">Save changes</button>
                  </div>
                )}
              </article>
            ))}
            {tickets.length === 0 && <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line">No tickets yet.</p>}
          </div>
        </div>
      )}

      {tab === "settings" && settings && (
        <div className="bg-white rounded-md border border-cream-line p-4 mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))} />
            Chatbot enabled on the storefront
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Bot name</label>
            <input value={settings.name} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} className="border rounded px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Welcome message</label>
            <textarea value={settings.welcome} onChange={(e) => setSettings((s) => ({ ...s, welcome: e.target.value }))} rows={3} className="border rounded px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Extra instructions for the AI (optional)</label>
            <textarea value={settings.instructions} onChange={(e) => setSettings((s) => ({ ...s, instructions: e.target.value }))} rows={3}
              placeholder="e.g. Eid sale: 10% off on Fashion till Sunday…" className="border rounded px-3 py-2 text-sm w-full" />
            <p className="text-xs text-gray-400 mt-1">Only state TRUE offers/facts here — the bot quotes these to customers.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Custom FAQs (the bot uses these answers first)</label>
            <div className="space-y-2">
              {(settings.faqs || []).map((f, i) => (
                <div key={i} className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input value={f.question} placeholder="Question"
                    onChange={(e) => setSettings((s) => ({ ...s, faqs: s.faqs.map((x, j) => j === i ? { ...x, question: e.target.value } : x) }))}
                    className="border rounded px-3 py-2 text-sm flex-1 min-w-[160px]" />
                  <input value={f.answer} placeholder="Answer"
                    onChange={(e) => setSettings((s) => ({ ...s, faqs: s.faqs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x) }))}
                    className="border rounded px-3 py-2 text-sm flex-[2] min-w-[200px]" />
                  <button onClick={() => setSettings((s) => ({ ...s, faqs: s.faqs.filter((_, j) => j !== i) }))}
                    className="px-3 py-2 rounded-full text-xs font-semibold border border-red-300 text-red-600 shrink-0">Remove</button>
                </div>
              ))}
              <button onClick={() => setSettings((s) => ({ ...s, faqs: [...(s.faqs || []), { question: "", answer: "" }] }))}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-lux-amber/60 text-lux-burnt">+ Add FAQ</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveSettings} className="px-5 py-2 rounded-full text-sm font-semibold bg-lux-gradient text-white">Save chatbot settings</button>
            {savedNote && <span className="text-sm text-green-700">{savedNote}</span>}
          </div>
          <p className="text-xs text-gray-400">
            Not included by design: theme-colour and avatar uploaders (the bot uses the MALAC brand theme and logo mark),
            and per-language toggles (the bot always answers in the customer's own language — English, Urdu or Roman Urdu).
          </p>
        </div>
      )}
    </div>
  );
}
