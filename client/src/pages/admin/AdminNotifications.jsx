import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, XCircle, RotateCcw, LifeBuoy, MessagesSquare, PackageCheck, Megaphone } from "lucide-react";
import api from "../../api/client.js";

// Staff notifications: order events from customers (new order, customer
// cancellation, return request). Opening this page marks everything
// read, which clears the bell badge for the whole staff team.
const ICONS = {
  order_placed: { Icon: ShoppingBag, cls: "bg-green-100 text-green-700" },
  order_cancelled: { Icon: XCircle, cls: "bg-red-100 text-red-600" },
  order_delivered: { Icon: PackageCheck, cls: "bg-emerald-100 text-emerald-700" },
  return_requested: { Icon: RotateCcw, cls: "bg-orange-100 text-orange-700" },
  support_ticket: { Icon: LifeBuoy, cls: "bg-sky-100 text-sky-700" },
  chat_takeover: { Icon: MessagesSquare, cls: "bg-violet-100 text-violet-700" },
};

export default function AdminNotifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [pushMsg, setPushMsg] = useState("");
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcMsg, setBcMsg] = useState("");
  const [bcBusy, setBcBusy] = useState(false);

  // Fires a real FCM push to every registered staff phone (Admin app).
  const sendTestPush = async () => {
    setPushMsg("Sending…");
    try {
      const r = await api.post("/admin/push/test");
      if (r.data?.sent > 0) setPushMsg(`Test notification bhej di gayi (${r.data.sent} device) — apne phone par check karein.`);
      else if (r.data?.skipped === "no_devices") setPushMsg("Abhi koi phone registered nahi hai. Pehle nayi MALAC Admin app khol kar sign in karein, phir test karein.");
      else if (r.data?.skipped === "unconfigured") setPushMsg("Push server abhi configure nahi hua (Firebase key pending hai).");
      else setPushMsg("Push nahi gayi — thodi der baad dobara try karein.");
    } catch {
      setPushMsg("Push bhejne me masla aya — dobara try karein.");
    }
  };

  // Broadcast a staff-written announcement (flash sale, offer) to every
  // registered customer phone (customer app).
  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcBody.trim()) {
      setBcMsg("Title aur message dono likhein.");
      return;
    }
    setBcBusy(true);
    setBcMsg("Bhej raha hai…");
    try {
      const r = await api.post("/admin/push/broadcast", { title: bcTitle.trim(), body: bcBody.trim() });
      if (r.data?.sent > 0) {
        setBcMsg(`Notification bhej di gayi (${r.data.sent} customer device) — tamam customers ko ponhch gayi.`);
        setBcTitle("");
        setBcBody("");
      } else if (r.data?.skipped === "no_devices") setBcMsg("Abhi koi customer app registered nahi hai — kisi customer ne app mein sign in nahi kiya.");
      else if (r.data?.skipped === "unconfigured") setBcMsg("Push server abhi configure nahi hua (Firebase key pending hai).");
      else setBcMsg("Push nahi gayi — thodi der baad dobara try karein.");
    } catch {
      setBcMsg("Push bhejne me masla aya — dobara try karein.");
    } finally {
      setBcBusy(false);
    }
  };

  useEffect(() => {
    api.get("/admin/notifications")
      .then((r) => {
        setItems(r.data.notifications || []);
        if ((r.data.unreadCount || 0) > 0) {
          api.post("/admin/notifications/read").catch(() => {});
        }
      })
      .catch(() => setError("Could not load notifications."));
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">Notifications</h1>
      <p className="text-sm text-gray-500 mt-1">New orders, deliveries, customer cancellations, return requests, support tickets and chat takeovers appear here — newest first.</p>
      <div className="bg-white rounded-md border border-cream-line p-3.5 mt-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold">Mobile push notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">Naya order ate hi Admin app wale phone par notification jati hai — app band ho tab bhi.</p>
        </div>
        <button onClick={sendTestPush} className="btn-lux px-4 py-2 text-sm">Test Notification bhejein</button>
        {pushMsg && <p className="w-full text-xs text-gray-600">{pushMsg}</p>}
      </div>
      <div className="bg-white rounded-md border border-cream-line p-3.5 mt-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full p-2 bg-amber-100 text-amber-700"><Megaphone size={16} /></span>
          <div>
            <p className="text-sm font-semibold">Customers ko notification bhejein</p>
            <p className="text-xs text-gray-500 mt-0.5">Flash sale ya offer ka elan — tamam customer apps par jayega. Naya product aur flash sale shuru hone par notification khud bhi chali jati hai.</p>
          </div>
        </div>
        <input
          value={bcTitle}
          onChange={(e) => setBcTitle(e.target.value)}
          maxLength={60}
          placeholder="Title — masalan: MALAC — ⚡ Flash Sale shuru!"
          className="w-full border border-cream-line rounded-md px-3 py-2 text-sm mt-3"
        />
        <textarea
          value={bcBody}
          onChange={(e) => setBcBody(e.target.value)}
          maxLength={180}
          rows={2}
          placeholder="Message — masalan: Tamam products par 20% tak discount, sirf is weekend!"
          className="w-full border border-cream-line rounded-md px-3 py-2 text-sm mt-2"
        />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button onClick={sendBroadcast} disabled={bcBusy} className="btn-lux px-4 py-2 text-sm disabled:opacity-60">Sab customers ko bhejein</button>
          {bcMsg && <p className="text-xs text-gray-600">{bcMsg}</p>}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="space-y-2 mt-4">
        {items.map((n) => {
          const meta = ICONS[n.type] || ICONS.order_placed;
          return (
            <article key={n._id} className={`bg-white rounded-md border border-cream-line p-3.5 flex items-start gap-3 ${n.read ? "opacity-70" : ""}`}>
              <span className={`rounded-full p-2 shrink-0 ${meta.cls}`}><meta.Icon size={16} /></span>
              <div className="min-w-0">
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString("en-PK")}
                  {n.orderId && <> · <Link to="/admin/orders" className="text-lux-burnt underline">View orders</Link></>}
                  {!n.read && <span className="ml-2 font-semibold text-amber-700">New</span>}
                </p>
              </div>
            </article>
          );
        })}
        {items.length === 0 && !error && (
          <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line">No notifications yet — new orders will appear here.</p>
        )}
      </div>
    </div>
  );
}
