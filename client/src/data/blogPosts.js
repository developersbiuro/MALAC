// MALAC Blog posts. Content lives in the client (no DB model) — each post
// is a plain object with structured body blocks so BlogPost.jsx can render
// it without any HTML injection:
//   { t: "p",  x: "paragraph text (**bold** and [links](/shop) supported)" }
//   { t: "h",  x: "Section heading" }
//   { t: "ul", x: ["bullet", ...] }
//   { t: "ol", x: ["step", ...] }
// Writing rules for posts (owner's standard): 100% original wording that
// exists nowhere else, natural human language, and honest SEO — real
// keywords and internal links, never keyword stuffing or invented claims.
// New posts are added by appending an object here (newest first) and
// adding their /blog/<slug> URL to server/src/routes/sitemapRoutes.js.
export const BLOG_POSTS = [
  {
    slug: "cash-on-delivery-online-shopping-pakistan",
    title: "Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands",
    excerpt:
      "Most Pakistanis still pay at the door — and for good reason. Here is how Cash on Delivery actually works at MALAC, what it costs, how long it takes, and the small checks that keep a COD order safe from start to finish.",
    date: "2026-11-14",
    displayDate: "14 November 2026",
    readTime: "4 min read",
    faqs: [
      {
        q: "Can I pay Cash on Delivery at MALAC?",
        a: "Yes. Choose COD at checkout and pay when the parcel is in your hands — no advance payment, no card, no transfer needed.",
      },
      {
        q: "Is there an extra charge for COD?",
        a: "No. COD costs the same as any other payment method at MALAC. Standard delivery is Rs. 249, and it is completely free on orders above Rs. 3,000.",
      },
      {
        q: "How long does a COD order take?",
        a: "Standard delivery is 2 to 5 working days, depending on your city. Express, where available, is 1 to 2 working days.",
      },
      {
        q: "Can I check my parcel before paying?",
        a: "The courier hands you the parcel and collects the payment shown on the label. If the parcel looks damaged or wrong, tell the courier and message us on WhatsApp right away — do not accept a parcel you can see is damaged.",
      },
      {
        q: "What if my COD order arrives damaged?",
        a: "Message us within 7 days of delivery, or request a return from your orders page. Damaged, defective or wrong items are our responsibility, and we will make it right.",
      },
    ],
    body: [
      { t: "p", x: "Ask ten people in Pakistan how they pay for an online order and most of them will give you the same answer: cash, at the door, parcel in hand. It is not old-fashioned. It is the one payment method where the customer never has to trust a stranger first — and after years of parcels that never arrived and pages that vanished after taking advance payments, that caution is completely fair." },
      { t: "p", x: "At **MALAC**, Cash on Delivery is not a favour we do for hesitant customers. It is our main payment method, and this page explains exactly how it works here — what it costs, how long it takes, and the small checks that keep a COD order safe." },
      { t: "h", x: "How a COD order works at MALAC, step by step" },
      { t: "p", x: "Nothing about the process is hidden, so here it is, start to finish:" },
      { t: "ol", x: [
        "Browse the [Shop page](/shop) and add what you like to your cart — 38 products across 9 categories, from fashion and electronics to groceries and toys.",
        "Sign in with your mobile number, email, or Google account. A one-time code keeps your account safe.",
        "Confirm your delivery address. After your first order it is saved, so next time checkout is almost one tap.",
        "Choose **Cash on Delivery** at checkout and confirm. No card number, no transfer screenshot, nothing to send in advance.",
        "We pack your order here in Faisalabad and hand it to the courier — **TCS, Leopards, Trax or PostEx**. Your tracking ID reaches you on WhatsApp, and you can follow the order on our Track Order page: packed, shipped, out for delivery, delivered.",
        "The courier arrives, you take the parcel, and you pay the amount printed on the label. That is the whole transaction.",
      ] },
      { t: "h", x: "What COD costs — and what it does not cost" },
      { t: "p", x: "Some stores quietly add a \"COD fee\" at the last step. We do not. A COD order at MALAC costs exactly the same as a JazzCash or Easypaisa order: **standard delivery is Rs. 249, completely free on orders above Rs. 3,000**, and **express delivery is Rs. 399** where available. The full amount is shown to you before you confirm the order, and the same amount is printed on the parcel label — so the figure the courier asks for is the figure you already agreed to." },
      { t: "h", x: "How long a COD order takes" },
      { t: "p", x: "Payment method does not change the speed. Standard delivery takes **2 to 5 working days**, depending on your city, and express takes **1 to 2 working days** where it is offered. A parcel going to Karachi, Lahore or Islamabad usually moves faster than one going to a small town — that is the courier's route, not a penalty for paying cash, and we will not promise you a date we cannot keep." },
      { t: "h", x: "Five small checks that keep a COD order safe" },
      { t: "p", x: "COD protects you, but a little care on your side makes it airtight:" },
      { t: "ol", x: [
        "Order from a store that shows a real address, a real phone number and a real returns policy — not just a WhatsApp number on a page with no name.",
        "Read the price and the delivery charge on the screen before confirming. At MALAC the total you confirm is the total on the label.",
        "Keep your order ID from the confirmation message. If anything goes wrong, that one ID is all we need to find your parcel.",
        "When the courier arrives, look at the parcel before paying. If the box is torn open or crushed, say so on the spot and message us on WhatsApp — a damaged parcel is our problem, not yours.",
        "Never pay anyone who comes without your parcel, and never pay more than the amount on the label.",
      ] },
      { t: "h", x: "What if something arrives wrong?" },
      { t: "p", x: "This is where trust is actually built, so we say it plainly: if your item arrives **damaged, defective, or different from what you ordered**, tell us within **7 days** of delivery and we will sort it out with an exchange or a solution. You can request a return right from your orders page. Change-of-mind returns are the one thing we do not accept, and we would rather tell you that honestly here than surprise you later." },
      { t: "h", x: "COD, or pay in advance — your choice" },
      { t: "p", x: "If you would rather pay before dispatch, you can send the amount through **JazzCash** or **Easypaisa**, or by transfer to our **Meezan Bank, NayaPay, SadaPay or FirstPay — HBL Microfinance Bank** accounts, sharing the transaction screenshot during checkout. Our team checks it before dispatch. But if you would rather pay at your door, nobody at MALAC will ever push you to pay first. That is the whole point of Cash on Delivery." },
      { t: "p", x: "First-time customers can use the voucher **WELCOME10** for 10% off their first order — COD orders included. Start with the [Shop page](/shop), or read [how MALAC works](/blog/online-shopping-in-pakistan-malac). And if you are still unsure about anything, WhatsApp us on **+92 323 6016684** and ask. A real person will answer." },
    ],
  },
  {
    slug: "online-shopping-in-pakistan-malac",
    title: "Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust",
    excerpt:
      "Shopping online in Pakistan should not feel like a gamble. MALAC is an online store from Faisalabad with honest prices in rupees, Cash on Delivery, JazzCash and Easypaisa payments, and delivery to every city and town — here is how we work, in plain words.",
    date: "2026-11-14",
    displayDate: "14 November 2026",
    readTime: "5 min read",
    faqs: [
      {
        q: "Do you deliver to my city?",
        a: "Almost certainly, yes. MALAC delivers all over Pakistan — Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Sialkot, Gujranwala, and the smaller towns around them. At checkout you pick your province, city and area from a list that covers the whole country.",
      },
      {
        q: "How long will my order take?",
        a: "Standard delivery is 2 to 5 working days, depending on your city. Express, where available, is 1 to 2 working days.",
      },
      {
        q: "Is Cash on Delivery really available?",
        a: "Yes — choose COD at checkout and pay when the parcel is in your hands.",
      },
      {
        q: "Do I need an account just to look around?",
        a: "No. Browsing is open to everyone. You sign in only when you want to order, so your orders, addresses and details stay safe in one place.",
      },
      {
        q: "What if my order arrives damaged?",
        a: "Message us within 7 days or request a return from your orders page. Damaged, defective or wrong items are our responsibility, and we will make it right.",
      },
    ],
    body: [
      { t: "p", x: "If you have ever ordered something online in Pakistan, you probably know the feeling. The parcel arrives, you open the box with full excitement — and inside is something that looks nothing like the picture. Wrong colour. Cheap material. Sometimes the parcel never comes at all, and the \"customer support\" number rings forever." },
      { t: "p", x: "We started **MALAC** because we were tired of exactly that. This page is our honest introduction: who we are, what we sell, how our prices and delivery work, and what happens if something goes wrong with your order. No big claims, no marketing tricks — just how the store actually runs." },
      { t: "h", x: "A small online store from Faisalabad, not a faceless warehouse" },
      { t: "p", x: "MALAC stands for **M.A Luxury Apparel Collection**. The store was founded by **Muhammad Abdullah** in Faisalabad, Punjab, and it runs completely online — there is no walk-in shop. Every order is packed here and sent out through courier, and when you message us on WhatsApp, you are talking to a real person from our own small team, not a call centre reading a script." },
      { t: "p", x: "That small size is honestly our advantage. When a customer has a problem, we cannot hide behind a ticket number. We have to fix it — and that is exactly what keeps a small store alive in Pakistan." },
      { t: "h", x: "What you can buy at MALAC" },
      { t: "p", x: "What began with apparel is now a full store. You will find **Mobiles & Tablets**, **Electronics**, **Fashion** for men, women and kids, **Home & Living**, **Beauty & Health**, **Groceries**, **Sports & Fitness**, and **Toys & Baby** — all on our [Shop page](/shop)." },
      { t: "p", x: "A few things customers pick up again and again: everyday fashion like kurtis, polos and Peshawari chappals; small electronics that make load-shedding bearable, like rechargeable fans and power banks; kitchen basics from kettles to dinner sets; and daily groceries like pure desi ghee and honey. New products are added regularly, and first-time customers can use the voucher **WELCOME10** for 10% off their first order." },
      { t: "h", x: "Prices in rupees, written plainly" },
      { t: "p", x: "Here is a small thing we feel strongly about. Many stores show a scratched-out \"Rs. 40,000\" next to a \"Rs. 3,999\" price, when the product was never sold at Rs. 40,000 in its life. We do not play that game. When MALAC shows an old price, it is a real old price — and the price you see on the product page is the price you pay." },
      { t: "p", x: "Delivery is just as plain: **standard delivery is Rs. 249**, it is **completely free on orders above Rs. 3,000**, and **express delivery is Rs. 399** where available. The full amount is shown to you before you confirm the order. Nothing is added at your door that you did not already see on the screen." },
      { t: "h", x: "Cash on Delivery, JazzCash and Easypaisa — pay the way that suits you" },
      { t: "p", x: "Most of our customers still prefer **Cash on Delivery**, and we completely understand why. You should not have to send money into the dark and hope for the best. With COD, you pay at your doorstep, parcel in hand." },
      { t: "p", x: "If you prefer to pay in advance, you can send the amount through **JazzCash** or **Easypaisa**, or by transfer to our **Meezan Bank, NayaPay, SadaPay or FirstPay — HBL Microfinance Bank** accounts. For transfers, you simply share the transaction screenshot during checkout. Our team checks it before dispatch — this one manual step is what makes sure a payment sent to the wrong number never becomes a lost order." },
      { t: "h", x: "Delivery to Karachi, Lahore, Islamabad — and the towns in between" },
      { t: "p", x: "Big cities are easy for every store. The real test of online shopping in Pakistan is a small town in Sindh or a village outside Multan — and yes, we deliver there too. Orders go out through **TCS, Leopards, Trax and PostEx**, standard delivery takes **2 to 5 working days**, and express takes **1 to 2 working days** where offered." },
      { t: "p", x: "The moment your parcel is shipped, your tracking ID reaches you on WhatsApp, and you can follow the order from our Track Order page at any time — packed, shipped, out for delivery, delivered. No guessing, no \"sir, kal aa jayega\" without proof." },
      { t: "h", x: "If something arrives wrong, we fix it" },
      { t: "p", x: "Let us say it clearly, because this is where trust is actually built: if your item arrives **damaged, defective, or different from what you ordered**, tell us within **7 days** of delivery and we will sort it out with an exchange or a solution. You can request a return right from your orders page — no long forms, no begging anyone on the phone. Change-of-mind returns are the one thing we do not accept, and we would rather tell you that honestly here than surprise you later." },
      { t: "h", x: "How to place your first order" },
      { t: "p", x: "It takes a few minutes:" },
      { t: "ol", x: [
        "Browse the [Shop page](/shop) and add what you like to your cart.",
        "Sign in with your mobile number, email, or Google account. A one-time code keeps your account safe.",
        "Confirm your delivery address — after your first order it is saved, so next time checkout is almost one tap.",
        "Choose Cash on Delivery or one of the transfer options, and confirm.",
        "Sit back. Your confirmation arrives right away, and every step after that — packed, shipped, out for delivery, delivered — is shared with you.",
      ] },
      { t: "p", x: "Do not forget to apply **WELCOME10** at checkout for 10% off your first order." },
      { t: "h", x: "Questions people actually ask us" },
      { t: "p", x: "**Do you deliver to my city?** Almost certainly, yes. We deliver all over Pakistan — Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Sialkot, Gujranwala, and the smaller towns around them. At checkout you pick your province, city and area from a list that covers the whole country." },
      { t: "p", x: "**How long will my order take?** Standard delivery is 2 to 5 working days, depending on your city. Express, where available, is 1 to 2 working days." },
      { t: "p", x: "**Is Cash on Delivery really available?** Yes — choose COD at checkout and pay when the parcel is in your hands." },
      { t: "p", x: "**Do I need an account just to look around?** No. Browsing is open to everyone. You sign in only when you want to order, so your orders, addresses and details stay safe in one place." },
      { t: "p", x: "**What if my order arrives damaged?** Message us within 7 days or request a return from your orders page. Damaged, defective or wrong items are our responsibility, and we will make it right." },
      { t: "h", x: "One last thing" },
      { t: "p", x: "MALAC will probably never be the biggest online store in Pakistan. That is fine with us. We would rather be the store a family in Faisalabad, a student in Lahore, and a shopkeeper in Hyderabad can order from without worrying — and come back to because the first order went exactly as promised." },
      { t: "p", x: "Start with the [Shop page](/shop), or read a little more [about MALAC](/about). And if you are still unsure about anything, just WhatsApp us on **+92 323 6016684** and ask. A real person will answer." },
    ],
  },
];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}
