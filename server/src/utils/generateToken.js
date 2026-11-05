import jwt from "jsonwebtoken";
import env from "../config/env.js";

const STAFF_ROLES = ["admin", "vice-admin"];

// Session lifetimes differ by role: customers get the long-lived token
// (JWT_EXPIRES_IN, default 30d — shopping convenience), while staff
// (Super Admin / Vice-Admin) get the short-lived one
// (JWT_STAFF_EXPIRES_IN, default 12h) so a leaked staff token stops
// working the same day. Verification is unchanged — middleware/auth.js
// accepts any unexpired token regardless of role.
export function generateToken(user) {
  const expiresIn = STAFF_ROLES.includes(user.role)
    ? env.staffJwtExpiresIn
    : env.jwtExpiresIn;
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn });
}
export default generateToken;
