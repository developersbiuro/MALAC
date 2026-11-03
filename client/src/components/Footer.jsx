import { Link } from "react-router-dom";
import { MessageCircle, Mail } from "lucide-react";
import { LOGO_FULL } from "../assets/logo.js";

const COURIERS = ["TCS", "Leopards", "Trax"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Peshawar", "Faisalabad"];

export default function Footer() {
  return (
    <footer className="bg-cream-soft mt-12 border-t border-cream-line pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <img src={LOGO_FULL} alt="MALAC — M.A Luxury Apparel Collection" className="h-24 w-auto" />
          <p className="text-gray-500 mt-3 leading-relaxed">Online shopping in Pakistan — fashion, mobiles, electronics, groceries and more, delivered nationwide with Cash on Delivery.</p>
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
          <p className="text-gray-600 py-0.5">Easypaisa — Muhammad Abdullah · 0303 6253428</p>
          <p className="text-gray-600 py-0.5">Bank transfer / Raast on request</p>
          <Link to="/admin" className="block text-gray-600 hover:text-lux-burnt py-0.5 mt-3">Admin Login</Link>
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
    </footer>
  );
}
