import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasSession } from "../utils/authGate.js";

const CartContext = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem("malac_cart")) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  // Small "added to cart" toast (Daraz-style feedback): the cart itself
  // is a full PAGE (/cart) — no slide-in drawer anywhere.
  const [toast, setToast] = useState(null);
  useEffect(() => localStorage.setItem("malac_cart", JSON.stringify(items)), [items]);

  const add = (product, qty = 1, variantLabel = "", unitPrice = null) => {
    if (!hasSession()) return false; // guest lock: cart is a signed-in function
    setToast({ id: Date.now(), text: product.title });
    const price = unitPrice ?? (product.salePrice > 0 ? product.salePrice : product.basePrice);
    setItems((prev) => {
      const key = `${product._id}|${variantLabel}`;
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => i.key === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, {
        key, product: product._id, title: product.title,
        image: product.images?.[0] || "", sku: product.sku,
        variantLabel, price, qty, stock: product.stock,
      }];
    });
    return true;
  };
  const updateQty = (key, qty) => {
    if (!hasSession()) return false;
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.key !== key)
      : prev.map((i) => i.key === key ? { ...i, qty: Math.min(qty, i.stock || 99) } : i));
    return true;
  };
  const remove = (key) => {
    if (!hasSession()) return false;
    setItems((prev) => prev.filter((i) => i.key !== key));
    return true;
  };
  const clear = () => { if (hasSession()) setItems([]); };
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, count, subtotal, toast, setToast }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
