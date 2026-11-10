import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage.jsx";
import { useSeo } from "../utils/seo.js";
import { rs } from "../utils/format.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

// The store's public brand page: who MALAC is, what it sells, how
// ordering and delivery work, and how to reach the team. Everything
// stated here mirrors the store's real published rules (Terms /
// Policy) and the live Settings — no invented claims, no fake
// numbers. Delivery figures come from usePublicSettings so an
// admin-panel change updates this page too.
export default function About() {
  const { fees, payments } = usePublicSettings();
  useSeo({
    title: "About MALAC — Online Shopping Store in Pakistan",
    description: "MALAC (MalacPK) — M.A Luxury Apparel Collection — is an online shopping store based in Faisalabad, Pakistan: mobiles, electronics, fashion, beauty, home & living and more, with Cash on Delivery and nationwide delivery.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About MALAC",
      url: "https://www.malac.pp.ua/about",
      mainEntity: {
        "@type": "Organization",
        name: "MALAC",
        alternateName: ["MALAC Store", "MalacPK", "MALAC Pakistan"],
        url: "https://www.malac.pp.ua/",
      },
    },
  });
  return (
    <LegalPage
      eyebrow="Our Story"
      title="About MALAC"
      intro="MALAC — M.A Luxury Apparel Collection — is an online shopping store from Faisalabad, Pakistan, also known as MalacPK. We sell everyday and premium products across Pakistan with honest prices in Pakistani Rupees, Cash on Delivery, and delivery to your doorstep — no account tricks, no hidden charges."
    >
      <LegalSection title="Who we are">
        <p>
          MALAC was founded by <b>Muhammad Abdullah</b> in Faisalabad, Punjab. The store runs online only —
          there is no walk-in shop — so every order is placed on this website and delivered by courier
          anywhere in Pakistan. Our full catalogue is organised into Mobiles &amp; Tablets, Electronics,
          Fashion, Kids, Home &amp; Living, Beauty &amp; Health, Groceries, Sports &amp; Fitness and
          Toys &amp; Baby. Browse everything on the <Link to="/shop" className="text-lux-burnt font-medium hover:underline">Shop page</Link>.
        </p>
      </LegalSection>

      <LegalSection title="How ordering works">
        <p>
          Create a free MALAC account, add what you like to your cart, and check out with your delivery
          address. You can pay with {payments?.codEnabled !== false ? <><b>Cash on Delivery</b>, or by </> : <>by </>}
          <b>JazzCash / Easypaisa</b> transfer, or by bank transfer to our <b>Meezan Bank, NayaPay, SadaPay
          or FirstPay — HBL Microfinance Bank</b> accounts — for transfers you upload the payment screenshot
          with your order and our team verifies it before dispatch. Every order is reviewed and confirmed
          by our team before it is packed.
        </p>
        <p>
          Delivery is nationwide through courier partners including TCS, Leopards, Trax and PostEx.
          Standard delivery is <b>{rs(fees.standard)}</b> (free on orders over <b>{rs(fees.freeThreshold)}</b>,
          usually 2–5 working days) and Express is <b>{rs(fees.express)}</b> (usually 1–2 working days) where
          offered. You can follow your parcel any time from the Track Order page or My Orders.
        </p>
      </LegalSection>

      <LegalSection title="Returns, the honest version">
        <p>
          If something arrives damaged, defective or incorrect, tell us within <b>7 days</b> of delivery and
          we will arrange a replacement or a refund after inspection — the full rules are in our{" "}
          <Link to="/policy" className="text-lux-burnt font-medium hover:underline">Privacy &amp; Return Policy</Link>{" "}
          and <Link to="/terms" className="text-lux-burnt font-medium hover:underline">Terms of Service</Link>.
          Change-of-mind returns are not accepted, and we say so openly rather than burying it.
        </p>
      </LegalSection>

      <LegalSection title="Talk to us">
        <p>
          WhatsApp: <a href="https://wa.me/923236016684" target="_blank" rel="noreferrer" className="text-lux-burnt font-medium hover:underline">+92 323 6016684</a><br />
          Email: <a href="mailto:info@malac.pp.ua" className="text-lux-burnt font-medium hover:underline">info@malac.pp.ua</a> ·{" "}
          <a href="mailto:developersbiuro@gmail.com" className="text-lux-burnt font-medium hover:underline">developersbiuro@gmail.com</a><br />
          Based in Faisalabad, Punjab, Pakistan — delivering all over Pakistan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
