// Placeholder-safe customer contact (moved out of AdminOrders so the
// printed invoice filters synthetic identifiers exactly the same way).
// Sign-up is ONE-method, so the unused identifier is a synthetic
// placeholder (phone "email-<hex>" / email "phone-…@malac.local"). Never
// render those: show the customer's real other identifier instead.
export const isRealPhone = (p) => !!p && !String(p).startsWith("email-");
export const isRealEmail = (e) => !!e && !String(e).endsWith("@malac.local");
export function customerContact(user, address) {
  const userPhone = isRealPhone(user?.phone) ? user.phone : "";
  const secondary = isRealPhone(user?.secondaryPhone) ? user.secondaryPhone : "";
  const addressPhone = isRealPhone(address?.phone) ? address.phone : "";
  const email = isRealEmail(user?.email) ? user.email : "";
  const phone = userPhone || secondary || addressPhone;
  return { email, phone, line: [email, phone].filter(Boolean).join(" · ") };
}

// Privacy masking for REVIEW displays (owner's rule, 2026-11-12): a
// review never exposes the customer's full name, phone or email — the
// real values stay in the database, only the display is masked.
//   "Muhammad Abdullah" -> "M***d A***h"
//   "+92 303 6253428"   -> "0303*****28"
//   "someone@gmail.com" -> "so***@gmail.com"
export function maskName(name) {
  const s = String(name || "").trim();
  if (!s) return "MALAC Customer";
  return s.split(/\s+/).map((w) => {
    if (w.length <= 1) return w;
    if (w.length === 2) return `${w[0]}*`;
    return `${w[0]}***${w[w.length - 1]}`;
  }).join(" ");
}
export function maskPhone(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("92")) d = `0${d.slice(2)}`; // +92… -> 0…
  if (d.length < 7) return "***";
  return `${d.slice(0, 4)}*****${d.slice(-2)}`;
}
export function maskEmail(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at < 2) return s ? "***" : "";
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}
export function maskedContactLine(user) {
  const c = customerContact(user);
  return [c.email ? maskEmail(c.email) : "", c.phone ? maskPhone(c.phone) : ""].filter(Boolean).join(" · ");
}
