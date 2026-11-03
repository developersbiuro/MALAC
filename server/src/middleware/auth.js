import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";

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
