import { Router } from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

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
  const res = await fetch(`${SITE_URL}/`, {
    headers: { "User-Agent": "MALAC-Prerender/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`template fetch ${res.status}`);
  const html = await res.text();
  if (!html.includes('id="root"')) throw new Error("template has no #root");
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

function renderPage(res, page) {
  const { title, description, canonical, image, content, jsonLd } = page;
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
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
      html = injectRoot(html, content);
      res.type("html").send(html);
    })
    .catch(() => {
      res.type("html").send(fallbackShell(page));
    });
}

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
        ? `<img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" />`
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
          .select("title slug category basePrice salePrice images ratingAvg ratingCount")
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
  const title = `${category.name} — Buy Online in Pakistan | MALAC`;
  const description = `Shop ${category.name} online in Pakistan at MALAC — Cash on Delivery and nationwide delivery in 2–5 working days (standard Rs. 249, free on orders over Rs. 3,000).`;
  const cards = products
    .map((p) => {
      const price = priceOf(p);
      const img = p.images?.[0]
        ? `<img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" />`
        : "";
      const was =
        p.salePrice > 0 && p.basePrice > p.salePrice
          ? ` <s>${rs(p.basePrice)}</s>`
          : "";
      return `<article><a href="/product/${esc(p.slug)}">${img}<h3>${esc(p.title)}</h3></a><p>${esc(p.category)}</p><p><strong>${rs(price)}</strong>${was}</p></article>`;
    })
    .join("\n");
  const content = `<main>
<nav><a href="/shop">Shop</a> &rsaquo; ${esc(category.name)}</nav>
<h1>${esc(category.name)}</h1>
<p>Shop ${esc(category.name)} at MALAC — M.A Luxury Apparel Collection — with Cash on Delivery and nationwide delivery in 2–5 working days (standard delivery Rs. 249, free on orders over Rs. 3,000).</p>
<section><h2>Products</h2>
${cards}
</section>
</main>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url,
  };
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
    .map((src) => `<img src="${esc(src)}" alt="${esc(product.title)}" loading="lazy" />`)
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description,
    image: product.images || [],
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
  };
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
      "MALAC is M.A Luxury Apparel Collection, an online shopping store based in Faisalabad, Pakistan — fashion, mobiles, electronics, beauty, home & living and more with Cash on Delivery nationwide.",
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
    body: `<ul><li><a href="/blog/winter-shopping-in-pakistan-malac">Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It</a></li><li><a href="/blog/online-shopping-in-pakistan-malac">Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust</a></li><li><a href="/blog/cash-on-delivery-online-shopping-pakistan">Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands</a></li></ul>`,
  },
  "/blog/winter-shopping-in-pakistan-malac": {
    title: "Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It — MALAC Blog",
    description:
      "A practical winter shopping guide for Pakistan: start with the everyday fleece layer, add one piece for real cold, and do not forget thermals, gloves and the children — with MALAC's eight winter pieces and Cash on Delivery.",
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

for (const [path, page] of Object.entries(STATIC_PAGES)) {
  router.get(path, (req, res) => {
    renderPage(res, {
      title: page.title,
      description: page.description,
      canonical: `${SITE_URL}${path}`,
      content: `<main><h1>${esc(page.heading)}</h1>${page.body}</main>`,
      jsonLd: {
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
