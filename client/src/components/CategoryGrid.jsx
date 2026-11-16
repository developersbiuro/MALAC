import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as icons from "lucide-react";
import api from "../api/client.js";

// Silver theme (2026-11-16, Abdullah's reference designs):
//  1) a row of dark circular icon chips with silver icons — his second
//     reference's category row;
//  2) a "Shop by Category" photo-card section — his first reference's
//     category cards (photo, name, Shop Now), each card using a real
//     product photo from that category.
// Both link to the category's own page (/category/:name).
export default function CategoryGrid({ categories }) {
  const [imgByCategory, setImgByCategory] = useState({});

  useEffect(() => {
    api.get("/products", { params: { limit: 60 } })
      .then((r) => {
        const map = {};
        for (const p of r.data.products || []) {
          if (!map[p.category] && p.images?.[0]) map[p.category] = p.images[0];
        }
        setImgByCategory(map);
      })
      .catch(() => {});
  }, []);

  if (!categories?.length) return null;
  return (
    <>
      {/* Icon row */}
      <section className="mt-5 px-1 py-2">
        <div className="flex lg:grid lg:grid-cols-9 gap-1 overflow-x-auto no-scrollbar">
          {categories.map((c) => {
            const Icon = icons[c.icon] || icons.ShoppingBag;
            return (
              <Link key={c._id} to={`/category/${encodeURIComponent(c.name)}`}
                className="flex flex-col items-center gap-1.5 px-1 py-1.5 min-w-[72px] lg:min-w-0 rounded-xl hover:bg-cream-soft transition-colors">
                <span className="bg-[#101014] text-neutral-200 ring-1 ring-black/30 shadow-md rounded-full p-3">
                  <Icon size={22} />
                </span>
                <span className="text-[11px] text-center leading-tight text-gray-700 line-clamp-2">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Photo cards */}
      <section className="mt-8 sm:mt-10">
        <div className="flex items-center gap-4 px-1">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-400/60 to-neutral-400/60" />
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-[0.18em] text-lux-ink text-center">SHOP BY CATEGORY</h2>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-neutral-400/60 to-neutral-400/60" />
        </div>
        <div className="flex lg:grid lg:grid-cols-5 gap-3 sm:gap-4 mt-5 overflow-x-auto lg:overflow-visible no-scrollbar pb-1">
          {categories.map((c) => (
            <Link key={c._id} to={`/category/${encodeURIComponent(c.name)}`}
              className="group relative rounded-2xl overflow-hidden shrink-0 w-[220px] sm:w-[250px] lg:w-auto aspect-[4/3] bg-lux-deep shadow-md hover:shadow-lux transition-shadow">
              {imgByCategory[c.name] ? (
                <img src={imgByCategory[c.name]} alt={c.name} loading="lazy" referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3.5">
                <span className="block font-display text-white text-sm sm:text-base font-bold tracking-[0.08em] uppercase leading-tight">{c.name}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-300 uppercase tracking-[0.14em]">Shop Now <span aria-hidden>→</span></span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
