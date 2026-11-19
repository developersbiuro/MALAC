import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage.jsx";
import { useSeo } from "../utils/seo.js";
import { rs } from "../utils/format.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// Dedicated FAQ page (Abdullah, 2026-11-14): the questions people actually
// ask Google — and its AI Overview — about MALAC the STORE. Every answer
// states the store's real rules (live Settings fees via usePublicSettings,
// the published Terms/Policy, the real contact channels) in plain, original
// words. The FAQPage JSON-LD below is built from the SAME array that is
// rendered on the page, so the schema can never drift from the visible text.
const buildFaqs = (fees) => [
  {
    q: "What is MALAC?",
    a: "MALAC stands for M.A Luxury Apparel Collection — you may also see the name written as MalacPK. It is an online shopping store from Faisalabad, Pakistan. There is no physical shop and no counter to visit: everything is sold through this website and delivered to your door, anywhere in Pakistan.",
  },
  {
    q: "How do you pronounce MALAC?",
    a: "MALAC is spoken as \u0645\u0627\u0644\u0627\u06A9 (two syllables). The name is short for M.A Luxury Apparel Collection.",
  },
  {
    q: "What does MALAC stand for? What is the meaning of MALAC?",
    a: "MALAC is the short form of M.A Luxury Apparel Collection. The M.A are the initials of our founder, Muhammad Abdullah, so the store carries its founder's own name — and the idea he built it on: good clothes and everyday things, chosen with care in Faisalabad and delivered honestly to homes all over Pakistan.",
  },
  {
    q: "Is MALAC a genuine store? Can I trust it?",
    a: "Yes. MALAC is run by a real team in Faisalabad, and a person checks every order before it is packed — nothing is dispatched on autopilot. If paying in advance feels risky, choose Cash on Delivery and hand over your money only when the parcel is in your hands. And if anything feels unclear before or after ordering, message us on WhatsApp at +92 323 6016684 or email info@malac.pp.ua and a person will answer you.",
  },
  {
    q: "Who founded MALAC?",
    a: "MALAC was founded by Muhammad Abdullah in Faisalabad, Punjab. He built it as an online-only store so that customers in every Pakistani city — not just the big ones — could order the same products at the same prices, without travelling to a bazaar.",
  },
  {
    q: "What can I buy on MALAC?",
    a: "The catalogue covers six categories: Men's Fashion, Women's Fashion, Watches, Eyewear, Bags & Accessories, and Mobile Accessories. One week that might mean a winter tracksuit or a puffer jacket, a watch or sunglasses, a wallet, a power bank or a fast charger — the range keeps growing, and every price is shown in Pakistani Rupees before you order.",
  },
  {
    q: "How do I place an order on MALAC?",
    a: "You need a free MALAC account to order — sign up with your mobile number, your email, or Google. Add what you like to the cart, open checkout, confirm the delivery address saved on your account, pick how you want to pay, and place the order. Our team then confirms it, packs it, and hands it to the courier; you can follow every step from your account.",
  },
  {
    q: "Does MALAC offer Cash on Delivery?",
    a: "Yes — Cash on Delivery is available all over Pakistan and there is no extra fee for choosing it: you simply pay the courier, in cash, when your order reaches your door. If you would rather pay in advance, JazzCash, Easypaisa, Meezan Bank, NayaPay, SadaPay and FirstPay — HBL Microfinance Bank are all accepted at checkout.",
  },
  {
    q: "How do I pay in advance with JazzCash or Easypaisa?",
    a: "At checkout, pick JazzCash or Easypaisa and send the order total to the account shown there (title Muhammad Abdullah, number 0303 6253428). Then enter your transaction details and attach the payment screenshot with the order. Our team verifies the transfer before the order is packed — if a payment cannot be matched, we contact you first and never dispatch an unverified paid order.",
  },
  {
    q: `How much is delivery, and how long does it take?`,
    a: `Standard delivery costs ${rs(fees.standard)} and is completely free on orders over ${rs(fees.freeThreshold)}; it normally reaches you in 2 to 5 working days. Where express delivery is offered at checkout it costs ${rs(fees.express)} and normally takes 1 to 2 working days. The exact charge for your order is always shown before you place it — there are no surprise fees at the door beyond what checkout showed (plus your order total, if you chose Cash on Delivery).`,
  },
  {
    q: "Does MALAC deliver to my city?",
    a: "Almost certainly, yes. MALAC delivers across Pakistan — Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Sialkot, Gujranwala and smaller towns as well — through TCS, Leopards, Trax and PostEx. If a courier can reach your address, so can we.",
  },
  {
    q: "How do I track my MALAC order?",
    a: "Open the Track Order page and enter your order ID (it looks like MLC-XXXXXX, and it is in your order confirmation) or the phone number you ordered with — you will see exactly where your order has reached. Signed-in customers can also open My Orders at any time. On top of that, we send the big moments — order placed, shipped, out for delivery, delivered — to you by app notification, email and WhatsApp.",
  },
  {
    q: "What if my item arrives damaged, defective or wrong?",
    a: "Tell us within 7 days of delivery, on WhatsApp (+92 323 6016684) or at info@malac.pp.ua, with your order number. Send the item back unused and in its original packaging; once we have inspected it, we arrange a replacement or a refund. Change-of-mind returns are not accepted, so please check sizes and product details carefully before ordering — or ask us first, we are happy to help you choose.",
  },
  {
    q: "Is there a discount for new customers?",
    a: "Yes — new customers can use the voucher code WELCOME10 at checkout for 10% off their first order. Other vouchers run from time to time; whenever one is active, entering its code in the cart or at checkout shows the saving straight away, before you pay anything.",
  },
  {
    q: "Does MALAC have a mobile app?",
    a: "Yes. The MALAC Android app can be downloaded from this website — look for the download button — and it is the same store, in app form: browse, order, track, and get a phone notification at every step of your order's journey. If you are on an iPhone, the website itself works fully in your browser, and you can add it to your home screen.",
  },
  {
    q: "How do I contact MALAC?",
    a: "The fastest way is WhatsApp on +92 323 6016684. For complaints, order questions or anything formal, email info@malac.pp.ua — complaints are read in that inbox by the team. You can also open the chat assistant on this website for quick answers about products, prices and your orders.",
  },
];

export default function Faq() {
  const { fees } = usePublicSettings();
  const FAQS = buildFaqs(fees);

  useSeo({
    title: "MALAC FAQs — Ordering, Cash on Delivery, Delivery & Returns",
    description:
      "Answers to the questions people ask about MALAC, the online shopping store from Faisalabad, Pakistan: what MALAC is, how to order, Cash on Delivery, delivery charges and times, tracking, returns and how to contact the store.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  });

  return (
    <LegalPage
      eyebrow="Help Centre"
      title="Frequently Asked Questions"
      intro="Straight answers about MALAC — who we are, how ordering and payment work, what delivery costs, and what to do if something goes wrong. If your question is not here, message us on WhatsApp at +92 323 6016684 and a person will help you."
    >
      {FAQS.map((f) => (
        <LegalSection key={f.q} title={f.q}>
          <p>{f.a}</p>
        </LegalSection>
      ))}
      <LegalSection title="Still deciding?">
        <p>
          Browse the full catalogue on the <Link to="/shop" className="text-lux-burnt font-medium hover:underline">Shop page</Link>,
          read more about the store on the <Link to="/about" className="text-lux-burnt font-medium hover:underline">About page</Link>,
          or see the detailed rules in our <Link to="/terms" className="text-lux-burnt font-medium hover:underline">Terms of Service</Link> and{" "}
          <Link to="/policy" className="text-lux-burnt font-medium hover:underline">Privacy &amp; Return Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
