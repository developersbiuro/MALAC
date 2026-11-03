export const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
// Store-wide free-shipping rule (Rs. 5,000) — the same threshold hardcoded in
// CartPage/Checkout shipping math and in the server's order service.
export const FREE_SHIPPING_THRESHOLD = 5000;
export const discountPct = (p) =>
  p.salePrice > 0 ? Math.round(((p.basePrice - p.salePrice) / p.basePrice) * 100) : 0;
export const priceOf = (p) => (p.salePrice > 0 ? p.salePrice : p.basePrice);
export const deliveryWindow = (method = "Standard") => {
  const days = method === "Express" ? [1, 2] : [3, 5];
  const fmt = (d) => d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  return `${fmt(new Date(Date.now() + days[0] * 86400000))} - ${fmt(new Date(Date.now() + days[1] * 86400000))}`;
};
