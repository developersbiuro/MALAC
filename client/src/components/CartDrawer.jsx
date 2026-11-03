import { Link } from "react-router-dom";
import { X, Trash2, CheckCircle2, Truck } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { rs, FREE_SHIPPING_THRESHOLD } from "../utils/format.js";

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQty, remove, subtotal } = useCart();
  if (!drawerOpen) return null;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-[340px] max-w-[92vw] bg-white shadow-xl flex flex-col fade-up">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-serif font-semibold text-xl">Your Shopping Bag ({items.length})</p>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close cart"><X size={20} /></button>
        </div>
        {items.length > 0 && (
          <div className="px-3 py-2.5 border-b bg-cream">
            {remaining > 0 ? (
              <p className="text-xs flex items-center gap-1.5">
                <Truck size={14} className="text-lux-burnt shrink-0" />
                <span>Add <b className="text-lux-burnt">{rs(remaining)}</b> more for <b>FREE shipping</b></span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-[#059669] flex items-center gap-1.5">
                <CheckCircle2 size={14} /> You&apos;ve unlocked FREE shipping
              </p>
            )}
            <div className="h-2 bg-cream-deep rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${remaining > 0 ? "bg-lux-gradient" : "bg-[#059669]"}`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Your bag is feeling light — explore the collection and add something beautiful.</p>}
          {items.map((i) => (
            <div key={i.key} className="flex gap-2">
              <img src={i.image} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                <p className="line-clamp-2 leading-snug">{i.title}</p>
                {i.variantLabel && <p className="text-xs text-gray-400 truncate">{i.variantLabel}</p>}
                <p className="text-lux-amber font-semibold">{rs(i.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} className="border rounded-full px-2.5 py-1 min-w-[30px]" aria-label="Decrease quantity">-</button>
                  <span className="min-w-[1.25rem] text-center">{i.qty}</span>
                  <button onClick={() => updateQty(i.key, i.qty + 1)} className="border rounded-full px-2.5 py-1 min-w-[30px]" aria-label="Increase quantity">+</button>
                  <button onClick={() => remove(i.key)} className="text-red-400 ml-auto p-1.5" aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t">
          <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><b>{rs(subtotal)}</b></div>
          <Link to="/cart" onClick={() => setDrawerOpen(false)}
            className="block text-center border border-lux-amber text-lux-burnt rounded-full py-2 text-sm mb-2 font-medium">View Cart</Link>
          <Link to="/checkout" onClick={() => setDrawerOpen(false)}
            className="btn-lux w-full py-2.5 text-sm">Proceed to Checkout</Link>
          <p className="text-[11px] text-gray-400 mt-2 text-center">Login is required to place an order.</p>
        </div>
      </aside>
    </div>
  );
}
