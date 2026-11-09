import { Link } from "react-router-dom";
import { MessageCircle, Mail, Smartphone } from "lucide-react";
import { LOGO_FULL } from "../assets/logo.js";
import InstallAppButton from "./InstallAppButton.jsx";

const COURIERS = ["TCS", "Leopards", "Trax"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Peshawar", "Faisalabad"];
// The store's category names (mirrors the seeded catalogue and the
// sitemap's /shop?category=<name> URLs).
const CATEGORIES = [
  "Mobiles & Tablets",
  "Electronics",
  "Fashion",
  "Kids",
  "Home & Living",
  "Beauty & Health",
  "Groceries",
  "Sports & Fitness",
  "Toys & Baby",
];

export default function Footer() {
  return (
    <footer className="bg-cream-soft mt-12 border-t border-cream-line pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <img src={LOGO_FULL} alt="MALAC — M.A Luxury Apparel Collection" className="h-24 w-auto" />
          <p className="text-gray-500 mt-3 leading-relaxed">MALAC — M.A Luxury Apparel Collection. Online shopping in Pakistan for fashion, mobiles &amp; tablets, electronics, home &amp; living, beauty, groceries and more, delivered nationwide with Cash on Delivery, JazzCash / Easypaisa, or bank transfer (Meezan Bank, NayaPay, SadaPay, FirstPay — HBL Microfinance Bank).</p>
          <p className="mt-3 space-y-1.5">
            <a href="https://wa.me/923236016684" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-gray-600 hover:text-lux-burnt">
              <MessageCircle size={15} className="text-[#059669]" /> WhatsApp: +92 3236016684
            </a>
            <a href="mailto:developersbiuro@gmail.com" className="flex items-center gap-1.5 text-gray-600 hover:text-lux-burnt">
              <Mail size={15} className="text-[#059669]" /> developersbiuro@gmail.com
            </a>
          </p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] mb-3">Shop by Category</p>
          {CATEGORIES.map((c) => (
            <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} className="block text-gray-600 hover:text-lux-burnt py-0.5">{c}</Link>
          ))}
        </div>
        <div>
          <p className="eyebrow !text-[10px] mb-3">Customer Care &amp; Tracking</p>
          <Link to="/orders" className="block text-gray-600 hover:text-lux-burnt py-0.5">Track Your Order</Link>
          <Link to="/terms" className="block text-gray-600 hover:text-lux-burnt py-0.5">Terms of Service</Link>
          <Link to="/policy" className="block text-gray-600 hover:text-lux-burnt py-0.5">Privacy Policy</Link>
          <Link to="/shop" className="block text-gray-600 hover:text-lux-burnt py-0.5">All Products</Link>
          <p className="text-gray-500 mt-3 leading-relaxed">Damaged or wrong item? Message us on WhatsApp within 7 days of delivery and we will make it right.</p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] mb-3">Courier Partners</p>
          <p className="text-gray-500 leading-relaxed">Orders are dispatched nationwide through Pakistan&apos;s trusted courier networks:</p>
          <p className="mt-3 flex flex-wrap gap-1.5">
            {COURIERS.map((c) => (
              <span key={c} className="bg-white border border-cream-line rounded-full px-3 py-1 text-xs font-medium text-gray-600">{c}</span>
            ))}
          </p>
          <p className="text-gray-500 mt-3">Standard delivery Rs. 199 · <span className="text-[#059669] font-medium">FREE over Rs. 5,000</span></p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] mb-3">Payments</p>
          <p className="text-gray-600 py-0.5">Cash on Delivery (COD)</p>
          <p className="text-gray-600 py-0.5">JazzCash — Muhammad Abdullah · 0303 6253428</p>
          <p className="text-gray-600 py-0.5">Meezan Bank — Muhammad Abdullah · 04820113003065</p>
          <p className="text-gray-600 py-0.5">Easypaisa — Muhammad Abdullah · 0303 6253428</p>
        </div>
      </div>
      <div className="border-t border-cream-line">
        <div className="max-w-7xl mx-auto px-3 py-3.5 flex flex-col md:flex-row items-center justify-between gap-1.5 text-xs text-gray-400 text-center">
          <span>© {new Date().getFullYear()} MALAC (M.A Luxury Apparel Collection). All Rights Reserved.</span>
          <span>
            <Link to="/terms" className="hover:text-lux-burnt">Terms of Service</Link>
            <span className="mx-1.5">·</span>
            <Link to="/policy" className="hover:text-lux-burnt">Privacy Policy</Link>
          </span>
          <span>{CITIES.join(" · ")}</span>
        </div>
      </div>
      {/* Get the app — PWA install strip (last block of the footer) */}
      <div className="border-t border-cream-line">
        <div className="max-w-7xl mx-auto px-3 py-5 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 text-center">
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <Smartphone size={17} className="text-lux-burnt shrink-0" />
            Get the MALAC app — install it on your phone for faster shopping.
          </p>
          <InstallAppButton />
        </div>
      </div>
    </footer>
  );
}
