import { Router } from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

// Dynamic sitemap for search engines (GET /sitemap.xml).
//
// This router is mounted OUTSIDE the /api database-readiness gate in
// app.js on purpose: crawlers must always get a 200, even while the
// database is down or still reconnecting. Any DB failure therefore falls
// back to the static routes only, and the dynamic sections are added
// whenever the connection is (or becomes) available.
const SITE_URL = "https://www.malac.pp.ua";

const router = Router();

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function entryXml({ loc, lastmod, changefreq, priority }) {
  const parts = [`<loc>${esc(loc)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`<priority>${priority}</priority>`);
  return `  <url>${parts.join("")}</url>`;
}

// Best-effort DB access: reuse an open connection, otherwise try one
// connect (same helper the /api gate uses). Never throws.
async function tryDb() {
  if (mongoose.connection.readyState === 1) return true;
  try {
    await connectDB();
  } catch {
    /* fall through — caller serves the static-only sitemap */
  }
  return mongoose.connection.readyState === 1;
}

router.get("/sitemap.xml", async (req, res) => {
  // Static + category entries carry the generation date as <lastmod>
  // (products below use their real updatedAt). Same URL set as before.
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today, changefreq: "daily", priority: "1.0" },
    { loc: `${SITE_URL}/shop`, lastmod: today, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE_URL}/track-order`, lastmod: today, changefreq: "weekly", priority: "0.5" },
    { loc: `${SITE_URL}/about`, lastmod: today, changefreq: "monthly", priority: "0.4" },
    { loc: `${SITE_URL}/blog`, lastmod: today, changefreq: "weekly", priority: "0.5" },
    { loc: `${SITE_URL}/blog/online-shopping-in-pakistan-malac`, lastmod: "2026-11-14", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/terms`, lastmod: today, changefreq: "monthly", priority: "0.3" },
    { loc: `${SITE_URL}/policy`, lastmod: today, changefreq: "monthly", priority: "0.3" },
  ];

  if (await tryDb()) {
    try {
      // NOTE: the shop filters by category NAME (productController's
      // filter.category, and every in-site link uses ?category=<name>),
      // so category URLs here use the URL-encoded name — a slug would
      // land on an empty listing.
      const categories = await Category.find().select("name").lean();
      for (const c of categories) {
        entries.push({
          loc: `${SITE_URL}/shop?category=${encodeURIComponent(c.name)}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.7",
        });
      }
    } catch {
      /* static-only fallback */
    }
    try {
      // Same visibility rule as the storefront product list.
      const products = await Product.find({ status: { $in: ["Active", "Out of Stock"] } })
        .select("slug updatedAt")
        .lean();
      for (const p of products) {
        entries.push({
          loc: `${SITE_URL}/product/${p.slug}`,
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
    } catch {
      /* static-only fallback */
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(entryXml).join("\n") +
    `\n</urlset>\n`;

  res.set({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=10800",
  });
  res.send(xml);
});

export default router;
