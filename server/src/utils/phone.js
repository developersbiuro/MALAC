// Phone numbers are stored across MALAC in international +92 format
// (see the seed data and OTP_SENDER_PHONE). Customers, however, type
// numbers in local shapes — 0323…, 92 323…, +92-323… — so normalize to
// the stored canonical form before any lookup or save.
export function normalizePhone(value) {
  let p = String(value || "").replace(/[\s()\-]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("0")) p = `+92${p.slice(1)}`;
  else if (/^92\d{10}$/.test(p)) p = `+${p}`;
  return p;
}

// The significant national digits (last 10), e.g. "3236016684" — used to
// sanity-check that a typed number can be a real Pakistani mobile.
export function phoneLast10(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}
export default normalizePhone;
