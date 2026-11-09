import { createContext, useContext, useEffect, useState } from "react";
import { hasSession } from "../utils/authGate.js";

const WishlistContext = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem("malac_wishlist")) || []; } catch { return []; } };

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);
  useEffect(() => localStorage.setItem("malac_wishlist", JSON.stringify(items)), [items]);
  const toggle = (product) => {
    if (!hasSession()) return false; // guest lock: wishlist is a signed-in function
    setItems((prev) =>
      prev.some((p) => p._id === product._id) ? prev.filter((p) => p._id !== product._id) : [...prev, product]);
    return true;
  };
  const has = (id) => items.some((p) => p._id === id);
  return <WishlistContext.Provider value={{ items, toggle, has }}>{children}</WishlistContext.Provider>;
}
export const useWishlist = () => useContext(WishlistContext);
