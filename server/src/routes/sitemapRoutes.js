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

// Human-friendly rendering for /sitemap.xml: browsers apply this XSLT
// and show a clean table (like WordPress sitemaps do); search engines
// ignore the stylesheet and read the raw XML as before.
const SITEMAP_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html>
<head>
<title>XML Sitemap — MALAC</title>
<style>
body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f6f6f8; color: #16161a; }
header { background: #0c0c0d; color: #f2f2f3; padding: 28px 24px; }
header h1 { margin: 0; font-size: 24px; letter-spacing: 0.04em; }
header p { margin: 6px 0 0; color: #b9b9c0; font-size: 13px; }
main { max-width: 1080px; margin: 24px auto 48px; padding: 0 16px; }
table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
th { text-align: left; background: #ececf0; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
td { padding: 9px 12px; font-size: 13px; border-top: 1px solid #eee; word-break: break-all; }
tr:nth-child(even) td { background: #fafafc; }
a { color: #7a5c14; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<header>
<h1>MALAC — XML Sitemap</h1>
<p>M.A Luxury Apparel Collection · <xsl:value-of select="count(s:urlset/s:url)"/> URLs</p>
</header>
<main>
<table>
<tr><th>URL</th><th>Last Modified</th><th>Change Frequency</th><th>Priority</th></tr>
<xsl:for-each select="s:urlset/s:url">
<tr>
<td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
<td><xsl:value-of select="s:lastmod"/></td>
<td><xsl:value-of select="s:changefreq"/></td>
<td><xsl:value-of select="s:priority"/></td>
</tr>
</xsl:for-each>
</table>
</main>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
`;

const router = Router();

router.get("/sitemap.xsl", (req, res) => {
  res.set({
    "Content-Type": "text/xsl; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
    // The global API CSP (default-src 'none') would block the browser
    // from applying this stylesheet to /sitemap.xml; allow same-origin
    // styles + the stylesheet's own inline <style> block instead.
    "Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.send(SITEMAP_XSL);
});

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
    { loc: `${SITE_URL}/faq`, lastmod: today, changefreq: "weekly", priority: "0.5" },
    { loc: `${SITE_URL}/blog/online-shopping-in-pakistan-malac`, lastmod: "2026-11-14", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/blog/cash-on-delivery-online-shopping-pakistan`, lastmod: "2026-11-14", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/blog/how-to-choose-a-watch-in-pakistan-malac`, lastmod: "2026-11-17", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/blog/winter-shopping-in-pakistan-malac`, lastmod: "2026-11-15", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/blog/mobile-accessories-buying-guide-pakistan-malac`, lastmod: "2026-11-20", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/blog/how-to-choose-sunglasses-in-pakistan-malac`, lastmod: "2026-11-22", changefreq: "monthly", priority: "0.6" },
    { loc: `${SITE_URL}/terms`, lastmod: today, changefreq: "monthly", priority: "0.3" },
    { loc: `${SITE_URL}/policy`, lastmod: today, changefreq: "monthly", priority: "0.3" },
  ];

  if (await tryDb()) {
    try {
      // Category pages live at /category/<name> in the silver theme
      // (the shop also filters by category NAME), so sitemap category
      // URLs use the URL-encoded name — a slug would land on an empty
      // listing.
      const categories = await Category.find().select("name").lean();
      for (const c of categories) {
        entries.push({
          loc: `${SITE_URL}/category/${encodeURIComponent(c.name)}`,
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
    `<?xml-stylesheet type="text/xsl" href="${SITE_URL}/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(entryXml).join("\n") +
    `\n</urlset>\n`;

  res.set({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=10800",
    "Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.send(xml);
});

export default router;
