import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage.jsx";

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Customer Care"
      title="Terms of Service"
      intro="Welcome to MALAC — M.A Luxury Apparel Collection. By browsing or buying from this store you agree to the terms below. Please read them carefully before placing an order."
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>These Terms of Service govern your use of the MALAC online store and any order you place with us. If you do not agree with any part of these terms, please do not place an order.</p>
      </LegalSection>

      <LegalSection title="2. Products & Pricing">
        <p>All prices are shown in Pakistani Rupees (PKR). We work hard to keep product titles, images, prices and stock levels accurate, but errors can occur — if a pricing error affects your order we will contact you before dispatch and you may cancel for a full refund of any amount already paid.</p>
        <p>Delivery charges are additional unless your order qualifies for free shipping (see Delivery &amp; Shipping).</p>
      </LegalSection>

      <LegalSection title="3. Orders & Payment">
        <p>An account is required to place an order. Every order is reviewed and confirmed by our team before it is packed and dispatched.</p>
        <p>We accept the following payment methods:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Cash on Delivery (COD)</b> — pay in cash when your order arrives.</li>
          <li><b>JazzCash / Easypaisa (manual transfer)</b> — transfer the order total to account title <b>Muhammad Abdullah</b>, number <b>0303 6253428</b>, then upload your payment screenshot and transaction details with your order. Our team verifies the payment before the order is processed; if a payment cannot be verified, we will contact you and the order will not be dispatched until it is resolved.</li>
        </ul>
        <p>Please never share your account password or one-time verification codes with anyone — MALAC will never ask for them outside the sign-in and checkout flow on this website.</p>
      </LegalSection>

      <LegalSection title="4. Delivery & Shipping">
        <p>We deliver nationwide across Pakistan through trusted courier partners, including TCS, Leopards and Trax. Standard delivery is Rs. 199 on most orders (the exact fee for an item is shown on its product page), and standard shipping is <b>FREE on orders over Rs. 5,000</b>. Express delivery is available at checkout for Rs. 399 where offered.</p>
        <p>Delivery timelines shown during checkout are estimates and may vary by city and courier. You can follow your order at any time from the Track Your Order page once you are signed in.</p>
      </LegalSection>

      <LegalSection title="5. Returns & Exchanges">
        <p>If you receive a damaged, defective or incorrect item, contact us within 7 days of delivery on WhatsApp (+92 3236016684) or by email (developersbiuro@gmail.com) with your order number. After we inspect the returned item, we will arrange a replacement or a refund.</p>
        <p>Items must be unused and in their original packaging. For hygiene and safety reasons, certain items may not be returnable, and change-of-mind returns are not accepted.</p>
      </LegalSection>

      <LegalSection title="6. Cancellation Policy">
        <p>You may cancel your order free of charge from <Link to="/orders" className="text-lux-burnt font-medium hover:underline">My Orders</Link> while its status is <b>Pending</b> or <b>Processing</b>. Once an order has been shipped it can no longer be cancelled.</p>
        <p>If you have already paid for a cancelled order by JazzCash or Easypaisa, the amount will be refunded to the same account after verification.</p>
      </LegalSection>

      <LegalSection title="7. Coupons & Promotions">
        <p>Coupon codes are subject to their own conditions, including minimum spend and expiry dates, and only one coupon can be applied per order. Coupons have no cash value and cannot be combined with other offers unless stated otherwise.</p>
      </LegalSection>

      <LegalSection title="8. Accounts & Security">
        <p>You are responsible for keeping your account credentials safe and for all activity under your account. Sign-up and sign-in are verified with one-time codes sent to your email or phone, or through Google sign-in.</p>
      </LegalSection>

      <LegalSection title="9. Privacy">
        <p>How we collect, use and protect your personal information is described in our <Link to="/policy" className="text-lux-burnt font-medium hover:underline">Privacy Policy</Link>.</p>
      </LegalSection>

      <LegalSection title="10. Governing Law & Contact">
        <p>These terms are governed by the laws of Pakistan. For anything about these terms or your order, contact us at developersbiuro@gmail.com or on WhatsApp at +92 3236016684.</p>
      </LegalSection>
    </LegalPage>
  );
}
