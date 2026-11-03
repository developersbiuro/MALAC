import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";
import { effectivePermissions } from "../utils/permissions.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], env.jwtSecret);
    req.user = await User.findById(decoded.id).select("-__v");
    if (!req.user) return res.status(401).json({ message: "User no longer exists" });
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
}

// authorize("admin") -> Super Admin only; authorize("admin","vice-admin") -> staff
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Forbidden: requires role ${roles.join(" or ")}`,
    });
  }
  next();
};
export const isStaff = authorize("admin", "vice-admin");
export const isSuperAdmin = authorize("admin");

// Section gate for staff routes: passes when the account's EFFECTIVE
// permissions (utils/permissions.js — Super Admin gets all, a Vice-Admin
// gets their Super-Admin-chosen set; the legacy default applies only
// when no choice was ever saved) include the key. Runs after protect
// (and usually isStaff); answers 403 otherwise.
export const requirePermission = (key) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  if (!effectivePermissions(req.user).includes(key)) {
    return res.status(403).json({
      message: `Forbidden: your account does not have the "${key}" permission. Ask the Super Admin to grant it in Roles & Users.`,
    });
  }
  next();
};
