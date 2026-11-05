// In-house fixed-window rate limiting for auth-sensitive endpoints.
//
// Deliberately dependency-free (no express-rate-limit): the counters live
// in a Map inside THIS server instance. Caveat: on a multi-instance
// deployment (e.g. several serverless containers) each instance keeps its
// own counters, so the effective global limit is (limit × instances).
// That is acceptable for MALAC's current single-service deployment — the
// limits blunt online brute force / OTP spam, they are not a hard
// security boundary (account lockout in utils/loginGuard.js is the
// per-account backstop, and OTP codes themselves are attempt-capped in
// services/otpService.js). Move to a shared store (Redis / Mongo) if the
// API is ever scaled out.
//
// Client IP: on Vercel the platform sets X-Forwarded-For and req.ip is
// the edge address (shared by everyone), so the first XFF entry is the
// real client. If the app is ever exposed WITHOUT a trusted proxy, XFF
// becomes spoofable and per-IP limits degrade gracefully — per-identifier
// limits and lockouts still apply.
import { normalizePhone } from "../utils/phone.js";

export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export const ipKey = (req) => `ip:${getClientIp(req)}`;

// Per-account-identifier key: whichever identifier the endpoint accepts
// (identifier / email / phone), normalized so the same account typed in
// different shapes shares one counter.
export function identifierKey(req) {
  const raw = req.body?.identifier || req.body?.email || req.body?.phone || "";
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  return `id:${value.includes("@") ? value : normalizePhone(value)}`;
}

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export function rateLimit({ windowMs, max, key, message = TOO_MANY }) {
  const buckets = new Map();
  return (req, res, next) => {
    let bucketKey = null;
    try {
      bucketKey = key(req);
    } catch {
      bucketKey = null;
    }
    if (!bucketKey) return next();
    const now = Date.now();
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;
    // Opportunistic sweep so a flood of distinct keys cannot grow the
    // Map without bound.
    if (buckets.size > 10000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ message });
    }
    return next();
  };
}

export default rateLimit;
