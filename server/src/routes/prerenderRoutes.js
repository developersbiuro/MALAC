import { Router } from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { SITE_FAQS, HOME_FAQS, BLOG_SCHEMA } from "../assets/schemaData.js";

// Server-rendered HTML for the public pages Google needs to index
// (/shop, /product/:slug and the static content pages).
//
// Why this exists: the SPA shell (client/index.html) carries ONE
// hard-coded canonical — the homepage — and no page content, so every
// route looked like a duplicate of / to Google. On 2026-11-16 the
// Search Console live test rejected /shop with "Soft 404" for exactly
// that reason. These routes serve the SAME app shell (fetched live from
// the homepage, so the hashed asset URLs are always current) with the
// route's own title / description / canonical / share tags and real
// content inside #root. React replaces #root on mount, so customers
// get the full app exactly as before; crawlers get indexable content.
//
// Mounted OUTSIDE the /api database-readiness gate (like the sitemap):
// a DB failure falls back to the plain shell instead of an error.
const SITE_URL = "https://www.malac.pp.ua";

const router = Router();

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
const priceOf = (p) => (p.salePrice > 0 ? p.salePrice : p.basePrice);

// Structured-data builders (2026-11-24): FAQPage / BreadcrumbList blocks
// served in the initial HTML. The FAQ texts come from
// assets/schemaData.js (generated from the client pages), so the schema
// always matches the words the rendered page shows.
const faqPageLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item,
  })),
});

// Best-effort DB access (same pattern as sitemapRoutes). Never throws.
async function tryDb() {
  if (mongoose.connection.readyState === 1) return true;
  try {
    await connectDB();
  } catch {
    /* fall through — caller serves the plain shell */
  }
  return mongoose.connection.readyState === 1;
}

// ---- App-shell template -------------------------------------------------
// Fetched from the live homepage so the <script>/<link> asset hashes
// always match the current client build. Cached briefly per instance.
let templateCache = { html: null, at: 0 };
const TEMPLATE_TTL_MS = 5 * 60 * 1000;

async function getTemplate() {
  if (templateCache.html && Date.now() - templateCache.at < TEMPLATE_TTL_MS) {
    return templateCache.html;
  }
  // Fetch the RAW shell via a path no server rewrite claims: since the
  // homepage itself is prerendered (2026-11-24), fetching "/" here would
  // return a prerendered page whose #root is already filled — injectRoot
  // would miss and every route would serve homepage content. The client
  // service's catch-all serves the identical built index.html for any
  // unmatched path, so /__app-shell always yields the pristine shell.
  const res = await fetch(`${SITE_URL}/__app-shell`, {
    headers: { "User-Agent": "MALAC-Prerender/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`template fetch ${res.status}`);
  const html = await res.text();
  if (!html.includes('id="root"')) throw new Error("template has no #root");
  if (html.includes("malac-page")) throw new Error("template is a prerendered page, not the raw shell");
  templateCache = { html, at: Date.now() };
  return html;
}

// Minimal document used only if the live template cannot be fetched:
// still carries the route's meta + content so crawlers are served.
function fallbackShell({ title, description, canonical, content, jsonLd }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta name="robots" content="index, follow" />
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
  </head>
  <body>
    <div id="root">${content}</div>
  </body>
</html>`;
}

// ---- Head transforms (regexes match the built index.html shape) --------
function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
}
function setMetaName(html, name, content) {
  const re = new RegExp(`(<meta[^>]*name="${name}"[^>]*content=")[^"]*(")`);
  return html.replace(re, `$1${esc(content)}$2`);
}
function setMetaProp(html, prop, content) {
  const re = new RegExp(`(<meta[^>]*property="${prop}"[^>]*content=")[^"]*(")`);
  return html.replace(re, `$1${esc(content)}$2`);
}
function setCanonical(html, url) {
  return html.replace(
    /(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/,
    `$1${esc(url)}$2`
  );
}
function injectJsonLd(html, jsonLd) {
  if (!jsonLd) return html;
  const tag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  return html.replace("</head>", `${tag}\n  </head>`);
}
function injectRoot(html, content) {
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}

// The crawler content below is ALSO what a human on a very slow
// connection sees for the first seconds, before the app bundle arrives
// and React takes over #root (Abdullah, 2026-11-17: on ~5 KB/s mobile
// data the raw unstyled text looked like a broken site). This small
// inline style — scoped entirely to .pr-fallback, which React replaces
// wholesale on boot — makes that first paint a clean branded page
// instead. The content itself stays fully visible (no cloaking).
const FALLBACK_STYLE = `<style>
body{margin:0}
.pr-fallback{background:#0b0b0d;color:#e8e8ea;min-height:100vh;padding:22px 16px 44px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.55}
.pr-fallback .pr-brand{font-family:Georgia,"Times New Roman",serif;font-size:22px;font-weight:700;letter-spacing:.38em;margin:0 0 2px;color:#fff}
.pr-fallback .pr-note{color:#9a9aa0;font-size:13px;margin:0 0 20px}
.pr-fallback h1{font-family:Georgia,"Times New Roman",serif;font-size:27px;line-height:1.2;margin:10px 0}
.pr-fallback h2{font-size:20px;margin:22px 0 8px}
.pr-fallback h3{font-size:16px;margin:6px 0 2px}
.pr-fallback p{margin:4px 0;color:#c9c9ce}
.pr-fallback a{color:#f0f0f2;text-decoration:none}
.pr-fallback img{max-width:100%;height:auto;border-radius:10px;background:#1a1a1e}
.pr-fallback article{margin:0 0 20px}
.pr-fallback ul{padding-left:18px}
.pr-fallback li{margin:4px 0}
</style>`;
// Crawlable site-wide link block appended to every prerendered page
// (2026-11-22). GSC showed /shop as "Crawled - currently not indexed"
// with "Referring page: None detected": each prerendered page linked
// only to its own products, so Google found no internal path of any
// weight into /shop or between pages. This nav gives every crawled
// page (shop, categories, all product pages, blog, static pages) a
// full internal link graph. The React app replaces this fallback on
// load, so shoppers never see it.
const SITE_NAV = `<nav aria-label="Site"><h2>Explore MALAC</h2><ul><li><a href="/">Home</a></li><li><a href="/shop">Shop All Products</a></li><li><a href="/category/Men's%20Fashion">Men's Fashion</a></li><li><a href="/category/Women's%20Fashion">Women's Fashion</a></li><li><a href="/category/Watches">Watches</a></li><li><a href="/category/Eyewear">Eyewear</a></li><li><a href="/category/Bags%20%26%20Accessories">Bags &amp; Accessories</a></li><li><a href="/category/Mobile%20Accessories">Mobile Accessories</a></li><li><a href="/blog">MALAC Blog</a></li><li><a href="/about">About MALAC</a></li><li><a href="/faq">FAQs</a></li><li><a href="/terms">Terms of Service</a></li><li><a href="/policy">Privacy &amp; Return Policy</a></li></ul></nav>`;

function wrapFallback(content) {
  // The version marker matters beyond tidiness: browsers that cached a
  // pre-CSP-fix copy of these pages keep revalidating against the old
  // ETag and getting 304s (the body was identical, only the CSP header
  // changed), which strands them on the blocked raw page indefinitely
  // (Abdullah's phone, 2026-11-17). Any body change mints a fresh ETag
  // and forces a full 200 with the fixed headers — bump this marker
  // whenever a header-only fix must reach cached clients.
  return `<!-- malac-page v3 -->\n${FALLBACK_STYLE}<div class="pr-fallback"><p class="pr-brand">MALAC</p><p class="pr-note">Loading the full store — one moment…</p>${content}${SITE_NAV}</div>`;
}

function renderPage(res, page) {
  const { title, description, canonical, image, jsonLd } = page;
  const content = wrapFallback(page.content);
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  // These routes serve full HTML documents that must load the app's own
  // JS/CSS/images — the global API security header (default-src 'none',
  // meant for JSON/XML) blocks ALL of that, leaving visitors stuck on
  // the raw fallback forever (Abdullah + fresh-browser repro,
  // 2026-11-17). Page responses carry the same policy as the static
  // homepage instead.
  res.set("Content-Security-Policy", "frame-ancestors 'none'");
  getTemplate()
    .then((tpl) => {
      let html = tpl;
      html = setTitle(html, title);
      html = setMetaName(html, "description", description);
      html = setCanonical(html, canonical);
      html = setMetaProp(html, "og:title", title);
      html = setMetaProp(html, "og:description", description);
      html = setMetaProp(html, "og:url", canonical);
      if (image) {
        html = setMetaProp(html, "og:image", image);
        html = setMetaName(html, "twitter:image", image);
      }
      html = setMetaName(html, "twitter:title", title);
      html = setMetaName(html, "twitter:description", description);
      html = injectJsonLd(html, jsonLd);
      if (page.extraHead) html = html.replace("</head>", `${page.extraHead}\n  </head>`);
      html = injectRoot(html, content);
      res.type("html").send(html);
    })
    .catch(() => {
      res.type("html").send(fallbackShell({ ...page, content }));
    });
}

// ---- / (homepage) ----------------------------------------------------------
// Added 2026-11-24 for LCP: the homepage was the last major public page
// still shipping an empty shell, so nothing painted until the React
// bundle ran (~2s of element render delay in PageSpeed). Sections and
// order mirror Home.jsx exactly (Hero → Invite → Flash Sale → Category
// → Featured → New Arrivals → About → FAQ); React replaces #root on
// mount as on every other prerendered page. The Flash Sale countdown
// is deliberately NOT rendered here — it ticks live, so any baked-in
// remaining time would be wrong within a minute; the section carries
// static wording instead and React takes over on mount.
router.get("/", async (req, res) => {
  const title = "MALAC — Online Shopping in Pakistan | M.A Luxury Apparel Collection";
  const description =
    "MALAC — M.A Luxury Apparel Collection. Premium men's and women's fashion, watches, eyewear, bags & accessories and mobile accessories online in Pakistan, with Cash on Delivery and free shipping on orders over Rs. 3,000.";
  let categories = [];
  let flash = [];
  let newest = [];
  if (await tryDb()) {
    try {
      categories = await Category.find({}).select("name").lean();
      flash = await Product.find({ status: "Active", flashSale: true })
        .select("title slug category basePrice salePrice images")
        .limit(7)
        .lean();
      newest = await Product.find({ status: { $in: ["Active", "Out of Stock"] } })
        .select("title slug category basePrice salePrice images")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch {
      /* serve the shell with whatever was fetched */
    }
  }
  const card = (p) => {
    const price = priceOf(p);
    const img = p.images?.[0]
      ? `<img referrerpolicy="no-referrer" src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" />`
      : "";
    const was =
      p.salePrice > 0 && p.basePrice > p.salePrice
        ? ` <s>${rs(p.basePrice)}</s>`
        : "";
    return `<article><a href="/product/${esc(p.slug)}">${img}<h3>${esc(p.title)}</h3></a><p>${esc(p.category)}</p><p><strong>${rs(price)}</strong>${was}</p></article>`;
  };
  const CAT_ORDER = ["Men's Fashion", "Women's Fashion", "Watches", "Eyewear", "Bags & Accessories", "Mobile Accessories"];
  const known = new Set(categories.map((c) => c.name));
  const catNames = CAT_ORDER.filter((n) => known.has(n));
  for (const c of categories) if (!catNames.includes(c.name)) catNames.push(c.name);
  const catLinks = (catNames.length ? catNames : CAT_ORDER)
    .map((n) => `<li><a href="/category/${encodeURIComponent(n)}">${esc(n)}</a></li>`)
    .join("");
  const TILES = [
    { img: "/design-img/p-polo.jpg", label: "MALAC Premium Polo", href: "/category/Men's%20Fashion" },
    { img: "/design-img/p-hoodie.jpg", label: "MALAC Hoodie", href: "/category/Men's%20Fashion" },
    { img: "/design-img/p-watch.jpg", label: "MALAC Signature Watch", href: "/category/Watches" },
    { img: "/design-img/p-cap.jpg", label: "MALAC Cap", href: "/category/Men's%20Fashion" },
    { img: "/design-img/p-sunglasses.jpg", label: "MALAC Sunglasses", href: "/category/Eyewear" },
    { img: "/design-img/p-wallet.jpg", label: "MALAC Wallet", href: "/category/Bags%20%26%20Accessories" },
  ];
  const tiles = TILES.map(
    (t) => `<article><a href="${t.href}"><img src="${t.img}" alt="${esc(t.label)}" loading="lazy" /><h3>${esc(t.label)}</h3></a></article>`
  ).join("\n");
  const content = `<main>
<section>
<p>Premium Lifestyle Store</p>
<h1>MORE THAN STYLE. IT'S YOUR IDENTITY.</h1>
<p>Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.</p>
<picture><source media="(max-width: 639px)" srcset="/design-img/hero-main-mobile.jpg" /><img src="/design-img/hero-main.jpg" alt="MALAC — M.A Luxury Apparel Collection" /></picture>
<p><a href="/shop">Explore Collection</a></p>
</section>
<section>
<h2>Doston ko bulayein, Rs. 400 tak payein!</h2>
<p>Invite your friends to MALAC: they get free shipping on their first order, and you earn coupons worth up to Rs. 400 when they join and place their first order.</p>
<p><a href="/signup">Join MALAC &amp; Invite Friends</a></p>
</section>
<section>
<h2>Flash Sale</h2>
<p>Limited-time deals across the store — shop before they are gone.</p>
${flash.map(card).join("\n")}
</section>
<nav aria-label="Categories"><h2>Shop by Category</h2><ul>${catLinks}</ul></nav>
<section><h2>Featured Collections</h2>
${tiles}
</section>
<section><h2>New Arrivals</h2>
${newest.map(card).join("\n")}
</section>
<section>
<h2>More Than a Brand, It's a Lifestyle.</h2>
<img src="/design-img/about-store.jpg" alt="Inside a MALAC store" loading="lazy" />
<p>MALAC is a premium lifestyle brand, offering high-quality fashion, watches and accessories for those who value elegance and individuality.</p>
<ul><li>Premium Quality</li><li>Authentic Products</li><li>Reliable Delivery</li><li>Dedicated Support</li></ul>
<p><a href="/about">Know More</a></p>
</section>
<section>
<h2>Frequently Asked Questions</h2>
<article><h3>How do I place an order on MALAC?</h3><p>Create a MALAC account or sign in — an account is required to place an order. Add the items you like to your cart, go to checkout, confirm your delivery address and payment method, and place your order. Every order is reviewed and confirmed by our team before it is packed and dispatched.</p></article>
<article><h3>How do I pay with JazzCash or Easypaisa?</h3><p>At checkout, choose JazzCash or Easypaisa and transfer the order total to account title Muhammad Abdullah, number 0303 6253428 — or choose Meezan Bank, NayaPay, SadaPay or FirstPay — HBL Microfinance Bank. Then upload your payment screenshot and transaction details with your order. Cash on Delivery is also available — pay in cash when your order arrives.</p></article>
<article><h3>When is shipping free?</h3><p>Standard shipping is free on orders over Rs. 3,000. On smaller orders, standard delivery is Rs. 249 on most orders. Express delivery is available at checkout for Rs. 399 where offered. We deliver nationwide across Pakistan through courier partners including TCS, Leopards and Trax.</p></article>
<article><h3>How can I track my order?</h3><p>Use the Track Your Order page with your order ID and the phone number from your order, or sign in and open My Orders to follow your order's status at any time.</p></article>
<article><h3>What is MALAC's return and exchange policy?</h3><p>If you receive a damaged, defective or incorrect item, contact us within 7 days of delivery on WhatsApp (+92 3236016684) or by email (info@malac.pp.ua) with your order number. After we inspect the returned item, we will arrange a replacement or a refund. Items must be unused and in their original packaging.</p></article>
<article><h3>How do I contact MALAC?</h3><p>Message us on WhatsApp at +92 3236016684 or email us at info@malac.pp.ua — for order help, payment questions, or anything about your account.</p></article>
</section>
</main>`;
  // FAQPage schema in the server HTML (2026-11-24), built from the SAME
  // six Q&As this page renders (schemaData.js, generated from Home.jsx).
  // Home.jsx no longer injects it client-side, so the rendered page
  // carries exactly one copy.
  const jsonLd = faqPageLd(HOME_FAQS);
  // Static hero preloads in the initial document (the parser sees them
  // immediately — the old JS-injected preload fired too late and
  // PageSpeed measured ~1s of LCP resource load delay on desktop).
  const extraHead = `<link rel="preload" as="image" fetchpriority="high" media="(max-width: 639px)" href="/design-img/hero-main-mobile.jpg" />\n    <link rel="preload" as="image" fetchpriority="high" media="(min-width: 640px)" href="/design-img/hero-main.jpg" />`;
  renderPage(res, { title, description, canonical: `${SITE_URL}/`, content, jsonLd, extraHead });
});

// ---- /shop ---------------------------------------------------------------
router.get("/shop", async (req, res) => {
  const title = "Shop All Products — MALAC | Online Shopping in Pakistan";
  const description =
    "Shop online in Pakistan at MALAC — men's fashion, women's fashion, watches, eyewear, bags & accessories and mobile accessories, with Cash on Delivery and free shipping on orders over Rs. 3,000.";
  let categories = [];
  let products = [];
  if (await tryDb()) {
    try {
      categories = await Category.find({}).select("name").lean();
      products = await Product.find({ status: { $in: ["Active", "Out of Stock"] } })
        .select("title slug category basePrice salePrice images ratingAvg ratingCount")
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
    } catch {
      /* serve the shell with whatever was fetched */
    }
  }
  const catLinks = categories
    .map(
      (c) =>
        `<li><a href="/category/${encodeURIComponent(c.name)}">${esc(c.name)}</a></li>`
    )
    .join("");
  const cards = products
    .map((p) => {
      const price = priceOf(p);
      const img = p.images?.[0]
        ? `<img referrerpolicy="no-referrer" src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" />`
        : "";
      const was =
        p.salePrice > 0 && p.basePrice > p.salePrice
          ? ` <s>${rs(p.basePrice)}</s>`
          : "";
      return `<article><a href="/product/${esc(p.slug)}">${img}<h3>${esc(p.title)}</h3></a><p>${esc(p.category)}</p><p><strong>${rs(price)}</strong>${was}</p></article>`;
    })
    .join("\n");
  const content = `<main>
<h1>Shop All Products at MALAC</h1>
<p>MALAC — M.A Luxury Apparel Collection — is an online shopping store in Pakistan. Shop men's fashion, women's fashion, watches, eyewear, bags &amp; accessories and mobile accessories, with Cash on Delivery, JazzCash, Easypaisa and bank transfer, and free standard shipping on orders over Rs. 3,000 (standard delivery Rs. 249, 2–5 working days, nationwide).</p>
<nav aria-label="Categories"><h2>Categories</h2><ul>${catLinks}</ul></nav>
<section><h2>Products</h2>
${cards}
</section>
</main>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${SITE_URL}/shop`,
  };
  renderPage(res, {
    title,
    description,
    canonical: `${SITE_URL}/shop`,
    content,
    jsonLd,
  });
});

// ---- /category/:name -------------------------------------------------------
// Silver theme (2026-11-17): every category has its own page in the SPA,
// so crawlers get a matching server-rendered page here too. Unknown
// category names go to /shop instead of a soft-404 shell.
//
// Keyword targeting (2026-11-22, from live Pakistan SERPs): Pakistani
// shoppers search price-first — "watches price in Pakistan",
// "sunglasses price in Pakistan", "mobile accessories price in
// Pakistan", "ladies handbags price in Pakistan" — and the pages that
// rank lead with exactly those phrases in title + H1. Each category
// below is mapped to its strongest searched phrase; {min}/{max} are
// filled with the category's real live price range.
const CATEGORY_SEO = {
  Watches: {
    title: "Watches Price in Pakistan — Buy Watches Online | MALAC",
    h1: "Watches Price in Pakistan",
    description:
      "Watches price in Pakistan at MALAC: men's watches, women's watches and couple watches with Cash on Delivery and free shipping on orders over Rs. 3,000.",
    intro:
      "Buy watches online in Pakistan at MALAC — men's watches, women's watches and couple watches from {min} to {max}, with Cash on Delivery and delivery in 2–5 working days (standard Rs. 249, free over Rs. 3,000). Whether you want an everyday watch or one for gifting, compare straps, dials and prices below.",
  },
  Eyewear: {
    title: "Sunglasses Price in Pakistan — Buy Sunglasses Online | MALAC",
    h1: "Sunglasses Price in Pakistan",
    description:
      "Sunglasses price in Pakistan at MALAC: sunglasses for men, women and kids with UV protection and Cash on Delivery, from the store's live range.",
    intro:
      "Buy sunglasses online in Pakistan at MALAC — sunglasses for men, women and kids from {min} to {max}, with Cash on Delivery (standard delivery Rs. 249, free over Rs. 3,000). Most styles are imported and take 10–15 working days. Pick by face shape and lens below.",
  },
  "Mobile Accessories": {
    title: "Mobile Accessories Price in Pakistan — Shop Online | MALAC",
    h1: "Mobile Accessories Price in Pakistan",
    description:
      "Mobile accessories price in Pakistan at MALAC: chargers, cables, earbuds, power banks, covers and stands with Cash on Delivery.",
    intro:
      "Shop mobile accessories in Pakistan at MALAC — fast chargers, charging cables, earbuds, power banks, covers and stands from {min} to {max}, with Cash on Delivery and delivery in 2–5 working days (free over Rs. 3,000).",
  },
  "Bags & Accessories": {
    title: "Ladies Handbags Price in Pakistan — Buy Bags Online | MALAC",
    h1: "Ladies Handbags & Bags Price in Pakistan",
    description:
      "Ladies handbags price in Pakistan at MALAC: handbags, wallets and bags for women with Cash on Delivery and free shipping on orders over Rs. 3,000.",
    intro:
      "Buy ladies handbags, wallets and bags online in Pakistan at MALAC — handbags for women from {min} to {max}, with Cash on Delivery and delivery in 2–5 working days (standard Rs. 249, free over Rs. 3,000).",
  },
  "Men's Fashion": {
    title: "Men's Fashion Online in Pakistan — Hoodies, Jackets & Polos | MALAC",
    h1: "Men's Fashion Online in Pakistan",
    description:
      "Men's fashion online in Pakistan at MALAC: hoodies, jackets, polos and sweatshirts with Cash on Delivery and free shipping on orders over Rs. 3,000.",
    intro:
      "Shop men's fashion online in Pakistan at MALAC — hoodies, jackets, polos and sweatshirts from {min} to {max}, with Cash on Delivery and delivery in 2–5 working days (standard Rs. 249, free over Rs. 3,000).",
  },
  "Women's Fashion": {
    title: "Women's Fashion Online in Pakistan — Lawn Suits & More | MALAC",
    h1: "Women's Fashion Online in Pakistan",
    description:
      "Women's fashion online in Pakistan at MALAC: lawn suits and everyday wear with Cash on Delivery and free shipping on orders over Rs. 3,000.",
    intro:
      "Shop women's fashion online in Pakistan at MALAC — lawn suits and everyday wear from {min} to {max}, with Cash on Delivery and delivery in 2–5 working days (standard Rs. 249, free over Rs. 3,000).",
  },
};
// Price-band sections: Pakistani shoppers search "under Rs. X" phrases
// heavily ("watches under 5000", "earbuds under 3000", "handbags under
// 3000"). Each category page gets crawlable sections whose headings are
// those exact phrases, listing the REAL products in each price band
// (bands partition the range, cheapest first). Thresholds were chosen
// from the live catalogue so every section has real products in it.
const PRICE_BANDS = {
  Watches: [
    { max: 2000, heading: "Watches Under Rs. 2,000 in Pakistan" },
    { max: 5000, heading: "Best Watches Under Rs. 5,000 in Pakistan" },
  ],
  Eyewear: [
    { max: 2000, heading: "Sunglasses Under Rs. 2,000 in Pakistan" },
  ],
  "Mobile Accessories": [
    { max: 1000, heading: "Mobile Accessories Under Rs. 1,000 in Pakistan" },
    { max: 3000, heading: "Best Mobile Accessories Under Rs. 3,000 in Pakistan" },
  ],
  "Bags & Accessories": [
    { max: 1500, heading: "Bags & Handbags Under Rs. 1,500 in Pakistan" },
    { max: 3000, heading: "Ladies Handbags Under Rs. 3,000 in Pakistan" },
  ],
  "Men's Fashion": [
    { max: 2500, heading: "Men's Fashion Under Rs. 2,500 in Pakistan" },
    { max: 5000, heading: "Men's Clothing Under Rs. 5,000 in Pakistan" },
  ],
  "Women's Fashion": [
    { max: 2000, heading: "Women's Fashion Under Rs. 2,000 in Pakistan" },
    { max: 3500, heading: "Ladies Fashion Under Rs. 3,500 in Pakistan" },
  ],
};
// Sub-category sections: shoppers also search by type ("earbuds price in
// Pakistan", "sunglasses for men", "power bank price in Pakistan").
// Headings map "Category|SubCategory" -> the searched phrase; a group
// renders only with >= 3 real products. Keys must match the live
// subCategory values in the catalogue.
const SUB_HEADINGS = {
  "Watches|Men": "Men's Watches Price in Pakistan",
  "Watches|Women": "Women's Watches Price in Pakistan",
  "Watches|Unisex": "Unisex Watches in Pakistan",
  "Eyewear|Men": "Sunglasses for Men in Pakistan",
  "Eyewear|Women": "Women's Sunglasses Price in Pakistan",
  "Eyewear|Unisex": "Unisex Sunglasses in Pakistan",
  "Mobile Accessories|Audio": "Wireless Earbuds & Audio Price in Pakistan",
  "Mobile Accessories|Chargers & Cables": "Mobile Chargers & Cables Price in Pakistan",
  "Bags & Accessories|Bags": "Handbags for Women in Pakistan",
  "Bags & Accessories|Wallets": "Wallets Price in Pakistan",
  "Men's Fashion|Clothing": "Men's Clothing Online in Pakistan",
  "Men's Fashion|Winter Collection": "Men's Winter Collection in Pakistan — Jackets & Hoodies",
  "Women's Fashion|Clothing": "Women's Clothing Online in Pakistan",
  "Women's Fashion|Shoes": "Women's Shoes Price in Pakistan",
};
router.get("/category/:name", async (req, res) => {
  let category = null;
  let products = [];
  if (await tryDb()) {
    try {
      category = await Category.findOne({ name: req.params.name }).select("name").lean();
      if (category) {
        products = await Product.find({
          category: category.name,
          status: { $in: ["Active", "Out of Stock"] },
        })
          .select("title slug category subCategory basePrice salePrice images ratingAvg ratingCount")
          .sort({ createdAt: -1 })
          .limit(60)
          .lean();
      }
    } catch {
      /* fall through — redirect below */
    }
  }
  if (!category) return res.redirect(302, "/shop");
  const url = `${SITE_URL}/category/${encodeURIComponent(category.name)}`;
  const seo = CATEGORY_SEO[category.name];
  const prices = products.map((p) => priceOf(p)).filter((n) => n > 0);
  const range = {
    min: prices.length ? rs(Math.min(...prices)) : "",
    max: prices.length ? rs(Math.max(...prices)) : "",
  };
  const fillRange = (text) =>
    text.replace("{min}", range.min).replace("{max}", range.max);
  const title = seo
    ? seo.title
    : `${category.name} — Buy Online in Pakistan | MALAC`;
  const description = seo
    ? seo.description
    : `Shop ${category.name} online in Pakistan at MALAC — Cash on Delivery and nationwide delivery in 2–5 working days (standard Rs. 249, free on orders over Rs. 3,000).`;
  const cards = products
    .map((p) => {
      const price = priceOf(p);
      const img = p.images?.[0]
        ? `<img referrerpolicy="no-referrer" src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" />`
        : "";
      const was =
        p.salePrice > 0 && p.basePrice > p.salePrice
          ? ` <s>${rs(p.basePrice)}</s>`
          : "";
      return `<article><a href="/product/${esc(p.slug)}">${img}<h3>${esc(p.title)}</h3></a><p>${esc(p.category)}</p><p><strong>${rs(price)}</strong>${was}</p></article>`;
    })
    .join("\n");
  // Price-band sections (see PRICE_BANDS): partition the category's real
  // products by price so each "under Rs. X" heading lists only products
  // actually in that band.
  const bandSections = (() => {
    const bands = PRICE_BANDS[category.name];
    if (!bands || !products.length) return "";
    const sorted = [...products]
      .map((p) => ({ p, price: priceOf(p) }))
      .filter((x) => x.price > 0)
      .sort((a, b) => a.price - b.price);
    let prevMax = 0;
    return bands
      .map((band) => {
        const items = sorted.filter(
          (x) => x.price > prevMax && x.price <= band.max
        );
        prevMax = band.max;
        if (items.length < 3) return "";
        const lis = items
          .map(
            (x) =>
              `<li><a href="/product/${esc(x.p.slug)}">${esc(x.p.title)}</a> — ${rs(x.price)}</li>`
          )
          .join("\n");
        return `<section><h2>${esc(band.heading)}</h2>
<p>${items.length} picks at MALAC priced under ${rs(band.max)}, with Cash on Delivery available all over Pakistan.</p>
<ul>
${lis}
</ul>
</section>`;
      })
      .join("\n");
  })();
  // Sub-category sections (see SUB_HEADINGS): group the category's real
  // products by subCategory so type searches ("earbuds price in
  // Pakistan", "sunglasses for men") land on a matching section.
  const subSections = (() => {
    const groups = new Map();
    for (const p of products) {
      const key = `${category.name}|${p.subCategory || ""}`;
      if (!SUB_HEADINGS[key]) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    return [...groups.entries()]
      .filter(([, items]) => items.length >= 3)
      .map(([key, items]) => {
        const lis = items
          .map(
            (p) =>
              `<li><a href="/product/${esc(p.slug)}">${esc(p.title)}</a> — ${rs(priceOf(p))}</li>`
          )
          .join("\n");
        return `<section><h2>${esc(SUB_HEADINGS[key])}</h2>
<ul>
${lis}
</ul>
</section>`;
      })
      .join("\n");
  })();
  const content = `<main>
<nav><a href="/shop">Shop</a> &rsaquo; ${esc(category.name)}</nav>
<h1>${esc(seo ? seo.h1 : category.name)}</h1>
<p>${seo ? esc(fillRange(seo.intro)) : `Shop ${esc(category.name)} at MALAC — M.A Luxury Apparel Collection — with Cash on Delivery and nationwide delivery in 2–5 working days (standard delivery Rs. 249, free on orders over Rs. 3,000).`}</p>
<section><h2>Products</h2>
${cards}
</section>
${bandSections}
${subSections}
</main>`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url,
    },
    breadcrumbLd([
      ["Home", `${SITE_URL}/`],
      ["Shop", `${SITE_URL}/shop`],
      [category.name, url],
    ]),
  ];
  renderPage(res, { title, description, canonical: url, content, jsonLd });
});

// ---- /product/:slug -------------------------------------------------------
router.get("/product/:slug", async (req, res) => {
  let product = null;
  if (await tryDb()) {
    try {
      product = await Product.findOne({
        slug: req.params.slug,
        status: { $in: ["Active", "Out of Stock"] },
      }).lean();
    } catch {
      /* fall through — plain shell below */
    }
  }
  if (!product) {
    // Unknown or non-public product: serve the untouched shell so the
    // SPA shows its own not-found state, exactly as before.
    try {
      const tpl = await getTemplate();
      res.type("html").send(tpl);
    } catch {
      res.status(404).type("html").send("<!doctype html><title>MALAC</title>");
    }
    return;
  }
  const price = priceOf(product);
  const url = `${SITE_URL}/product/${product.slug}`;
  const title = `${product.title} — Buy Online in Pakistan | MALAC`;
  const rawDesc = (product.description || "").replace(/\s+/g, " ").trim();
  const description = (
    rawDesc ||
    `Buy ${product.title} online in Pakistan at MALAC for ${rs(price)} — Cash on Delivery and nationwide delivery.`
  ).slice(0, 300);
  const img = product.images?.[0] || "";
  const gallery = (product.images || [])
    .map((src) => `<img referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(product.title)}" loading="lazy" />`)
    .join("");
  const was =
    product.salePrice > 0 && product.basePrice > product.salePrice
      ? ` <s>${rs(product.basePrice)}</s>`
      : "";
  const rating =
    product.ratingCount > 0
      ? `<p>Rated ${Number(product.ratingAvg).toFixed(1)} / 5 by ${product.ratingCount} customer(s).</p>`
      : "";
  const content = `<main>
<nav><a href="/shop">Shop</a> &rsaquo; <a href="/category/${encodeURIComponent(product.category)}">${esc(product.category)}</a></nav>
<h1>${esc(product.title)}</h1>
${gallery}
<p><strong>${rs(price)}</strong>${was} — ${esc(product.unitQty || 1)} ${esc(product.unit || "Pc")}</p>
${rating}
<p>${product.stock > 0 ? "In stock" : "Out of stock"} · Cash on Delivery available · Delivery across Pakistan in 2–5 working days (standard Rs. 249, free on orders over Rs. 3,000).</p>
${rawDesc ? `<section><h2>Product details</h2><p>${esc(rawDesc)}</p></section>` : ""}
<p><a href="/shop">Continue shopping at MALAC</a></p>
</main>`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description,
      // Absolute URLs only — Google rejects relative image paths in
      // Product schema (the design products use /design-img/ paths).
      image: (product.images || []).map((src) =>
        src.startsWith("/") ? `${SITE_URL}${src}` : src
      ),
      sku: product.sku,
      category: product.category,
      brand: { "@type": "Brand", name: "MALAC" },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "PKR",
        price: price,
        availability:
          product.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
      ...(product.ratingCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(product.ratingAvg).toFixed(1),
              reviewCount: product.ratingCount,
            },
          }
        : {}),
    },
    breadcrumbLd([
      ["Home", `${SITE_URL}/`],
      ["Shop", `${SITE_URL}/shop`],
      [
        product.category,
        `${SITE_URL}/category/${encodeURIComponent(product.category)}`,
      ],
      [product.title, url],
    ]),
  ];
  renderPage(res, {
    title,
    description,
    canonical: url,
    image: img || undefined,
    content,
    jsonLd,
  });
});

// ---- Static content pages -------------------------------------------------
const STATIC_PAGES = {
  "/about": {
    title: "About MALAC — M.A Luxury Apparel Collection | Online Shopping in Pakistan",
    description:
      "MALAC is M.A Luxury Apparel Collection, an online shopping store based in Faisalabad, Pakistan — men's fashion, women's fashion, watches, eyewear, bags & accessories and mobile accessories with Cash on Delivery nationwide.",
    heading: "About MALAC",
    body: `<p>MALAC — short for M.A Luxury Apparel Collection (M.A are the initials of the founder, Muhammad Abdullah) — is an online shopping store in Pakistan, based in Faisalabad, Punjab. The catalogue covers men's fashion, women's fashion, watches, eyewear, bags &amp; accessories and mobile accessories.</p><p>Customers pay by Cash on Delivery, JazzCash, Easypaisa, Meezan Bank, NayaPay, SadaPay or FirstPay — HBL Microfinance Bank. Standard delivery is Rs. 249 and free on orders over Rs. 3,000; express delivery is Rs. 399. Orders are delivered nationwide in 2–5 working days through courier partners including TCS, Leopards, Trax and PostEx.</p><p>Support: WhatsApp +92 323 6016684 · Email info@malac.pp.ua</p>`,
  },
  "/faq": {
    title: "FAQs — MALAC | Online Shopping in Pakistan",
    description:
      "Answers about MALAC: how to order, Cash on Delivery, JazzCash and Easypaisa payments, delivery charges and times, order tracking, returns and the MALAC app.",
    heading: "Frequently Asked Questions",
    body: `<p><strong>How do I place an order?</strong> Create a MALAC account or sign in, add items to your cart, confirm your delivery address and payment method at checkout, and place your order.</p><p><strong>Is Cash on Delivery available?</strong> Yes — pay in cash when your order arrives. JazzCash, Easypaisa, Meezan Bank, NayaPay, SadaPay and FirstPay transfers are also accepted.</p><p><strong>When is shipping free?</strong> Standard shipping is free on orders over Rs. 3,000; below that it is Rs. 249. Express delivery is Rs. 399. Delivery takes 2–5 working days, nationwide.</p><p><strong>How do I track my order?</strong> Use the Track Order page with your order ID or the phone number from your order.</p><p><strong>What is the return policy?</strong> Damaged, defective or incorrect items can be reported within 7 days of delivery for a replacement or refund after inspection; change-of-mind returns are not accepted.</p>`,
  },
  "/blog": {
    title: "MALAC Blog — Online Shopping Guides for Pakistan",
    description:
      "Guides and tips from MALAC: online shopping in Pakistan, Cash on Delivery explained, and how to shop safely and save.",
    heading: "MALAC Blog",
    body: `<ul><li><a href="/blog/how-to-choose-sunglasses-in-pakistan-malac">How to Choose Sunglasses in Pakistan: UV Protection, Polarized Lenses and the Right Frame for Your Face</a></li><li><a href="/blog/mobile-accessories-buying-guide-pakistan-malac">Mobile Accessories in Pakistan: What to Buy, What to Skip, and How Not to Waste Money</a></li><li><a href="/blog/how-to-choose-a-watch-in-pakistan-malac">Best Watches in Pakistan: How to Choose the Right Watch for Men and Women</a></li><li><a href="/blog/winter-shopping-in-pakistan-malac">Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It</a></li><li><a href="/blog/online-shopping-in-pakistan-malac">Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust</a></li><li><a href="/blog/cash-on-delivery-online-shopping-pakistan">Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands</a></li></ul>`,
  },
  "/blog/how-to-choose-sunglasses-in-pakistan-malac": {
    title: "How to Choose Sunglasses in Pakistan: UV Protection, Polarized Lenses and the Right Frame for Your Face — MALAC Blog",
    description:
      "Sunglasses in Pakistan are not just a style choice — the lens matters more than the frame. How to pick UV protection, polarized lenses and a shape that suits your face, with all fifteen sunglasses MALAC sells, from Rs 1,200.",
    heading: "How to Choose Sunglasses in Pakistan: UV Protection, Polarized Lenses and the Right Frame for Your Face",
    body: `<p>In Pakistan's sun, a dark lens without UV protection can do more harm than good — buy the lens first and the frame second. This guide covers UV protection, when polarized lenses are worth it, and which frame shape suits your face, across MALAC's fifteen sunglasses from Rs 1,200 to Rs 8,500, all with Cash on Delivery (free delivery over Rs 3,000; most pairs are imported and take 10–15 working days). Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/category/Eyewear">Shop Eyewear at MALAC</a></p>`,
  },
  "/blog/mobile-accessories-buying-guide-pakistan-malac": {
    title: "Mobile Accessories in Pakistan: What to Buy, What to Skip, and How Not to Waste Money — MALAC Blog",
    description:
      "How to pick a charger, earbuds, a power bank and the small extras from the mobile accessories in Pakistan that MALAC sells — live prices from Rs 550, the honest notes on imported items, and Cash on Delivery across Pakistan.",
    heading: "Mobile Accessories in Pakistan: What to Buy, What to Skip, and How Not to Waste Money",
    body: `<p>A phone is only as good as the things around it. Start with a proper adapter, then one good cable instead of three weak ones, earbuds you will actually wear every day, and a power bank sized for your real day. MALAC's fifteen mobile accessories run from Rs 550 to Rs 3,999, all with Cash on Delivery and standard delivery in 2–5 working days (free over Rs 3,000; three imported items take 10–15 working days). Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/category/Mobile Accessories">Shop Mobile Accessories at MALAC</a></p>`,
  },
  "/blog/how-to-choose-a-watch-in-pakistan-malac": {
    title: "Best Watches in Pakistan: How to Choose the Right Watch for Men and Women — MALAC Blog",
    description:
      "Looking for the best watches in Pakistan? A simple guide to straps, dials, analog vs smart watches and what a good watch should cost — plus men's, women's and couple watches on MALAC from Rs 1,050, with Cash on Delivery across Pakistan.",
    heading: "Best Watches in Pakistan: How to Choose the Right Watch for Men and Women",
    body: `<p>A watch is the one accessory almost everyone wears every day, and one of the hardest things to buy online. Start with the strap — leather for formal, steel for daily, silicone for smart watches — then the dial size, then decide analog or smart. MALAC's watch range runs from Rs 1,050 to the MALAC Signature Watch at Rs 24,999, all with Cash on Delivery and delivery in 2–5 working days (free over Rs 3,000). Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/category/Watches">Shop Watches at MALAC</a></p>`,
  },
  "/blog/winter-shopping-in-pakistan-malac": {
    title: "Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It — MALAC Blog",
    description:
      "A practical guide to winter shopping in Pakistan: start with the everyday fleece layer, add one piece for real cold, and do not forget thermals, gloves and the children — with MALAC's eight winter pieces and Cash on Delivery.",
    heading: "Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It",
    body: `<p>Winter in Pakistan never arrives all at once — a cold morning in Faisalabad, a freezing night in the north, a mild evening in Karachi. Start with the layer you will wear every day (a fleece tracksuit or zipper hoodie), then add one piece for real cold (a hooded puffer jacket), and do not skip the quiet heroes: thermal sets and leather gloves. MALAC's winter range has eight pieces, all with Cash on Delivery and standard delivery in 2–5 working days (Rs. 249, free over Rs. 3,000). Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/shop">Shop at MALAC</a></p>`,
  },
  "/blog/online-shopping-in-pakistan-malac": {
    title: "Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust — MALAC Blog",
    description:
      "How MALAC earns trust when you shop online in Pakistan: verified sellers, Cash on Delivery, clear prices and real order tracking.",
    heading: "Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust",
    body: `<p>Online shopping in Pakistan works best when the store earns your trust first: clear prices in rupees, Cash on Delivery so you pay when the parcel is in your hands, order tracking at every step, and support that answers on WhatsApp and email. That is how MALAC — M.A Luxury Apparel Collection, based in Faisalabad — runs its store. Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/shop">Shop at MALAC</a></p>`,
  },
  "/blog/cash-on-delivery-online-shopping-pakistan": {
    title: "Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands — MALAC Blog",
    description:
      "Cash on Delivery in Pakistan explained: how COD works at MALAC, when to choose it, and how advance payment by JazzCash or Easypaisa differs.",
    heading: "Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands",
    body: `<p>With Cash on Delivery you order online and pay in cash only when the parcel reaches your door — no card, no advance transfer. At MALAC, COD is available across Pakistan alongside JazzCash, Easypaisa, Meezan Bank, NayaPay, SadaPay and FirstPay. Read the full article in the MALAC app or on the website blog.</p><p><a href="/blog">More from the MALAC Blog</a> · <a href="/shop">Shop at MALAC</a></p>`,
  },
  "/terms": {
    title: "Terms of Service — MALAC",
    description:
      "MALAC Terms of Service: ordering, payment, delivery, returns and exchanges for online shopping at MALAC in Pakistan.",
    heading: "Terms of Service",
    body: `<p>These terms cover ordering, payment, delivery and returns for purchases at MALAC (malac.pp.ua), an online store based in Faisalabad, Pakistan. Damaged, defective or incorrect items may be reported within 7 days of delivery; change-of-mind returns are not accepted. The full terms are available on this page in the MALAC website and app.</p>`,
  },
  "/policy": {
    title: "Privacy & Return Policy — MALAC",
    description:
      "MALAC privacy and return policy: how customer data is handled, and the store's return and exchange rules for online orders in Pakistan.",
    heading: "Privacy & Return Policy",
    body: `<p>MALAC keeps customer and order data saved against the customer's account so orders can be tracked, supported and re-ordered. Returns are accepted for damaged, defective or incorrect items reported within 7 days of delivery, with replacement or refund after inspection. The full policy is available on this page in the MALAC website and app.</p>`,
  },
};

// Schema strengthening (2026-11-24): /faq carries the full 16-question
// FAQPage built from the SAME array as its body (schemaData.js,
// generated from Faq.jsx — the short 5-question summary body above is
// replaced), and every blog post carries BlogPosting + BreadcrumbList
// (+ its own FAQPage where the post has FAQs), all in the server HTML
// instead of only after React mounts. The client pages no longer inject
// these blocks, so each rendered page carries exactly one copy.
{
  const faq = STATIC_PAGES["/faq"];
  faq.body = SITE_FAQS.map(
    (f) => `<p><strong>${esc(f.q)}</strong> ${esc(f.a)}</p>`
  ).join("");
  faq.jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: faq.title,
      description: faq.description,
      url: `${SITE_URL}/faq`,
    },
    faqPageLd(SITE_FAQS),
  ];
}
for (const [slug, meta] of Object.entries(BLOG_SCHEMA)) {
  const entry = STATIC_PAGES[`/blog/${slug}`];
  if (!entry) continue;
  entry.jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: entry.heading,
      description: entry.description,
      datePublished: meta.date,
      author: { "@type": "Organization", name: "MALAC" },
      publisher: { "@type": "Organization", name: "MALAC" },
      mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    },
    breadcrumbLd([
      ["Home", `${SITE_URL}/`],
      ["Blog", `${SITE_URL}/blog`],
      [entry.heading, `${SITE_URL}/blog/${slug}`],
    ]),
    ...(meta.faqs.length ? [faqPageLd(meta.faqs)] : []),
  ];
}

for (const [path, page] of Object.entries(STATIC_PAGES)) {
  router.get(path, (req, res) => {
    renderPage(res, {
      title: page.title,
      description: page.description,
      canonical: `${SITE_URL}${path}`,
      content: `<main><h1>${esc(page.heading)}</h1>${page.body}</main>`,
      jsonLd: page.jsonLd || {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.title,
        description: page.description,
        url: `${SITE_URL}${path}`,
      },
    });
  });
}

export default router;
