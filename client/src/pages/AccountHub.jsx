import { Link, useNavigate } from "react-router-dom";
import {
  Package, PackageSearch, Heart, UserCog, MapPin, FileText, ShieldCheck,
  MessageCircle, LogOut, ChevronRight,
} from "lucide-react";
import { LOGO_MARK } from "../assets/logo.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useSeo } from "../utils/seo.js";

// "My Account" hub (/account) — Daraz-app-style: identity header, an orders
// strip, then a settings/services menu list. Works on web too (the mobile
// bottom nav's Account tab lands here), styled entirely in MALAC's own
// luxury theme. Order counts are NOT shown — there is no counts API; the
// My Orders strip is link tiles only.
const WHATSAPP_URL = "https://wa.me/923236016684";

function MenuRow({ to, href, Icon, label, badge, onClick, danger }) {
  const inner = (
    <>
      <span className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${danger ? "bg-red-50 text-red-500" : "bg-cream-deep text-lux-burnt"}`}>
        <Icon size={18} />
      </span>
      <span className={`flex-1 text-sm font-medium ${danger ? "text-red-500" : "text-lux-ink"}`}>{label}</span>
      {badge > 0 && (
        <span className="bg-lux-amber text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 mr-1">{badge}</span>
      )}
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-cream-soft transition-colors";
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  return <Link to={to} className={cls}>{inner}</Link>;
}

export default function AccountHub() {
  useSeo({ title: "My Account — MALAC", robots: "noindex" });
  const { user, logout } = useAuth();
  const { items: wishlist } = useWishlist();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };
  // Prefer whichever verified identity the account actually has: customers
  // who signed up by phone carry a synthetic placeholder email, so show the
  // phone for them, the real email otherwise.
  const identityLine = user
    ? (user.email && !user.email.endsWith("@malac.local") ? user.email : user.phone || user.email || "")
    : "";

  return (
    <main className="max-w-3xl mx-auto px-3 pt-4 pb-24 md:pb-10">
      {/* Identity header */}
      {user ? (
        <section className="bg-lux-ink text-white rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-lux-gold/60" />
          ) : (
            <span className="w-14 h-14 rounded-full bg-lux-gradient text-white flex items-center justify-center text-xl font-bold shrink-0">
              {(user.name || "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold truncate">{user.name}</p>
            <p className="text-xs text-white/60 truncate">{identityLine}</p>
          </div>
        </section>
      ) : (
        <section className="bg-lux-ink text-white rounded-2xl p-5 text-center shadow-sm">
          <img src={LOGO_MARK} alt="MALAC" className="w-14 h-14 rounded-full object-cover mx-auto bg-white" />
          <h1 className="font-serif text-xl font-semibold mt-3">Welcome to MALAC</h1>
          <p className="text-xs text-white/60 mt-1">Login to see your orders, wishlist and more.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Link to="/login" className="btn-lux px-6 py-2.5 text-sm">Login</Link>
            <Link to="/signup" className="px-6 py-2.5 text-sm rounded-full border border-white/40 font-semibold hover:bg-white/10 transition-colors">Sign Up</Link>
          </div>
        </section>
      )}

      {/* My Orders strip — link tiles only (no counts API) */}
      {user && (
        <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-4 p-4">
          <p className="eyebrow">My Orders</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Link to="/orders" className="flex items-center gap-2.5 bg-cream-soft hover:bg-cream-deep/60 rounded-xl px-3 py-3 transition-colors">
              <Package size={20} className="text-lux-burnt shrink-0" />
              <span className="text-sm font-medium">All Orders</span>
            </Link>
            <Link to="/track-order" className="flex items-center gap-2.5 bg-cream-soft hover:bg-cream-deep/60 rounded-xl px-3 py-3 transition-colors">
              <PackageSearch size={20} className="text-lux-burnt shrink-0" />
              <span className="text-sm font-medium">Track Order</span>
            </Link>
          </div>
        </section>
      )}

      {/* Menu list */}
      <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-4 py-1 divide-y divide-cream-line overflow-hidden">
        {user && <MenuRow to="/orders" Icon={Package} label="My Orders" />}
        <MenuRow to="/track-order" Icon={PackageSearch} label="Track Order" />
        <MenuRow to="/wishlist" Icon={Heart} label="Wishlist" badge={wishlist.length} />
        {user && <MenuRow to="/account/settings" Icon={UserCog} label="Profile Settings" />}
        {user && <MenuRow to="/account/settings" Icon={MapPin} label="Address Book" />}
        <MenuRow href={WHATSAPP_URL} Icon={MessageCircle} label="Order on WhatsApp" />
        <MenuRow to="/terms" Icon={FileText} label="Terms & Conditions" />
        <MenuRow to="/policy" Icon={ShieldCheck} label="Privacy Policy" />
        {user && <MenuRow Icon={LogOut} label="Logout" danger onClick={handleLogout} />}
      </section>
    </main>
  );
}
