import { LOGO_MARK } from "../assets/logo.js";
import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ShoppingBag, TicketPercent, Users, Settings as SettingsIcon, LogOut, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSeo } from "../utils/seo.js";

const links = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", Icon: Package },
  { to: "/admin/categories", label: "Categories", Icon: FolderTree },
  { to: "/admin/orders", label: "Orders", Icon: ShoppingBag },
  { to: "/admin/coupons", label: "Coupons", Icon: TicketPercent, superOnly: true },
  { to: "/admin/roles", label: "Roles & Users", Icon: Users, superOnly: true },
  { to: "/admin/settings", label: "Settings", Icon: SettingsIcon, superOnly: true },
];

export default function AdminLayout({ children }) {
  useSeo({ title: "Admin — MALAC", robots: "noindex, nofollow" });
  const { user, logout, isSuperAdmin } = useAuth();
  return (
    <div className="min-h-screen flex bg-[#f4f6f8]">
      <aside className="w-14 sm:w-56 bg-[#0f1b29] text-white shrink-0 flex flex-col sticky top-0 h-screen">
        <div className="p-3 sm:p-4 border-b border-white/10">
          <div className="hidden sm:flex items-center gap-2">
            <span className="bg-white rounded-md px-1.5 py-1 shrink-0"><img src={LOGO_MARK} alt="MALAC" className="h-8 w-auto" /></span>
            <p className="font-extrabold text-lg">MALAC Admin</p>
          </div>
          <div className="sm:hidden flex justify-center">
            <span className="bg-white rounded px-1 py-0.5"><img src={LOGO_MARK} alt="MALAC" className="h-7 w-auto" /></span>
          </div>
          <p className="text-[11px] text-white/60 hidden sm:block mt-1">
            {user?.name} · {user?.role === "admin" ? "Super Admin" : "Vice-Admin"}
          </p>
        </div>
        <nav className="flex-1 py-2">
          {links.filter((l) => !l.superOnly || isSuperAdmin).map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 sm:px-4 py-2.5 text-sm ${isActive ? "bg-brand text-white" : "text-white/75 hover:bg-white/5"}`}>
              <Icon size={18} /><span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-white/10 text-sm">
          <Link to="/" className="flex items-center gap-2.5 px-2 py-2 text-white/75 hover:text-white"><Store size={17} /><span className="hidden sm:inline">View Store</span></Link>
          <button onClick={logout} className="flex items-center gap-2.5 px-2 py-2 text-white/75 hover:text-white"><LogOut size={17} /><span className="hidden sm:inline">Logout</span></button>
        </div>
      </aside>
      <main className="flex-1 p-3 sm:p-6 overflow-x-auto min-w-0">{children}</main>
    </div>
  );
}
