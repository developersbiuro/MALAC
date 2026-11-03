import { Link } from "react-router-dom";
import { X, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { rs } from "../utils/format.js";

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQty, remove, subtotal } = useCart();
  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-[340px] max-w-[92vw] bg-white shadow-xl flex flex-col fade-up">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold">Shopping Cart ({items.length})</p>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close cart"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Your cart is empty.</p>}
          {items.map((i) => (
            <div key={i.key} className="flex gap-2">
              <img src={i.image} alt="" className="w-16 h-16 object-cover rounded" />
              <div className="flex-1 text-sm">
                <p className="line-clamp-2 leading-snug">{i.title}</p>
                {i.variantLabel && <p className="text-xs text-gray-400">{i.variantLabel}</p>}
                <p className="text-brand font-medium">{rs(i.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} className="border rounded px-2">-</button>
                  <span>{i.qty}</span>
                  <button onClick={() => updateQty(i.key, i.qty + 1)} className="border rounded px-2">+</button>
                  <button onClick={() => remove(i.key)} className="text-red-400 ml-auto" aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t">
          <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><b>{rs(subtotal)}</b></div>
          <Link to="/cart" onClick={() => setDrawerOpen(false)}
            className="block text-center border border-brand text-brand rounded py-2 text-sm mb-2">View Cart</Link>
          <Link to="/checkout" onClick={() => setDrawerOpen(false)}
            className="block text-center bg-brand text-white rounded py-2 text-sm font-medium">Checkout</Link>
          <p className="text-[11px] text-gray-400 mt-2 text-center">Login is required to place an order.</p>
        </div>
      </aside>
    </div>
  );
}
