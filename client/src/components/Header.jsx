import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, User, ChevronDown, Menu, ShieldCheck, PackageSearch } from "lucide-react";
import api from "../api/client.js";
import { LOGO_FULL } from "../assets/logo.js";
import InstallAppButton from "./InstallAppButton.jsx";
import { useAppMode } from "../utils/appMode.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { rs, priceOf } from "../utils/format.js";

export default function Header() {
  const { fees, payments } = usePublicSettings();
  const appMode = useAppMode();
  const { user, logout, isStaff } = useAuth();
  const { count, setDrawerOpen } = useCart();
  const { items: wishlist } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="bg-lux-ink text-cream-soft text-xs">
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex flex-col items-center gap-0.5 text-center sm:flex-row sm:justify-between sm:text-left">
          <span>{payments?.codEnabled !== false && <><span className="text-lux-pale font-semibold">Cash on Delivery (COD) Across Pakistan</span> <span className="text-white/40 mx-1 hidden sm:inline">|</span> </>}<span className="block sm:inline">Free Shipping on Orders Over {rs(fees.freeThreshold)}</span></span>
          <span className="hidden sm:flex gap-3">
            <Link to="/track-order" className="hover:text-lux-pale">Track Order</Link>
            {isStaff && <Link to="/admin" className="flex items-center gap-1 hover:text-lux-pale"><ShieldCheck size={12} /> Admin</Link>}
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-3 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
        <Link to="/" className="shrink-0" aria-label="MALAC — home">
          <img src={LOGO_FULL} alt="MALAC — M.A Luxury Apparel Collection" className="h-10 sm:h-12 w-auto" />
        </Link>

        {/* Category mega-menu (hover on desktop) */}
        <div className="relative hidden lg:block" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
          <button className="flex items-center gap-1 text-sm font-medium px-2 py-1">
            <Menu size={18} /> Categories <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full bg-white shadow-xl rounded-b-md w-[560px] grid grid-cols-3 gap-1 p-3 z-50">
              {categories.map((c) => (
                <div key={c._id}>
                  <Link to={`/shop?category=${encodeURIComponent(c.name)}`} className="font-medium text-sm hover:text-lux-burnt">{c.name}</Link>
                  <div className="mt-1 space-y-0.5">
                    {c.subCategories?.map((s) => (
                      <Link key={s._id} to={`/shop?category=${encodeURIComponent(c.name)}&sub=${encodeURIComponent(s.name)}`}
                        className="block text-xs text-gray-500 hover:text-lux-burnt">{s.name}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Predictive search — dominant full-width bar on mobile (own row),
            inline flex-1 from sm up */}
        <div className="relative flex-1 min-w-0 basis-full order-last mt-1 sm:basis-auto sm:order-none sm:mt-0" ref={searchRef}>
          <form onSubmit={submitSearch} className="flex bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-sm focus-within:border-lux-amber focus-within:bg-white focus-within:shadow transition-colors">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in MALAC"
              className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-sm outline-none" />
            <button className="bg-lux-gradient text-white px-5 sm:px-6 shrink-0 flex items-center justify-center" aria-label="Search"><Search size={19} /></button>
          </form>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white shadow-xl rounded-md z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
              {suggestions.map((s) => (
                <button key={s._id} onClick={() => { setSuggestions([]); navigate(`/product/${s.slug}`); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2">
                  <span className="truncate">{s.title}</span><span className="text-xs text-gray-400 shrink-0">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Link to="/track-order" className="btn-lux hidden md:inline-flex text-xs px-4 py-2 shrink-0">
          <PackageSearch size={15} /> Track Order
        </Link>
        {!appMode && (
          <div className="hidden md:block shrink-0">
            <InstallAppButton />
          </div>
        )}
        <Link to="/wishlist" className="relative p-2 sm:p-1.5 shrink-0" aria-label="Wishlist">
          <Heart size={22} />
          {user && wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-lux-amber text-white text-[10px] rounded-full px-1">{wishlist.length}</span>}
        </Link>
        <button onClick={() => (user ? setDrawerOpen(true) : navigate(`/login?redirect=${encodeURIComponent("/cart")}`))} className="relative p-2 sm:p-1.5 shrink-0" aria-label="Cart">
          <ShoppingCart size={22} />
          {user && count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-lux-amber text-white text-[10px] rounded-full px-1">{count}</span>}
        </button>

        <div className="relative">
          <button onClick={() => setAccountOpen((v) => !v)} className="flex items-center gap-1 text-sm p-2 sm:p-1.5 shrink-0">
            <User size={22} /><span className="hidden md:inline">{user ? user.name.split(" ")[0] : "Login"}</span>
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-md w-44 py-1 z-50 text-sm" onMouseLeave={() => setAccountOpen(false)}>
              {user ? <>
                <Link to="/" className="block px-3 py-2 hover:bg-gray-50">Home</Link>
                <Link to="/orders" className="block px-3 py-2 hover:bg-gray-50">My Orders</Link>
                <Link to="/account/settings" className="block px-3 py-2 hover:bg-gray-50">Profile Settings</Link>
                <Link to="/wishlist" className="block px-3 py-2 hover:bg-gray-50">Wishlist</Link>
                {isStaff && <Link to="/admin" className="block px-3 py-2 hover:bg-gray-50">Admin Suite</Link>}
                <button onClick={logout} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-500">Logout</button>
              </> : <>
                <Link to="/" className="block px-3 py-2 hover:bg-gray-50">Home</Link>
                <Link to="/login" className="block px-3 py-2 hover:bg-gray-50">Login</Link>
                <Link to="/signup" className="block px-3 py-2 hover:bg-gray-50">Sign Up</Link>
              </>}
            </div>
          )}
        </div>
      </div>
      {/* Desktop category nav row (uppercase, malacpk-style) */}
      <nav className="hidden lg:flex gap-5 max-w-7xl mx-auto px-3 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600 overflow-x-auto no-scrollbar">
        <Link to="/" className={`whitespace-nowrap hover:text-lux-burnt ${pathname === "/" ? "text-lux-burnt" : ""}`}>Home</Link>
        <Link to="/shop" className="whitespace-nowrap hover:text-lux-burnt">All Products</Link>
        {categories.map((c) => (
          <Link key={c._id} to={`/shop?category=${encodeURIComponent(c.name)}`} className="whitespace-nowrap hover:text-lux-burnt">{c.name}</Link>
        ))}
      </nav>
      {/* Mobile category strip */}
      <nav className="lg:hidden flex gap-3 overflow-x-auto no-scrollbar px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600">
        {categories.map((c) => (
          <Link key={c._id} to={`/shop?category=${encodeURIComponent(c.name)}`} className="whitespace-nowrap">{c.name}</Link>
        ))}
        {!appMode && <InstallAppButton variant="link" className="text-lux-burnt" />}
      </nav>
    </header>
  );
}
export { rs, priceOf };
