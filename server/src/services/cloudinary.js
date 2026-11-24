import crypto from "crypto";
import env from "../config/env.js";

// Durable upload storage on Cloudinary (audit M6, 2026-11-24) for the
// two upload kinds that used to sit in the server's ephemeral temp
// dir: catalogue images (public CDN assets) and payment screenshots
// (PRIVATE — uploaded with delivery type "authenticated", so there is
// no public bearer URL; staff view them through our own
// permission-checked endpoint, which is also the audit M4 fix).
//
// Implemented against the REST API with signed requests — no SDK and
// no new dependency. Everything degrades gracefully: while
// CLOUDINARY_URL is unset, cloudinaryConfigured() is false and the
// callers keep the old disk behaviour, so this code is safe to deploy
// before the credential lands in Vercel. The credential VALUE is only
// ever read from the environment — never logged, never returned.

function config() {
  // Tolerate the value exactly as the Cloudinary dashboard offers it:
  // a bare cloudinary:// URL, or the .env sample line
  // "CLOUDINARY_URL=cloudinary://..." (either may arrive quoted).
  const raw = String(env.cloudinaryUrl || "").trim().replace(/^["']|["']$/g, "");
  const m = /cloudinary:\/\/([^:]+):([^@]+)@([^\s"']+)$/.exec(raw);
  if (!m) return null;
  // The dashboard's format sample uses literal placeholders
  // ("<your_api_key>") — a value pasted from that sample is NOT a
  // credential. Refuse it so /api/health reports the truth instead
  // of claiming Cloudinary is live (this exact paste happened on
  // 2026-11-25 and cost a redeploy cycle to diagnose).
  if (/[<>{}]|your_/i.test(m[1] + m[2] + m[3])) return null;
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
}

export const cloudinaryConfigured = () => !!config();

// Cloudinary's request signature: every signed parameter as
// "key=value" pairs, sorted by key, joined with "&", secret appended,
// SHA-1 hex. Used identically for uploads and private downloads.
const signParams = (params, secret) =>
  crypto.createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret)
    .digest("hex");

// Uploads one image buffer. type "upload" = public asset (its
// secure_url is the durable link); type "authenticated" = reachable
// only through a signed URL. Returns { publicId, format, secureUrl }.
export async function cloudinaryUpload(buffer, { publicId, type, mime }) {
  const cfg = config();
  if (!cfg) throw new Error("Cloudinary is not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp, type }, cfg.apiSecret);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime || "image/jpeg" }), "upload");
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("type", type);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
    method: "POST", body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status}): ${data?.error?.message || "unknown error"}`);
  return { publicId: data.public_id, format: data.format, secureUrl: data.secure_url };
}

// Short-lived signed download URL for an "authenticated" asset (the
// private-download API — same signature scheme as uploads). Our
// server fetches through it and streams the bytes to staff, so the
// URL itself never reaches a browser.
export function cloudinarySignedDownloadUrl(publicId, format) {
  const cfg = config();
  if (!cfg) return null;
  const params = {
    expires_at: Math.floor(Date.now() / 1000) + 600,
    format, public_id: publicId, type: "authenticated",
  };
  const signature = signParams(params, cfg.apiSecret);
  const qs = new URLSearchParams({ ...params, api_key: cfg.apiKey, signature });
  return `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/download?${qs.toString()}`;
}

// Fallback delivery form: the signed res.cloudinary URL for an
// authenticated asset — s--<first 8 chars of base64url(sha1(
// "<public_id>.<format>" + secret))>-- in the path.
export function cloudinarySignedDeliveryUrl(publicId, format) {
  const cfg = config();
  if (!cfg) return null;
  const sig = crypto.createHash("sha1").update(`${publicId}.${format}${cfg.apiSecret}`).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 8);
  return `https://res.cloudinary.com/${cfg.cloudName}/image/authenticated/s--${sig}--/${publicId}.${format}`;
}
