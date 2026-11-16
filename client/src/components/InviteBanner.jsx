import { Link } from "react-router-dom";
import { UserPlus, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// Home-page Invite-a-Friend promo band (owner, 2026-11-15): the
// referral offer only works if customers SEE it — My Account alone
// was too hidden. Signed-in customers go straight to their invite
// card in My Account; guests go to sign-up first.
export default function InviteBanner() {
  const { user } = useAuth();
  return (
    <section className="bg-white text-lux-ink border border-cream-line rounded-3xl mt-6 px-5 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
      <div className="flex items-start gap-3 flex-1">
        <span className="bg-lux-pale text-lux-ink rounded-full p-2.5 shrink-0"><UserPlus size={22} /></span>
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold leading-tight">Doston ko bulayein, Rs. 400 tak payein!</h2>
          <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5">Dost account banaye to Rs. 100, pehla order Rs. 1,500+ ka kare to Rs. 300 coupon — aur dost ko pehle order par FREE delivery.</p>
        </div>
      </div>
      <Link to={user ? "/account" : "/signup"} className="bg-lux-ink text-white font-semibold text-sm px-5 py-2.5 rounded-full shrink-0 inline-flex items-center justify-center gap-1">
        {user ? "Apna Invite Link Lein" : "Join Kar k Invite Karein"} <ChevronRight size={16} />
      </Link>
    </section>
  );
}
