export function generateOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MLC-${stamp}-${rand}`;
}
export default generateOrderId;
