import crypto from "crypto";

// Password hashing using Node's built-in scrypt so the project needs no
// extra dependency. Stored format: "scrypt:<salt>:<hash>". Used for BOTH
// customer passwords (chosen at sign-up, activated only after email + phone
// OTP verification) and staff passwords (set through the approval-gated
// reset flow). Plain-text passwords are never stored or returned.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return actual.length === expectedBuf.length && crypto.timingSafeEqual(actual, expectedBuf);
}

export default hashPassword;
