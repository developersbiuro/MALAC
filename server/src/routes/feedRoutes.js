import { Router } from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";

// Google Merchant Center product feed (GET /google-feed.xml).
//
// RSS 2.0 with the Google "g:" namespace, generated live from the same
// products the storefront shows. Merchant Center fetches this URL on a
// schedule for FREE listings (and it works for Shopping ads later).
// Mounted OUTSIDE the /api database-readiness gate in app.js (same as
// the sitemap): Google's fetcher must always get a 200, so any DB
// failure falls back to a valid feed with an empty channel.
const SITE_URL = "https://malac1.vercel.app";

const router = Router();

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n) => `${Number(n || 0).toFixed(2)} PKR`;

const absolute = (u) => {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.startsWith("/") ? `${SITE_URL}${s}` : s;
};

function itemXml(p) {
  const price = p.basePrice;
  const onSale = p.salePrice > 0 && p.salePrice < p.basePrice;
  const inStock = p.status === "Active" && Number(p.stock || 0) > 0;
  const type = p.subCategory ? `${p.category} > ${p.subCategory}` : p.category;
  const parts = [
    `<g:id>${esc(p.sku || p.slug)}</g:id>`,
    `<title>${esc(p.title)}</title>`,
    `<description>${esc(p.description || p.title)}</description>`,
    `<link>${esc(`${SITE_URL}/product/${p.slug}`)}</link>`,
  ];
  const img = absolute(Array.isArray(p.images) ? p.images[0] : "");
  if (img) parts.push(`<g:image_link>${esc(img)}</g:image_link>`);
  parts.push(`<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>`);
  parts.push(`<g:price>${money(price)}</g:price>`);
  if (onSale) parts.push(`<g:sale_price>${money(p.salePrice)}</g:sale_price>`);
  parts.push(`<g:condition>new</g:condition>`);
  parts.push(`<g:brand>MALAC</g:brand>`);
  parts.push(`<g:product_type>${esc(type)}</g:product_type>`);
  return `    <item>${parts.join("")}</item>`;
}

// Best-effort DB access (same helper pattern as sitemapRoutes). Never throws.
async function tryDb() {
  if (mongoose.connection.readyState === 1) return true;
  try {
    await connectDB();
  } catch {
    /* fall through — caller serves the empty feed */
  }
  return mongoose.connection.readyState === 1;
}

router.get("/google-feed.xml", async (req, res) => {
  let items = [];
  if (await tryDb()) {
    try {
      // Same visibility rule as the storefront list and the sitemap.
      const products = await Product.find({ status: { $in: ["Active", "Out of Stock"] } })
        .select("sku slug title description images category subCategory basePrice salePrice stock status")
        .lean();
      items = products.map(itemXml);
    } catch {
      /* empty-feed fallback */
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>MALAC — Online Shopping in Pakistan</title>\n` +
    `    <link>${SITE_URL}/</link>\n` +
    `    <description>MALAC product feed for Google Merchant Center free listings.</description>\n` +
    items.join("\n") +
    (items.length ? "\n" : "") +
    `  </channel>\n</rss>\n`;

  res.set({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  res.send(xml);
});

export default router;
