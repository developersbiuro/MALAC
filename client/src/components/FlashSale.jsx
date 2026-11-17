import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, ShoppingCart, ArrowRight } from "lucide-react";
import RatingStars from "./RatingStars.jsx";
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

// Compact card for the dark Flash Sale box — Abdullah's reference
// (2026-11-17): light card, -% badge top-left, stars, bold price with
// the struck-through old price, dark Add to Cart button.
function FlashCard({ product }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const pct = discountPct(product);
  const out = product.stock === 0;
  const addToCart = () => {
    if (!add(product)) { navigate(loginPath(`/product/${product.slug}`)); return; }
  };
  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden ring-1 ring-black/10">
      <div className="relative aspect-square bg-[#f2f2f3]">
        <Link to={`/product/${product.slug}`}>
          <img src={product.images?.[0] || "/icons/icon.svg"} alt={product.title} loading="lazy" referrerPolicy="no-referrer"
            onError={(e) => { if (!e.currentTarget.src.endsWith("/icons/icon.svg")) e.currentTarget.src = "/icons/icon.svg"; }}
            className="h-full w-full object-cover" />
        </Link>
        {pct > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-[#101013] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{pct}%</span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-2.5">
        {(product.ratingCount || 0) > 0 && (
          <span className="flex items-center gap-1">
            <RatingStars value={product.ratingAvg || 0} size={11} />
            <span className="text-[10px] text-gray-400">({product.ratingCount})</span>
          </span>
        )}
        <Link to={`/product/${product.slug}`} className="mt-1 text-[13px] font-medium leading-snug text-neutral-800 line-clamp-2 min-h-[2.6em]">
          {product.title}
        </Link>
        <p className="mt-1 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[15px] font-extrabold text-neutral-900">{rs(priceOf(product))}</span>
          {pct > 0 && <s className="text-[11px] text-neutral-400">{rs(product.basePrice)}</s>}
        </p>
        <button onClick={addToCart} disabled={out}
          className="mt-auto pt-2 w-full">
          <span className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition ${out ? "bg-neutral-300" : "bg-[#151517] hover:bg-black"}`}>
            <ShoppingCart size={13} /> {out ? "Out of Stock" : "Add to Cart"}
          </span>
        </button>
      </div>
    </div>
  );
}

// Flash Sale — dark framed box, Abdullah's reference design (2026-11-17):
// ⚡ FLASH SALE + live countdown boxes (02h : 45m : 12s) + View All →,
// then a 5-column row of compact light cards on the black frame.
export default function FlashSale({ products }) {
  const [h, m, s] = useCountdown(products?.[0]?.flashSaleEndsAt);
  if (!products?.length) return null;
  const units = [[h, "h"], [m, "m"], [s, "s"]];
  return (
    <section className="bg-[#0B0B0D] rounded-3xl ring-1 ring-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.35)] mt-8 sm:mt-10 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <h2 className="flex items-center gap-1.5 font-display text-xl sm:text-2xl font-bold leading-none text-white tracking-wide">
          <Zap size={20} className="fill-[#D6D6D6] text-[#D6D6D6]" /> FLASH SALE
        </h2>
        <span className="flex items-center gap-1">
          {units.map(([v, u], i) => (
            <span key={u} className="flex items-center gap-1">
              <span className="bg-white/[0.06] border border-white/25 text-white rounded-md px-1.5 py-1 font-mono text-[13px] font-bold min-w-[2.6rem] text-center">
                {v}<span className="text-[10px] font-semibold text-neutral-400 ml-0.5">{u}</span>
              </span>
              {i < 2 && <span className="text-neutral-500 font-bold">:</span>}
            </span>
          ))}
        </span>
        <Link to="/shop?flash=1" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-300 hover:text-white transition-colors">
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar mt-4 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {products.slice(0, 5).map((p) => (
          <div key={p._id} className="w-[168px] sm:w-[190px] lg:w-auto shrink-0 lg:shrink"><FlashCard product={p} /></div>
        ))}
      </div>
    </section>
  );
}
