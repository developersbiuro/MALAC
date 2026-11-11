import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rs } from "../utils/format.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";
import { useSeo } from "../utils/seo.js";

// Daraz-style cart PAGE (Abdullah, 2026-11-11: "cart k liye esa page
// open ho na k side bar"): every item has a selection checkbox, an
// "All" selector, and a sticky bottom bar with the subtotal of the
// SELECTED items and a Check Out (n) button. Checkout honours the
// selection (keys handed over via sessionStorage); unselected items
// simply stay in the cart.
export default function CartPage() {
  const { fees } = usePublicSettings();
  const { items, updateQty, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(() => items.map((i) => i.key));
  useSeo({ title: "Shopping Cart — MALAC", robots: "noindex" });

  // Keep the selection in step with the cart: new items arrive
  // selected, removed items drop out.
  useEffect(() => {
    setSelected((prev) => {
      const keys = items.map((i) => i.key);
      const kept = prev.filter((k) => keys.includes(k));
      const added = keys.filter((k) => !kept.includes(k));
      return [...kept, ...added];
    });
  }, [items]);

  const selItems = items.filter((i) => selected.includes(i.key));
  const selSubtotal = selItems.reduce((s, i) => s + i.price * i.qty, 0);
  const allSelected = items.length > 0 && selected.length === items.length;
  const toggleAll = () => setSelected(allSelected ? [] : items.map((i) => i.key));
  const toggleOne = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const applyCoupon = async () => {
    try {
      const r = await api.get(`/coupons/validate/${code}`, { params: { subtotal: selSubtotal } });
      if (r.data.valid) { setCoupon(r.data); setMsg(`Applied: -${rs(r.data.discount)}`); }
      else { setCoupon(null); setMsg(r.data.reason || "Invalid coupon"); }
    } catch { setMsg("Could not validate coupon"); }
  };

  const discount = coupon?.discount || 0;
  const shipping = selItems.length === 0 ? 0 : (selSubtotal - discount >= fees.freeThreshold ? 0 : fees.standard);
  const total = selSubtotal - discount + shipping;

  const goCheckout = () => {
    if (selected.length === 0) return;
    try { sessionStorage.setItem("malac_checkout_keys", JSON.stringify(selected)); } catch { /* ignore */ }
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

  const check = "w-[18px] h-[18px] shrink-0 cursor-pointer";
  const checkStyle = { accentColor: "#f85606" };

  return (
    <main className="max-w-6xl mx-auto px-3 pt-4 pb-24 lg:pb-8 grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <section className="bg-white rounded-md p-4">
        <div className="flex justify-between items-center mb-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className={check} style={checkStyle} aria-label="Select all items" />
            <h1 className="font-bold text-lg">Shopping Cart ({items.length})</h1>
          </label>
          <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500">Clear cart</button>
        </div>
        {items.map((i) => (
          <div key={i.key} className="flex gap-3 border-b py-3 items-start">
            <input
              type="checkbox"
              checked={selected.includes(i.key)}
              onChange={() => toggleOne(i.key)}
              className={`${check} mt-6 sm:mt-8`}
              style={checkStyle}
              aria-label={`Select ${i.title}`}
            />
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
        <div className="flex justify-between"><span>Subtotal ({selItems.length} selected)</span><span>{rs(selSubtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span className="text-green-600">-{rs(discount)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : rs(shipping)}</span></div>
        <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-brand">{rs(total)}</span></div>
        <button onClick={goCheckout} disabled={selected.length === 0} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-40">Proceed to Checkout</button>
        {!user && <p className="text-[11px] text-gray-400">You will be asked to log in or sign up before placing the order.</p>}
      </aside>

      {/* Daraz-style sticky checkout bar (mobile/tablet; the summary
          aside covers desktop). The bottom nav is hidden on /cart, so
          this bar owns the bottom edge. */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div
          className="flex items-center gap-3 px-3 pt-2.5"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
        >
          <label className="flex items-center gap-1.5 text-sm cursor-pointer shrink-0">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className={check} style={checkStyle} aria-label="Select all items" />
            All
          </label>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm">Subtotal: <b className="text-brand">{rs(selSubtotal)}</b></p>
            <p className="text-[11px] leading-tight">
              {shipping === 0
                ? <span className="text-green-600 font-medium">Free Shipping</span>
                : <span className="text-gray-500">Shipping {rs(shipping)}</span>}
              {discount > 0 && <span className="text-pink-600 font-medium"> · Total Discount {rs(discount)}</span>}
            </p>
          </div>
          <button
            onClick={goCheckout}
            disabled={selected.length === 0}
            className="shrink-0 bg-brand text-white font-semibold rounded px-5 py-3 text-sm disabled:opacity-40"
          >
            Check Out ({selItems.length})
          </button>
        </div>
      </div>
    </main>
  );
}
