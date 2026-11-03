import { Link } from "react-router-dom";
import * as icons from "lucide-react";

export default function CategoryGrid({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="bg-white rounded-md mt-3 p-3">
      <h2 className="font-bold text-lg mb-3">Categories</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {categories.map((c) => {
          const Icon = icons[c.icon] || icons.ShoppingBag;
          return (
            <Link key={c._id} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center gap-1.5 py-3 rounded hover:bg-brand-light transition-colors">
              <span className="bg-brand-light text-brand rounded-full p-3"><Icon size={22} /></span>
              <span className="text-[11px] text-center leading-tight">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
