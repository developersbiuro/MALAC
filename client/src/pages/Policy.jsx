import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage.jsx";

export default function Policy() {
  return (
    <LegalPage
      eyebrow="Your Privacy"
      title="Privacy Policy"
      intro="This policy explains what personal information MALAC — M.A Luxury Apparel Collection collects when you shop with us, how it is used, and the choices you have."
    >
      <LegalSection title="1. Information We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Account details</b> — your name, email address and phone number, provided at sign-up and verified with one-time codes or Google sign-in.</li>
          <li><b>Order information</b> — delivery addresses, order history, and the items you buy.</li>
          <li><b>Payment proof</b> — for JazzCash and Easypaisa orders, the payment screenshot and transaction details you upload so our team can verify your payment.</li>
          <li><b>Content you post</b> — product reviews and questions you submit on product pages.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To process, confirm, pack and deliver your orders.</li>
          <li>To verify JazzCash / Easypaisa payments before dispatch.</li>
          <li>To send one-time verification codes and updates about your orders.</li>
          <li>To provide customer support and respond to your questions.</li>
          <li>To keep accounts secure and prevent fraud.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Information Sharing">
        <p>We share only what is needed to fulfil your order — for example your name, phone number and delivery address with the courier delivering your parcel (such as TCS, Leopards or Trax), and your payment proof with the staff verifying your payment. <b>We do not sell your personal information to third parties.</b></p>
      </LegalSection>

      <LegalSection title="4. Data Security">
        <p>Access to customer information is limited to authorised MALAC staff who need it to process orders and provide support. Verification codes sent to your email or phone are time-limited. Please keep your password and one-time codes private — we will never ask for them outside this website.</p>
      </LegalSection>

      <LegalSection title="5. Cookies & Browser Storage">
        <p>This store uses your browser&apos;s local storage to keep your cart, wishlist and sign-in session working between visits. We do not use it to build advertising profiles. Clearing your browser storage will sign you out and empty the locally stored cart and wishlist.</p>
      </LegalSection>

      <LegalSection title="6. Your Rights">
        <p>You may ask us to access, correct or delete your personal information at any time by emailing developersbiuro@gmail.com or messaging us on WhatsApp at +92 3236016684. We will respond within a reasonable time and may verify your identity first to protect your account.</p>
      </LegalSection>

      <LegalSection title="7. Children's Privacy">
        <p>This store is intended for adult shoppers. If you believe a child has provided us personal information without a guardian&apos;s consent, contact us and we will remove it.</p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>We may update this policy from time to time. The current version will always be available on this page, and significant changes will be reflected here before they take effect for new orders.</p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p>Questions about this policy or your data: developersbiuro@gmail.com · WhatsApp +92 3236016684. See also our <Link to="/terms" className="text-lux-burnt font-medium hover:underline">Terms of Service</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
