import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import api from "../api/client.js";
import { useSeo } from "../utils/seo.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// Daraz-pattern category browser (MALAC's own cream/ink theme): a left
// rail of top-level categories and a right pane showing the selected
// category's sub-categories as tappable tiles. Data is the same DB-driven
// GET /api/categories the Header and Home use — nothing is hardcoded.
export default function Categories() {
  const { fees } = usePublicSettings();
  const [params] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState("");

  useSeo({
    title: "Shop by Category — MALAC",
    description: `Browse MALAC categories online in Pakistan — mobiles, electronics, fashion, home & living, beauty, groceries and more, with Cash on Delivery and free shipping on orders over Rs. ${fees.freeThreshold.toLocaleString("en-PK")}.`,
  });

  useEffect(() => {
    api.get("/categories")
      .then((r) => {
        const list = r.data.categories || [];
        setCategories(list);
        // Deep link support: /categories?category=Kids opens that rail item.
        const initial = list.find((c) => c.name === params.get("category")) || list[0];
        if (initial) setSelected(initial._id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = useMemo(
    () => categories.find((c) => c._id === selected) || categories[0],
    [categories, selected]
  );
  const CurrentIcon = current ? icons[current.icon] || icons.ShoppingBag : icons.ShoppingBag;

  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      <p className="eyebrow">The Collection</p>
      <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">Categories</h1>
      {categories.length === 0 ? (
        <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line shadow-sm mt-3">Loading categories…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-line shadow-sm mt-3 flex overflow-hidden">
          {/* Left rail — top-level categories */}
          <div className="w-[104px] sm:w-44 lg:w-52 shrink-0 bg-cream-soft border-r border-cream-line max-h-[calc(100dvh-215px)] overflow-y-auto no-scrollbar">
            {categories.map((c) => {
              const Icon = icons[c.icon] || icons.ShoppingBag;
              const isActive = current && c._id === current._id;
              return (
                <button key={c._id} onClick={() => setSelected(c._id)}
                  className={`w-full flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 py-3 text-center sm:text-left border-l-[3px] transition-colors ${isActive ? "bg-white border-lux-amber text-lux-burnt font-semibold" : "border-transparent text-gray-600"}`}>
                  <Icon size={20} className="shrink-0" />
                  <span className="text-[11px] sm:text-sm leading-tight">{c.name}</span>
                </button>
              );
            })}
          </div>
          {/* Right pane — the selected category's sub-categories */}
          <div className="flex-1 min-w-0 p-3 sm:p-4 max-h-[calc(100dvh-215px)] overflow-y-auto">
            {current && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-bold truncate">{current.name}</h2>
                  <Link to={`/shop?category=${encodeURIComponent(current.name)}`}
                    className="text-xs sm:text-sm font-semibold text-lux-burnt flex items-center gap-1 shrink-0">
                    View all <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mt-3">
                  <Link to={`/shop?category=${encodeURIComponent(current.name)}`}
                    className="bg-lux-gradient text-white rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center shadow-sm">
                    <CurrentIcon size={22} />
                    <span className="text-[11px] font-semibold leading-tight line-clamp-2">All {current.name}</span>
                  </Link>
                  {current.subCategories?.map((s) => (
                    <Link key={s._id} to={`/shop?category=${encodeURIComponent(current.name)}&sub=${encodeURIComponent(s.name)}`}
                      className="bg-cream-soft border border-cream-line rounded-xl p-3 flex flex-col items-center gap-1.5 text-center hover:bg-cream-alt transition-colors">
                      <span className="bg-white border border-cream-line text-lux-burnt rounded-full p-2.5">
                        <CurrentIcon size={20} />
                      </span>
                      <span className="text-[11px] leading-tight text-gray-700 line-clamp-2">{s.name}</span>
                    </Link>
                  ))}
                </div>
                {!current.subCategories?.length && (
                  <p className="text-sm text-gray-400 mt-3">Shop everything in {current.name}.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
