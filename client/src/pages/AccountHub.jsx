import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, PackageSearch, Heart, UserCog, MapPin, FileText, ShieldCheck,
  MessageCircle, LogOut, ChevronRight, Wallet, Truck, Star, RotateCcw,
} from "lucide-react";
import api from "../api/client.js";
import { ORDER_BUCKETS } from "../utils/orderBuckets.js";
import { LOGO_MARK } from "../assets/logo.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useSeo } from "../utils/seo.js";

// "My Account" hub (/account) — Daraz-app-style: identity header, an
// orders strip with status buckets (To Pay / To Ship / To Receive /
// To Review / Returns, with live counts from /orders/my), then a
// settings/services menu list. Works on web too (the mobile bottom
// nav's Account tab lands here), styled entirely in MALAC's own
// luxury theme.
const BUCKET_ICONS = { topay: Wallet, toship: Package, toreceive: Truck, toreview: Star, returns: RotateCcw };
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
  // Live orders for the bucket counts below (Daraz-style strip).
  const [myOrders, setMyOrders] = useState([]);
  useEffect(() => {
    if (!user) { setMyOrders([]); return; }
    api.get("/orders/my").then((r) => setMyOrders(r.data.orders || [])).catch(() => setMyOrders([]));
  }, [user]);

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

      {/* My Orders — Daraz-style status buckets with live counts */}
      {user && (
        <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">My Orders</p>
            <Link to="/orders" className="text-xs text-lux-burnt font-medium inline-flex items-center gap-0.5">View all <ChevronRight size={13} /></Link>
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3">
            {ORDER_BUCKETS.map((b) => {
              const Icon = BUCKET_ICONS[b.key];
              const count = myOrders.filter(b.test).length;
              return (
                <Link key={b.key} to={`/orders?bucket=${b.key}`} className="relative flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-cream-soft transition-colors">
                  <Icon size={22} className="text-lux-burnt" />
                  <span className="text-[10px] leading-tight text-center font-medium text-lux-ink">{b.shortLabel || b.label}</span>
                  {count > 0 && (
                    <span className="absolute top-0.5 right-1/2 translate-x-5 bg-lux-amber text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{count}</span>
                  )}
                </Link>
              );
            })}
          </div>
          <Link to="/track-order" className="flex items-center gap-2.5 bg-cream-soft hover:bg-cream-deep/60 rounded-xl px-3 py-2.5 transition-colors mt-2">
            <PackageSearch size={18} className="text-lux-burnt shrink-0" />
            <span className="text-sm font-medium">Track Order</span>
          </Link>
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
