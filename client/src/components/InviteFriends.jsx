import { useEffect, useState } from "react";
import { UserPlus, Copy, Check, Share2, TicketPercent } from "lucide-react";
import api from "../api/client.js";

// Invite-a-Friend card for My Account (owner, 2026-11-15). The friend
// who joins through this link gets free shipping on their first order;
// the inviter earns Rs. 100 when the friend creates an account and
// Rs. 300 when the friend's first order of Rs. 1,500+ is placed
// (issued by the server — see referralService). This card shows
// the personal link, join/reward counts and the earned coupons.
export default function InviteFriends() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/auth/referral")
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!data?.code) return null;
  const link = `${window.location.origin}/signup?ref=${data.code}`;
  const shareText = `MALAC par online shopping karein — mere invite link se account banayein, pehle order par FREE delivery payen: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the link stays selectable */ }
  };

  const couponState = (c) => {
    if (!c.active || new Date(c.expiresAt) < new Date()) return { label: "Expired", cls: "bg-gray-100 text-gray-500" };
    if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return { label: "Used", cls: "bg-gray-100 text-gray-500" };
    return { label: "Available", cls: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-4 p-4">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full bg-lux-gradient text-white flex items-center justify-center">
          <UserPlus size={18} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-lux-ink leading-tight">Invite a Friend</h3>
          <p className="text-[11px] text-gray-500 leading-tight">Dost aye to Rs. 100, pehla order Rs. 1,500+ ka kare to Rs. 300</p>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mt-3">
        Apna invite link doston ko bhejein. Dost account banaye to <b>aap ko Rs. 100 ka discount coupon</b> mile ga —
        aur dost pehla order Rs. 1,500 ya zyada ka kare to <b>Rs. 300 ka ek aur coupon</b>. Dost ko bhi pehle order par <b>FREE delivery</b> mile gi.
      </p>

      <div className="flex items-center gap-2 mt-3">
        <input readOnly value={link} onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 text-xs bg-cream-soft border border-cream-line rounded-xl px-3 py-2.5 text-lux-ink" aria-label="Aap ka invite link" />
        <button onClick={copy} className="btn-lux inline-flex items-center gap-1 px-3.5 py-2.5 text-xs font-semibold rounded-xl shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-[#25D366] text-white shrink-0">
          <Share2 size={14} /> WhatsApp
        </a>
      </div>

      <p className="text-[11px] text-gray-500 mt-3">
        Ab tak <b className="text-lux-ink">{data.invited}</b> dost join hue · <b className="text-lux-ink">{data.rewarded}</b> rewards mile
      </p>

      {data.coupons?.length > 0 && (
        <div className="mt-3 space-y-2">
          {data.coupons.map((c) => {
            const st = couponState(c);
            return (
              <div key={c.code} className="flex items-center gap-2.5 bg-cream-soft border border-dashed border-neutral-300 rounded-xl px-3 py-2.5">
                <TicketPercent size={18} className="text-neutral-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold tracking-wide text-lux-ink">{c.code}</p>
                  <p className="text-[11px] text-gray-500">Rs. {c.value} OFF · min order Rs. {c.minSpend} · valid till {new Date(c.expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
