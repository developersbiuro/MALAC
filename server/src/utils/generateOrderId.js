// Short, human-friendly order IDs (Abdullah, 2026-11-07: the old
// MLC-<timestamp>-<4 digits> form was too long). "MLC-" + 6 random
// letters/digits = 36^6 ≈ 2.2 billion combinations; createOrder retries
// on the unique-index collision, and the public track endpoint is IP
// rate-limited, so short does not mean guessable in practice. Orders
// placed before this change keep their long IDs and still track fine
// (lookup is an exact match on whatever ID the order carries).
export function generateOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `MLC-${code}`;
}
export default generateOrderId;
