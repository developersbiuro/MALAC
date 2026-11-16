import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, User, ChevronDown, ShieldCheck, Truck } from "lucide-react";
import api from "../api/client.js";
import { LOGO_MARK } from "../assets/logoMark.js";
import InstallAppButton from "./InstallAppButton.jsx";
import { useAppMode } from "../utils/appMode.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { rs, priceOf } from "../utils/format.js";

// Header — Abdullah's design 1 (2026-11-16/17): slim top bar
// (delivery promise · Track Order | Help | Your Account), then one
// black row: MALAC lockup · Home / Shop ▾ / Collections ▾ /
// Lifestyle ▾ / About / Contact · search pill · account, wishlist
// and cart icons.
export default function Header() {
  const { fees, payments } = usePublicSettings();
  const appMode = useAppMode();
  const { user, logout, isStaff } = useAuth();
  const { count } = useCart();
  const { items: wishlist } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [openMenu, setOpenMenu] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchRef = useRef(null);

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data.categories)).catch(() => {}); }, []);

  useEffect(() => {
    if (!q.trim()) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get("/products/suggest", { params: { q } })
        .then((r) => setSuggestions(r.data.suggestions)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submitSearch = (e) => {
    e.preventDefault();
    setSuggestions([]);
    navigate(q.trim() ? `/shop?search=${encodeURIComponent(q.trim())}` : "/shop");
  };

  const catTo = (name) => `/category/${encodeURIComponent(name)}`;
  const byName = (name) => categories.find((c) => c.name === name);
  const navLink = "whitespace-nowrap text-[13px] font-medium tracking-wide text-neutral-300 hover:text-white transition-colors";
  const dropItem = "block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-black";

  const Dropdown = ({ id, label, to, children }) => (
    <div className="relative" onMouseEnter={() => setOpenMenu(id)} onMouseLeave={() => setOpenMenu("")}>
      <Link to={to} className={`${navLink} flex items-center gap-1 py-2`}>
        {label} <ChevronDown size={13} className={`transition-transform ${openMenu === id ? "rotate-180" : ""}`} />
      </Link>
      {openMenu === id && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full bg-white shadow-lux rounded-xl border border-neutral-200 w-52 py-1.5 z-50">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0c] text-neutral-100 shadow-header">
      {/* Top bar — the reference design's slim strip */}
      <div className="bg-black text-neutral-400 text-[11px] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 truncate">
            <Truck size={13} className="shrink-0 text-neutral-300" />
            <span className="truncate">Free Delivery All Over Pakistan
              {payments?.codEnabled !== false && <span className="hidden sm:inline"> <span className="text-white/30 mx-1">|</span> Cash on Delivery Available</span>}
            </span>
          </span>
          <span className="flex items-center gap-3 shrink-0">
            <Link to="/track-order" className="hover:text-white">Track Order</Link>
            <span className="text-white/20">|</span>
            <Link to="/faq" className="hover:text-white">Help</Link>
            <span className="text-white/20">|</span>
            <Link to={user ? "/account" : "/login"} className="hover:text-white flex items-center gap-0.5">Your Account <ChevronDown size={11} /></Link>
            {isStaff && <Link to="/admin" className="hidden sm:flex items-center gap-1 hover:text-white"><ShieldCheck size={12} /> Admin</Link>}
          </span>
        </div>
      </div>

      {/* Main row — lockup · nav · search · icons */}
      <div className="max-w-7xl mx-auto px-3 py-3 flex items-center gap-3 sm:gap-5">
        <Link to="/" className="shrink-0 flex items-center gap-2.5" aria-label="MALAC — home">
          <img src={LOGO_MARK} alt="" className="h-11 sm:h-[52px] w-auto" />
          <span className="leading-none">
            <span className="block text-[21px] sm:text-2xl font-extrabold tracking-[0.05em] text-neutral-50">MALAC</span>
            <span className="block text-[7.5px] sm:text-[8.5px] tracking-[0.13em] text-neutral-400 mt-1">M.A Luxury Apparel Collection</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 mx-auto">
          <Link to="/" className={`${navLink} py-2 ${pathname === "/" ? "text-white underline underline-offset-8 decoration-neutral-300" : ""}`}>Home</Link>
          <Dropdown id="shop" label="Shop" to="/shop">
            <Link to="/shop" className={dropItem} onClick={() => setOpenMenu("")}>All Products</Link>
            {categories.map((c) => (
              <Link key={c._id} to={catTo(c.name)} className={dropItem} onClick={() => setOpenMenu("")}>{c.name}</Link>
            ))}
            <Link to="/blog" className={dropItem} onClick={() => setOpenMenu("")}>Blog</Link>
          </Dropdown>
          <Dropdown id="collections" label="Collections" to={byName("Watches") ? catTo("Watches") : "/shop"}>
            <Link to={catTo("Watches")} className={dropItem} onClick={() => setOpenMenu("")}>Watches</Link>
            <Link to={catTo("Eyewear")} className={dropItem} onClick={() => setOpenMenu("")}>Eyewear</Link>
            <Link to={catTo("Bags & Accessories")} className={dropItem} onClick={() => setOpenMenu("")}>Bags &amp; Accessories</Link>
          </Dropdown>
          <Dropdown id="lifestyle" label="Lifestyle" to={byName("Mobile Accessories") ? catTo("Mobile Accessories") : "/shop"}>
            <Link to={catTo("Mobile Accessories")} className={dropItem} onClick={() => setOpenMenu("")}>Mobile Accessories</Link>
            <Link to={catTo("Men's Fashion")} className={dropItem} onClick={() => setOpenMenu("")}>Men&apos;s Fashion</Link>
            <Link to={catTo("Women's Fashion")} className={dropItem} onClick={() => setOpenMenu("")}>Women&apos;s Fashion</Link>
          </Dropdown>
          <Link to="/about" className={`${navLink} py-2 ${pathname === "/about" ? "text-white underline underline-offset-8 decoration-neutral-300" : ""}`}>About</Link>
          <a href="https://wa.me/923236016684" target="_blank" rel="noreferrer" className={`${navLink} py-2`}>Contact</a>
        </nav>

        {/* Search — the reference's pill */}
        <div className="relative hidden md:block w-52 xl:w-64 shrink-0 ml-auto lg:ml-0" ref={searchRef} data-tour="search">
          <form onSubmit={submitSearch} className="flex bg-white/10 rounded-full overflow-hidden border border-white/15 focus-within:border-neutral-400 focus-within:bg-white/15 transition-all">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..."
              className="flex-1 min-w-0 bg-transparent pl-4 pr-1 py-2 text-[13px] outline-none text-white placeholder-neutral-400" />
            <button className="text-neutral-200 px-3.5 shrink-0 flex items-center justify-center hover:text-white" aria-label="Search"><Search size={16} /></button>
          </form>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white text-neutral-800 shadow-lux rounded-xl border border-neutral-200 z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
              {suggestions.map((s) => (
                <button key={s._id} onClick={() => { setSuggestions([]); navigate(`/product/${s.slug}`); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2">
                  <span className="truncate">{s.title}</span><span className="text-xs text-gray-400 shrink-0">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto md:ml-0 shrink-0">
          <div className="relative">
            <button onClick={() => setAccountOpen((v) => !v)} data-tour="account" className="p-2 text-neutral-200 hover:text-white" aria-label="Your account">
              <User size={21} />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white text-neutral-800 shadow-lux rounded-xl border border-neutral-200 w-44 py-1 z-50 text-sm" onMouseLeave={() => setAccountOpen(false)}>
                {user ? <>
                  <Link to="/account" className="block px-3 py-2 hover:bg-gray-50">My Account</Link>
                  <Link to="/orders" className="block px-3 py-2 hover:bg-gray-50">My Orders</Link>
                  <Link to="/account/settings" className="block px-3 py-2 hover:bg-gray-50">Profile Settings</Link>
                  <Link to="/wishlist" className="block px-3 py-2 hover:bg-gray-50">Wishlist</Link>
                  {isStaff && <Link to="/admin" className="block px-3 py-2 hover:bg-gray-50">Admin Suite</Link>}
                  <button onClick={logout} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-500">Logout</button>
                </> : <>
                  <Link to="/login" className="block px-3 py-2 hover:bg-gray-50">Login</Link>
                  <Link to="/signup" className="block px-3 py-2 hover:bg-gray-50">Sign Up</Link>
                </>}
              </div>
            )}
          </div>
          <Link to="/wishlist" className="relative p-2 text-neutral-200 hover:text-white" aria-label="Wishlist">
            <Heart size={21} />
            {user && wishlist.length > 0 && <span className="absolute top-0 right-0 bg-neutral-100 text-neutral-900 text-[10px] font-bold rounded-full px-1">{wishlist.length}</span>}
          </Link>
          <button onClick={() => (user ? navigate("/cart") : navigate(`/login?redirect=${encodeURIComponent("/cart")}`))} data-tour="cart" className="relative p-2 text-neutral-200 hover:text-white" aria-label="Cart">
            <ShoppingCart size={21} />
            {user && count > 0 && <span className="absolute top-0 right-0 bg-neutral-100 text-neutral-900 text-[10px] font-bold rounded-full px-1">{count}</span>}
          </button>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="md:hidden max-w-7xl mx-auto px-3 pb-2.5">
        <form onSubmit={submitSearch} className="flex bg-white/10 rounded-full overflow-hidden border border-white/15">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..."
            className="flex-1 min-w-0 bg-transparent pl-4 pr-1 py-2 text-sm outline-none text-white placeholder-neutral-400" />
          <button className="text-neutral-200 px-3.5 shrink-0 flex items-center justify-center" aria-label="Search"><Search size={16} /></button>
        </form>
      </div>

      {/* Mobile category strip */}
      <nav className="lg:hidden flex gap-3 overflow-x-auto no-scrollbar px-3 pt-2 pb-2.5 border-t border-white/10 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400" data-tour="categories">
        <Link to="/shop" className="whitespace-nowrap text-neutral-200">Shop All</Link>
        {categories.map((c) => (
          <Link key={c._id} to={catTo(c.name)} className="whitespace-nowrap">{c.name}</Link>
        ))}
        <Link to="/blog" className="whitespace-nowrap">Blog</Link>
        {!appMode && <InstallAppButton variant="link" className="text-neutral-200" />}
      </nav>
    </header>
  );
}
export { rs, priceOf };
