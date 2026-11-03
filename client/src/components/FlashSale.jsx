import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <section className="bg-white rounded-md mt-3 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-brand font-bold text-lg">Flash Sale</h2>
        <span className="text-sm text-gray-500">Ending in</span>
        <span className="flex gap-1 text-white font-mono text-sm">
          {[h, m, s].map((v, i) => <span key={i} className="bg-brand rounded px-1.5 py-0.5">{v}</span>)}
        </span>
        <Link to="/shop?flash=1" className="ml-auto text-sm text-brand border border-brand rounded px-3 py-1">Shop All</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar mt-3 pb-1">
        {products.map((p) => (
          <div key={p._id} className="w-[160px] sm:w-[190px] shrink-0"><ProductCard product={p} /></div>
        ))}
      </div>
    </section>
  );
}
