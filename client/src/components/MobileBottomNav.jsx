import { Link, useLocation } from "react-router-dom";
import { Home, Grid2x2, PackageSearch, ShoppingCart, User } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

// Daraz-app-style 5-item bottom bar (Home / Categories / Track Order /
// Cart / Account) in MALAC's own theme: lux-burnt active state, lux-amber
// cart badge, safe-area padding preserved.
const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/shop", label: "Categories", Icon: Grid2x2 },
  { to: "/track-order", label: "Track Order", Icon: PackageSearch },
  { to: "/cart", label: "Cart", Icon: ShoppingCart, badge: "cart" },
  { to: "/orders", label: "Account", Icon: User, match: ["/orders", "/account"] },
];

export default function MobileBottomNav() {
  const { count } = useCart();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-cream-line shadow-[0_-2px_10px_rgba(15,23,42,0.05)] z-40 flex pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, Icon, badge, match }) => {
        const active = match ? match.some((m) => pathname.startsWith(m)) : pathname === to;
        return (
          <Link key={to} to={to}
            className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[10px] relative ${active ? "text-lux-burnt font-semibold" : "text-gray-500"}`}>
            <Icon size={20} />
            {badge === "cart" && count > 0 &&
              <span className="absolute top-0.5 right-1/2 translate-x-4 bg-lux-amber text-white text-[9px] font-bold rounded-full px-1">{count}</span>}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
