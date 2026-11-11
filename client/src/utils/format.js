export const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

// Friendly, customer-readable text for a rejected voucher — the raw
// server reasons ("Coupon not found") read like system errors. Every
// rejection starts with the words "Invalid voucher" so the customer
// sees exactly that (Abdullah's requirement, 2026-11-11).
export const couponReason = (reason) => ({
  "Coupon not found": "Invalid voucher — ye code maujood nahi hai. Spelling check karke dobara try karein.",
  "Coupon has expired": "Invalid voucher — is code ki muddat khatam ho gayi hai.",
  "Coupon is inactive": "Invalid voucher — ye code abhi active nahi hai.",
}[reason] || reason || "Invalid voucher — ye code nahi chal saka.");
// Fallback free-shipping threshold ONLY — every surface that shows or
// charges delivery reads the LIVE value from Admin → Settings via
// usePublicSettings(); this constant just covers the first paint.
export const FREE_SHIPPING_THRESHOLD = 3000;
export const discountPct = (p) =>
  p.salePrice > 0 ? Math.round(((p.basePrice - p.salePrice) / p.basePrice) * 100) : 0;
export const priceOf = (p) => (p.salePrice > 0 ? p.salePrice : p.basePrice);
export const deliveryWindow = (method = "Standard") => {
  const days = method === "Express" ? [1, 2] : [3, 5];
  const fmt = (d) => d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  return `${fmt(new Date(Date.now() + days[0] * 86400000))} - ${fmt(new Date(Date.now() + days[1] * 86400000))}`;
};
