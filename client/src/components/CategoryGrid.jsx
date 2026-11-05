import { Link } from "react-router-dom";
import * as icons from "lucide-react";

// Daraz-style "channels" row: circular icon chips with labels, horizontally
// scrollable on mobile, even grid on desktop — styled with MALAC's own
// cream/ink theme (cream-soft chip, lux-burnt icon).
export default function CategoryGrid({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="bg-white rounded-2xl border border-cream-line shadow-sm mt-3 px-2 py-3">
      <div className="flex lg:grid lg:grid-cols-8 gap-1 overflow-x-auto no-scrollbar">
        {categories.map((c) => {
          const Icon = icons[c.icon] || icons.ShoppingBag;
          return (
            <Link key={c._id} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center gap-1.5 px-1 py-1.5 min-w-[72px] lg:min-w-0 rounded-xl hover:bg-cream-soft transition-colors">
              <span className="bg-cream-soft border border-cream-line text-lux-burnt rounded-full p-3">
                <Icon size={22} />
              </span>
              <span className="text-[11px] text-center leading-tight text-gray-700 line-clamp-2">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
