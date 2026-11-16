import { Link } from "react-router-dom";
import * as icons from "lucide-react";
import { CATEGORY_PHOTOS } from "../assets/design.js";

// Category photo cards — Abdullah's final reference design (2026-11-16
// night): a single row of tall photo cards, small line icon + category
// name + "Shop Now →" at the bottom-left of each photo. Photos are the
// curated black/silver design shots (assets/design.js); a category with
// no curated photo falls back to a dark metal gradient. Each card opens
// that category's own page (/category/:name) with only its products.
export default function CategoryGrid({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="mt-5 sm:mt-6">
      <div className="flex lg:grid lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible no-scrollbar pb-1">
        {categories.map((c) => {
          const Icon = icons[c.icon] || icons.ShoppingBag;
          const photo = CATEGORY_PHOTOS[c.name];
          return (
            <Link key={c._id} to={`/category/${encodeURIComponent(c.name)}`}
              className="group relative rounded-2xl overflow-hidden shrink-0 w-[210px] sm:w-[240px] lg:w-auto aspect-[4/5] sm:aspect-[4/4.4] bg-lux-deep shadow-md hover:shadow-lux transition-shadow">
              {photo ? (
                <img src={photo} alt={c.name} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4">
                <Icon size={22} className="text-white/90 mb-1.5" strokeWidth={1.5} />
                <span className="block font-display text-white text-base sm:text-lg font-bold tracking-[0.04em] leading-tight">{c.name}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-300 uppercase tracking-[0.14em]">Shop Now <span aria-hidden>→</span></span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
