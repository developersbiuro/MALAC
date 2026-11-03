import { Link } from "react-router-dom";
import * as icons from "lucide-react";

export default function CategoryGrid({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="bg-white rounded-2xl border border-cream-line shadow-sm mt-4 p-4">
      <p className="eyebrow">Browse the Collection</p>
      <h2 className="font-serif text-3xl font-semibold leading-none mt-1 mb-3">Shop by Category</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {categories.map((c) => {
          const Icon = icons[c.icon] || icons.ShoppingBag;
          return (
            <Link key={c._id} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-cream-soft transition-colors">
              <span className="bg-cream-soft text-lux-burnt rounded-full p-3"><Icon size={22} /></span>
              <span className="text-[11px] text-center leading-tight">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
