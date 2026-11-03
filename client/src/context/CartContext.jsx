import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem("malac_cart")) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => localStorage.setItem("malac_cart", JSON.stringify(items)), [items]);

  const add = (product, qty = 1, variantLabel = "", unitPrice = null) => {
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
  };
  const updateQty = (key, qty) =>
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.key !== key)
      : prev.map((i) => i.key === key ? { ...i, qty: Math.min(qty, i.stock || 99) } : i));
  const remove = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clear = () => setItems([]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, count, subtotal, drawerOpen, setDrawerOpen }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
