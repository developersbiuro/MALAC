// MALAC Blog posts. Content lives in the client (no DB model) — each post
// is a plain object with structured body blocks so BlogPost.jsx can render
// it without any HTML injection:
//   { t: "p",  x: "paragraph text (**bold** is supported)" }
//   { t: "h",  x: "Section heading" }
//   { t: "ul", x: ["bullet", ...] }
//   { t: "ol", x: ["step", ...] }
// New posts are added by appending an object here (newest first) and
// adding their /blog/<slug> URL to server/src/routes/sitemapRoutes.js.
export const BLOG_POSTS = [
  {
    slug: "online-shopping-in-pakistan-malac",
    title: "MALAC — Online Shopping in Pakistan, Made Simple",
    excerpt:
      "Quality products, honest prices and delivery to your doorstep — anywhere in Pakistan. What MALAC is, what you can buy, how ordering and Cash on Delivery work, and how to reach us.",
    date: "2026-11-14",
    displayDate: "14 November 2026",
    readTime: "4 min read",
    body: [
      { t: "p", x: "Online shopping in Pakistan has grown fast, but one problem never went away: can you trust the store? Will the product look like its picture? Will it even arrive? **MALAC** was built to answer those questions properly. Based in Faisalabad and serving customers all over Pakistan, MALAC is an online store where you can shop fashion, electronics, home essentials and much more — with Cash on Delivery, easy mobile payments, and real human support on WhatsApp." },
      { t: "h", x: "What is MALAC?" },
      { t: "p", x: "MALAC stands for **M.A Luxury Apparel Collection**. What started with apparel has grown into a full online shopping store for everyday needs. The idea is simple: a clean, easy store — much like the big marketplaces you already know — but with personal service, clear prices, and no hidden charges. What you see on the product page is the price you pay, plus a delivery charge that is shown honestly before you place your order." },
      { t: "p", x: "You can shop on this website from any phone or computer, or download the **MALAC Android app** from the homepage for a faster, app-style experience." },
      { t: "h", x: "What can you buy at MALAC?" },
      { t: "p", x: "The store is organised into nine categories, so finding things is easy:" },
      { t: "ul", x: [
        "**Fashion** — Men, Women, Shoes and Unisex styles",
        "**Mobiles & Tablets** — phones and accessories",
        "**Electronics** — everyday gadgets and devices",
        "**Home & Living** — useful things for your home",
        "**Beauty & Health** — personal care essentials",
        "**Groceries** — daily-use items",
        "**Sports & Fitness** — gear for an active life",
        "**Toys & Baby** — for the little ones",
        "**Kids** — boys' and girls' fashion, kids' shoes and school supplies",
      ] },
      { t: "p", x: "New products are added regularly, and a **Flash Sale** section brings special prices on selected items. New customers can also use the welcome voucher **WELCOME10** for 10% off their first order." },
      { t: "h", x: "How ordering works" },
      { t: "ol", x: [
        "**Browse or search** the store and add items to your cart.",
        "**Sign in** with your mobile number, email, or Google account — a quick one-time code (OTP) keeps your account safe.",
        "**Check out** with your saved address. Your address, phone and email are saved after the first order, so next time checkout is almost one tap.",
        "**Choose how to pay** (see below) and confirm your order.",
        "**Track your order** any time from the Track Order page, and get updates on WhatsApp, email and in the app at every step — packed, shipped, out for delivery, and delivered.",
      ] },
      { t: "h", x: "Pay the way that suits you" },
      { t: "p", x: "Not everyone in Pakistan has — or wants to use — a bank card. MALAC keeps it practical:" },
      { t: "ul", x: [
        "**Cash on Delivery (COD)** — pay at your doorstep when your order arrives.",
        "**JazzCash** and **Easypaisa** — send the amount from your mobile account and share the transaction screenshot in checkout; our team verifies it and processes your order.",
        "**Bank and wallet transfers** — Meezan Bank, NayaPay, SadaPay and FirstPay (HBL Microfinance Bank) are also supported.",
      ] },
      { t: "p", x: "Every order is confirmed properly, and if a payment ever needs checking, our support team is one WhatsApp message away." },
      { t: "h", x: "Delivery charges — clear and simple" },
      { t: "ul", x: [
        "**Standard delivery: Rs. 249** (2–5 working days)",
        "**FREE delivery on orders over Rs. 3,000**",
        "**Express delivery: Rs. 399** (1–2 working days)",
      ] },
      { t: "p", x: "Orders are dispatched through trusted couriers including **TCS, Leopards, Trax and PostEx**, and your tracking ID is shared with you as soon as your parcel is shipped." },
      { t: "h", x: "Returns, without the headache" },
      { t: "p", x: "If your item arrives **damaged, defective, or different from what you ordered**, you can request a return within **7 days** of delivery from your orders page. We check the request and arrange an exchange or solution — that is a promise we keep written in our store policy, not just in this blog." },
      { t: "h", x: "Real support, from real people" },
      { t: "p", x: "Questions about a product? A problem with an order? Talk to us on **WhatsApp: +92 323 6016684**, email **info@malac.pp.ua**, or chat with the **MALAC Assistant** right here on the website — it can show you products, compare options, and help you track your order." },
      { t: "h", x: "Frequently asked questions" },
      { t: "p", x: "**Is MALAC available in my city?** Yes — we deliver all over Pakistan, to big cities and small towns alike. At checkout, you can pick your province, city and area from a list covering the whole country." },
      { t: "p", x: "**Do I need an account to browse?** No. Anyone can browse the store freely. You only sign in when you want to add items to your cart or place an order — this keeps your orders and addresses safe." },
      { t: "p", x: "**How long does delivery take?** Standard delivery takes 2–5 working days. Express delivery, where available, takes 1–2 working days." },
      { t: "p", x: "**Can I really pay cash on delivery?** Yes. COD is available — simply choose it at checkout and pay when your parcel arrives." },
      { t: "h", x: "Start shopping" },
      { t: "p", x: "Good products, fair prices, honest delivery charges and support that actually replies — that is what MALAC is trying to bring to online shopping in Pakistan, one order at a time. Visit the Shop page to see what is new, and don't forget your **WELCOME10** voucher for 10% off your first order." },
    ],
  },
];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}
