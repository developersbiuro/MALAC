// Security response headers for everything THIS Express app serves:
// the JSON API (/api/*), uploaded files (/uploads/*) and the sitemap.
// The storefront/admin HTML is served by the separate client service, so
// a strict API-side policy cannot break the SPA — and conversely these
// headers do not cover the HTML pages themselves (framing protection
// for the pages should be added at the client service / vercel.json;
// the API is the credential-bearing surface and is fully covered here).
//
// - nosniff: uploaded screenshots/catalog images are served from this
//   app; browsers must not MIME-sniff them into something executable.
// - DENY framing + CSP frame-ancestors: API/upload responses are never
//   meant to be framed (clickjacking defence in depth).
// - CSP default-src 'none': JSON/XML/image responses need no scripts,
//   styles or frames of their own.
// - Referrer-Policy no-referrer: API responses (incl. admin data) never
//   leak URLs onward.
// - HSTS: production only (avoids pinning plain-HTTP local development).
import env from "../config/env.js";

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (env.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export default securityHeaders;
