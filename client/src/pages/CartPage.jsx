import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rs } from "../utils/format.js";

export default function CartPage() {
  const { items, updateQty, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [msg, setMsg] = useState("");

  const applyCoupon = async () => {
    try {
      const r = await api.get(`/coupons/validate/${code}`, { params: { subtotal } });
      if (r.data.valid) { setCoupon(r.data); setMsg(`Applied: -${rs(r.data.discount)}`); }
      else { setCoupon(null); setMsg(r.data.reason || "Invalid coupon"); }
    } catch { setMsg("Could not validate coupon"); }
  };

  const discount = coupon?.discount || 0;
  const shipping = items.length === 0 ? 0 : (subtotal - discount >= 5000 ? 0 : 199);
  const total = subtotal - discount + shipping;

  const goCheckout = () => {
    // No guest ordering: login required before checkout (server also enforces 401).
    if (!user) navigate(`/login?redirect=${encodeURIComponent("/checkout")}`);
    else navigate("/checkout");
  };

  if (items.length === 0) return (
    <main className="max-w-5xl mx-auto px-3 pt-8">
      <div className="bg-white rounded-md p-10 text-center">
        <p className="text-gray-400">Your cart is empty.</p>
        <Link to="/shop" className="inline-block mt-3 bg-brand text-white px-5 py-2 rounded text-sm">Continue Shopping</Link>
      </div>
    </main>
  );

  return (
    <main className="max-w-6xl mx-auto px-3 pt-4 grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <section className="bg-white rounded-md p-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-bold text-lg">Shopping Cart ({items.length})</h1>
          <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500">Clear cart</button>
        </div>
        {items.map((i) => (
          <div key={i.key} className="flex gap-3 border-b py-3">
            <img src={i.image} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="break-words">{i.title}</p>
              {i.variantLabel && <p className="text-xs text-gray-400 truncate">{i.variantLabel}</p>}
              <p className="text-brand font-semibold mt-1">{rs(i.price)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <button onClick={() => updateQty(i.key, i.qty - 1)} className="border rounded px-2.5 py-1 min-w-[30px]" aria-label="Decrease quantity">-</button>
                <span className="min-w-[1.25rem] text-center">{i.qty}</span>
                <button onClick={() => updateQty(i.key, i.qty + 1)} className="border rounded px-2.5 py-1 min-w-[30px]" aria-label="Increase quantity">+</button>
                <button onClick={() => remove(i.key)} className="text-red-400 ml-1 p-1.5" aria-label="Remove item"><Trash2 size={15} /></button>
              </div>
            </div>
            <b className="text-sm shrink-0">{rs(i.price * i.qty)}</b>
          </div>
        ))}
      </section>
      <aside className="bg-white rounded-md p-4 text-sm space-y-2 lg:sticky lg:top-32">
        <p className="font-semibold">Order Summary</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Voucher code (try WELCOME10)" className="border rounded px-2 py-1.5 flex-1 min-w-0" />
          <button onClick={applyCoupon} className="bg-brand text-white rounded px-3">Apply</button>
        </div>
        {msg && <p className="text-xs text-gray-500">{msg}</p>}
        <div className="flex justify-between"><span>Subtotal</span><span>{rs(subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span className="text-green-600">-{rs(discount)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : rs(shipping)}</span></div>
        <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-brand">{rs(total)}</span></div>
        <button onClick={goCheckout} className="w-full bg-brand text-white rounded py-2.5 font-medium">Proceed to Checkout</button>
        {!user && <p className="text-[11px] text-gray-400">You will be asked to log in or sign up before placing the order.</p>}
      </aside>
    </main>
  );
}
