import { createContext, useContext, useEffect, useRef, useState } from "react";
import { hasSession } from "../utils/authGate.js";
import { useAuth } from "./AuthContext.jsx";
import api from "../api/client.js";

const WishlistContext = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem("malac_wishlist")) || []; } catch { return []; } };

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);
  const { user } = useAuth();
  const syncedFor = useRef(null);
  useEffect(() => localStorage.setItem("malac_wishlist", JSON.stringify(items)), [items]);

  // Push this device's full ID list to the account copy (fire and
  // forget — the local list is never blocked on the network).
  const pushIds = (list) => {
    if (!hasSession()) return;
    api.put("/auth/me/wishlist", { ids: list.map((p) => p._id) }).catch(() => {});
  };

  // Cross-device sync (audit L5, 2026-11-25): when a customer session
  // becomes active, merge the account wishlist with this device's
  // local list — union, so nothing is ever lost. Server-only IDs are
  // resolved against the live catalogue (archived products simply
  // drop out), and the merged list is pushed back so both copies
  // agree. Any failure leaves the local behaviour untouched.
  useEffect(() => {
    if (!user) { syncedFor.current = null; return; }
    if (user.role !== "customer" || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const r = await api.get("/auth/me/wishlist");
        const serverIds = Array.isArray(r.data?.wishlist) ? r.data.wishlist : [];
        const localIds = items.map((p) => p._id);
        const missing = serverIds.filter((id) => !localIds.includes(id));
        let extra = [];
        if (missing.length) {
          const cat = await api.get("/products", { params: { limit: 100 } });
          const all = cat.data?.products || [];
          const byId = new Map(all.map((p) => [p._id, p]));
          extra = missing.map((id) => byId.get(id)).filter(Boolean);
        }
        if (extra.length) {
          const merged = [...items, ...extra];
          setItems(merged);
          pushIds(merged);
        } else {
          pushIds(items);
        }
      } catch { /* local wishlist keeps working untouched */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggle = (product) => {
    if (!hasSession()) return false; // guest lock: wishlist is a signed-in function
    const next = items.some((p) => p._id === product._id)
      ? items.filter((p) => p._id !== product._id)
      : [...items, product];
    setItems(next);
    pushIds(next);
    return true;
  };
  const has = (id) => items.some((p) => p._id === id);
  return <WishlistContext.Provider value={{ items, toggle, has }}>{children}</WishlistContext.Provider>;
}
export const useWishlist = () => useContext(WishlistContext);
