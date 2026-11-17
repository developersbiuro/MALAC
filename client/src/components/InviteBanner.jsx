import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ChevronRight, Copy, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

// Home-page Invite-a-Friend promo band (owner, 2026-11-15): the
// referral offer only works if customers SEE it — My Account alone
// was too hidden. Owner, 2026-11-17: the invite link must copy from
// THIS banner directly ("invite link yahi se copy ho jay") — a
// signed-in customer's button copies their personal link in place
// (code from /auth/referral, same source as the My Account card);
// while the code is loading or if it fails, the button keeps the
// old behaviour and links to the invite card in My Account. Guests
// go to sign-up first.
export default function InviteBanner() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.get("/auth/referral")
      .then((r) => { if (alive) setCode(r.data?.code || ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  const copyLink = async () => {
    const link = `${window.location.origin}/signup?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API unavailable (some WebViews) — legacy fallback.
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* link stays in My Account */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const btnCls = "bg-lux-ink text-white font-semibold text-sm px-5 py-2.5 rounded-full shrink-0 inline-flex items-center justify-center gap-1.5";

  return (
    <section className="bg-white text-lux-ink border border-cream-line rounded-3xl mt-6 px-5 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
      <div className="flex items-start gap-3 flex-1">
        <span className="bg-lux-pale text-lux-ink rounded-full p-2.5 shrink-0"><UserPlus size={22} /></span>
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold leading-tight">Doston ko bulayein, Rs. 400 tak payein!</h2>
          <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5">Dost account banaye to Rs. 100, pehla order Rs. 1,500+ ka kare to Rs. 300 coupon — aur dost ko pehle order par FREE delivery.</p>
        </div>
      </div>
      {user && code ? (
        <button type="button" onClick={copyLink} className={btnCls}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Link Copy Ho Gaya!" : "Invite Link Copy Karein"}
        </button>
      ) : (
        <Link to={user ? "/account" : "/signup"} className={btnCls}>
          {user ? "Apna Invite Link Lein" : "Join Kar k Invite Karein"} <ChevronRight size={16} />
        </Link>
      )}
    </section>
  );
}
