// The ONE verification rule for customer accounts. Sign-up is Daraz-style
// ONE-method: the customer verifies exactly ONE channel — their email
// (email OTP) or their phone (WhatsApp OTP) — or neither, when Google
// verified their identity instead. A customer therefore counts as
// verified when ANY ONE of these holds. (The old rule required BOTH
// emailVerified && phoneVerified; do not reintroduce it for customers.
// Staff accounts are governed by their own flows and never by this.)
export const isVerifiedCustomer = (u) =>
  Boolean(u?.googleId) || Boolean(u?.emailVerified) || Boolean(u?.phoneVerified);
export default isVerifiedCustomer;
