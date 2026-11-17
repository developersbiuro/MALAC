import { Link, useLocation } from "react-router-dom";
import { Home, Grid2x2, PackageSearch, ShoppingCart, User } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppMode } from "../utils/appMode.js";

// Daraz-app-style 5-item bottom bar (Home / Categories / Track Order /
// Cart / Account) in the silver theme: solid black bar, silver active
// state, white cart badge — matching the header. Safe-area padding
// preserved. On mobile web it shows below md; in app mode it is the
// app's primary navigation, so it shows at every width.
const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/categories", label: "Categories", Icon: Grid2x2, match: ["/categories", "/shop"] },
  { to: "/track-order", label: "Track Order", Icon: PackageSearch },
  { to: "/cart", label: "Cart", Icon: ShoppingCart, badge: "cart" },
  { to: "/account", label: "Account", Icon: User, match: ["/account", "/orders"] },
];

export default function MobileBottomNav() {
  const { count } = useCart();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const appMode = useAppMode();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className={`${appMode ? "flex" : "md:hidden flex"} fixed bottom-0 inset-x-0 bg-[#0C0C0C] border-t border-[#1F1F1F] shadow-[0_-2px_10px_rgba(0,0,0,0.45)] z-40 pb-[env(safe-area-inset-bottom)]`}>
      {items.map(({ to, label, Icon, badge, match }) => {
        const active = match ? match.some((m) => pathname.startsWith(m)) : pathname === to;
        return (
          <Link key={to} to={to} data-tour={to === "/" ? "tab-home" : `tab-${to.slice(1)}`}
            className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[10px] relative ${active ? "text-white font-semibold" : "text-neutral-400"}`}>
            <Icon size={20} />
            {badge === "cart" && user && count > 0 &&
              <span className="absolute top-0.5 right-1/2 translate-x-4 bg-white text-neutral-900 text-[9px] font-bold rounded-full px-1">{count}</span>}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
