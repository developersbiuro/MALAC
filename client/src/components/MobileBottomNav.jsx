import { Link, useLocation } from "react-router-dom";
import { Home, Grid2x2, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/shop", label: "Categories", Icon: Grid2x2 },
  { to: "/cart", label: "Cart", Icon: ShoppingCart, badge: "cart" },
  { to: "/wishlist", label: "Wishlist", Icon: Heart },
  { to: "/orders", label: "Account", Icon: User },
];

export default function MobileBottomNav() {
  const { count } = useCart();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t z-40 flex">
      {items.map(({ to, label, Icon, badge }) => (
        <Link key={to} to={to}
          className={`flex-1 py-1.5 flex flex-col items-center text-[10px] relative ${pathname === to ? "text-brand" : "text-gray-500"}`}>
          <Icon size={20} />
          {badge === "cart" && count > 0 &&
            <span className="absolute top-0.5 right-1/2 translate-x-4 bg-brand text-white text-[9px] rounded-full px-1">{count}</span>}
          {label}
        </Link>
      ))}
    </nav>
  );
}
