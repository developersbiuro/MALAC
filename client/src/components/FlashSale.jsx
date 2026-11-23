import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, ShoppingCart, ArrowRight, Star } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { loginPath } from "../utils/authGate.js";
import { rs, discountPct, priceOf } from "../utils/format.js";

function useCountdown(endsAt) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const target = endsAt ? new Date(endsAt).getTime() : Date.now() + 12 * 3600 * 1000;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  const s = Math.floor(left / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return [pad(Math.floor(s / 3600)), pad(Math.floor((s % 3600) / 60)), pad(s % 60)];
}

// Silver stars for the dark card (RatingStars is dark-on-light).
function DarkStars({ value = 0 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11}
          className={i <= Math.round(value) ? "fill-[#E8E8EA] text-[#E8E8EA]" : "text-neutral-600"} />
      ))}
    </span>
  );
}

// Dark gradient card — Abdullah's reference (2026-11-17, final): photo
// on a light studio backdrop, then a black panel with silver stars,
// white title, GOLD sale price + struck old price, and a silver pill
// Add to Cart button.
function FlashCard({ product }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const pct = discountPct(product);
  const out = product.stock === 0;
  const addToCart = () => {
    if (!add(product)) { navigate(loginPath(`/product/${product.slug}`)); return; }
  };
  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#26262B] to-[#0E0E10] border border-[#C7C7CE]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#ECECEE]">
        <Link to={`/product/${product.slug}`} className="absolute inset-0">
          <img src={product.images?.[0] || "/icons/icon.svg"} alt={product.title} loading="lazy" referrerPolicy="no-referrer"
            onError={(e) => { if (!e.currentTarget.src.endsWith("/icons/icon.svg")) e.currentTarget.src = "/icons/icon.svg"; }}
            className="h-full w-full object-cover" />
        </Link>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#101013]" />
        {pct > 0 && (
          <span className="absolute top-2 left-2 bg-white text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded-full shadow">-{pct}%</span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-3">
        <span className="flex items-center gap-1.5">
          <DarkStars value={product.ratingAvg || 0} />
          {(product.ratingCount || 0) > 0 && <span className="text-[10px] text-neutral-500">({product.ratingCount})</span>}
        </span>
        <Link to={`/product/${product.slug}`} className="mt-1 text-[13px] font-semibold leading-snug text-white line-clamp-2 min-h-[2.6em]">
          {product.title}
        </Link>
        <p className="mt-1.5 text-base font-extrabold text-[#E9B44C]">{rs(priceOf(product))}</p>
        {pct > 0 && <p className="text-[11px] text-neutral-500"><s>{rs(product.basePrice)}</s></p>}
        <div className="mt-auto pt-2.5">
          <button onClick={addToCart} disabled={out}
            className={`w-full flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${out ? "bg-neutral-600 text-neutral-300" : "bg-gradient-to-b from-[#FBFBFC] via-[#D8D8DE] to-[#AFAFB8] text-[#121214] ring-1 ring-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] hover:brightness-105"}`}>
            <ShoppingCart size={13} /> {out ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Flash Sale — Abdullah's dark reference design (2026-11-17): black
// glossy frame, "FLASH SALE / Stay updated with your order status",
// dark countdown pills (02h 45m 12s), View All →, 5 dark cards.
export default function FlashSale({ products }) {
  const [h, m, s] = useCountdown(products?.[0]?.flashSaleEndsAt);
  if (!products?.length) return null;
  const units = [[h, "h"], [m, "m"], [s, "s"]];
  return (
    <section className="relative bg-[#08080A] rounded-[26px] ring-1 ring-white/15 shadow-[0_14px_44px_rgba(0,0,0,0.4)] mt-8 sm:mt-10 p-4 sm:p-5 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.07] to-transparent" />
      <div className="relative flex items-center gap-3 sm:gap-5 flex-wrap">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-xl sm:text-2xl font-bold leading-none text-white tracking-wide">
            <Zap size={20} className="fill-white text-white" /> FLASH SALE
          </h2>
          <p className="text-[11px] text-neutral-400 mt-1.5">Stay updated with your order status</p>
        </div>
        <span className="flex items-center gap-1.5">
          {units.map(([v, u]) => (
            <span key={u} className="bg-white/[0.07] border border-white/15 text-white rounded-full px-3.5 py-1 font-mono text-[13px] font-bold">
              {v}<span className="text-[10px] font-semibold text-neutral-400 ml-0.5">{u}</span>
            </span>
          ))}
        </span>
        <Link to="/shop?flash=1" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-200 hover:text-white transition-colors">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="relative flex gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar mt-4 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {products.slice(0, 5).map((p) => (
          <div key={p._id} className="w-[176px] sm:w-[200px] lg:w-auto shrink-0 lg:shrink"><FlashCard product={p} /></div>
        ))}
      </div>
    </section>
  );
}
