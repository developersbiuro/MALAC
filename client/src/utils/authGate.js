// Guest lock (Abdullah, 2026-11-09): browsing the storefront is public,
// but EVERY function — cart, wishlist, tracking, chat, coupons, orders —
// needs a signed-in account. The token lives in localStorage (set by
// AuthContext.saveSession); reading it here lets action handlers gate
// instantly, while the server enforces the same rule with 401s.
export const hasSession = () => {
  try { return !!localStorage.getItem("malac_token"); } catch { return false; }
};
export const loginPath = (redirect) =>
  `/login?redirect=${encodeURIComponent(redirect || "/")}`;
