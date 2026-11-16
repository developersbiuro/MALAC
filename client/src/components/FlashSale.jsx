import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import ProductCard from "./ProductCard.jsx";

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

export default function FlashSale({ products }) {
  const [h, m, s] = useCountdown(products?.[0]?.flashSaleEndsAt);
  if (!products?.length) return null;
  return (
    <section className="bg-[#0c0c0f] rounded-3xl border border-white/10 mt-8 sm:mt-10 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap border-b border-white/10 pb-3">
        <h2 className="flex items-center gap-1.5 font-display text-2xl sm:text-3xl font-bold leading-none text-white tracking-wide">
          <Zap size={22} className="fill-neutral-200 text-neutral-200" /> FLASH SALE
        </h2>
        <span className="text-xs sm:text-sm text-neutral-400">Ending in</span>
        <span className="flex items-center gap-1 font-mono text-sm font-bold">
          {[h, m, s].map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="bg-neutral-100 text-neutral-900 rounded-md px-1.5 py-0.5 min-w-[2rem] text-center">{v}</span>
              {i < 2 && <span className="text-neutral-500 font-bold">:</span>}
            </span>
          ))}
        </span>
        <Link to="/shop?flash=1" className="bg-white text-neutral-900 font-semibold rounded-full ml-auto text-xs px-4 py-1.5">Shop All</Link>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar mt-3 pb-1">
        {products.map((p) => (
          <div key={p._id} className="w-[160px] sm:w-[190px] shrink-0"><ProductCard product={p} /></div>
        ))}
      </div>
    </section>
  );
}
