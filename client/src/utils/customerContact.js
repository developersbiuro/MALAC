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
