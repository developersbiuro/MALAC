import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Mail, Smartphone, Facebook, Instagram, Youtube } from "lucide-react";
import { LOGO_SILVER } from "../assets/logoSilver.js";
import InstallAppButton from "./InstallAppButton.jsx";
import { rs } from "../utils/format.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";

const COURIERS = ["TCS", "Leopards", "Trax"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Peshawar", "Faisalabad"];
// The store's category names (the six categories, 2026-11-16).
const CATEGORIES = [
  "Men's Fashion",
  "Women's Fashion",
  "Watches",
  "Eyewear",
  "Bags & Accessories",
  "Mobile Accessories",
];

export default function Footer() {
  const { fees } = usePublicSettings();
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  return (
    <footer className="bg-[#08080a] text-neutral-400 mt-14 sm:mt-16 pb-24 md:pb-0">
      <div className="h-[3px] bg-silver-gradient" />
      {/* Design strip (Abdullah's reference): Stay Connected · Newsletter · signature */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-10 grid gap-8 md:grid-cols-3 items-center">
          <div>
            <p className="eyebrow !text-[10px] !text-neutral-300">Stay Connected</p>
            <p className="text-sm text-neutral-500 mt-2">Follow us for latest updates and exclusive offers.</p>
            <p className="flex gap-2.5 mt-3.5">
              <a href="https://www.facebook.com/profile.php?id=61576352788122" target="_blank" rel="noreferrer" aria-label="MALAC on Facebook"
                className="bg-white/5 border border-white/10 rounded-full p-2.5 text-neutral-300 hover:text-white hover:border-white/40 transition"><Facebook size={16} /></a>
              <a href="https://www.instagram.com/macollectionsofficial" target="_blank" rel="noreferrer" aria-label="MALAC on Instagram"
                className="bg-white/5 border border-white/10 rounded-full p-2.5 text-neutral-300 hover:text-white hover:border-white/40 transition"><Instagram size={16} /></a>
              <a href="https://wa.me/923236016684" target="_blank" rel="noreferrer" aria-label="MALAC on WhatsApp"
                className="bg-white/5 border border-white/10 rounded-full p-2.5 text-neutral-300 hover:text-white hover:border-white/40 transition"><MessageCircle size={16} /></a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="MALAC on YouTube"
                className="bg-white/5 border border-white/10 rounded-full p-2.5 text-neutral-300 hover:text-white hover:border-white/40 transition"><Youtube size={16} /></a>
            </p>
          </div>
          <div>
            <p className="eyebrow !text-[10px] !text-neutral-300">Join Our Newsletter</p>
            <p className="text-sm text-neutral-500 mt-2">Get exclusive deals and style inspiration.</p>
            <form className="flex mt-3.5 rounded-md overflow-hidden border border-white/15 focus-within:border-neutral-400 transition"
              onSubmit={(e) => { e.preventDefault(); navigate("/signup"); }}>
              <input type="email" required value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address" aria-label="Email address"
                className="flex-1 min-w-0 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none" />
              <button className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-5 shrink-0">Subscribe</button>
            </form>
          </div>
          <div className="md:text-right">
            <p className="font-serif italic text-3xl sm:text-4xl text-neutral-100 leading-tight">Wear Your Identity.</p>
            <p className="text-[10px] tracking-[0.35em] text-neutral-500 mt-1.5 uppercase">— MALAC —</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-3 py-12 sm:py-14 grid grid-cols-2 md:grid-cols-5 gap-10 text-sm">
        <div className="col-span-2 md:col-span-1">
          <img src={LOGO_SILVER} alt="MALAC — M.A Luxury Apparel Collection" className="h-24 w-auto" />
          <p className="text-neutral-500 mt-3 leading-relaxed">MALAC (MalacPK) — M.A Luxury Apparel Collection. Premium men&apos;s and women&apos;s fashion, watches, eyewear and bags &amp; accessories, delivered nationwide across Pakistan with Cash on Delivery, JazzCash / Easypaisa, or bank transfer (Meezan Bank, NayaPay, SadaPay, FirstPay — HBL Microfinance Bank).</p>
          <p className="mt-3 space-y-1.5">
            <a href="https://wa.me/923236016684" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-neutral-400 hover:text-white">
              <MessageCircle size={15} className="text-neutral-300" /> WhatsApp: +92 3236016684
            </a>
            <a href="mailto:info@malac.pp.ua" className="flex items-center gap-1.5 text-neutral-400 hover:text-white">
              <Mail size={15} className="text-neutral-300" /> info@malac.pp.ua
            </a>
          </p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] !text-neutral-300 mb-3">Shop by Category</p>
          {CATEGORIES.map((c) => (
            <Link key={c} to={`/category/${encodeURIComponent(c)}`} className="block text-neutral-400 hover:text-white py-0.5">{c}</Link>
          ))}
        </div>
        <div>
          <p className="eyebrow !text-[10px] !text-neutral-300 mb-3">Customer Care &amp; Tracking</p>
          <Link to="/orders" className="block text-neutral-400 hover:text-white py-0.5">Track Your Order</Link>
          <Link to="/about" className="block text-neutral-400 hover:text-white py-0.5">About MALAC</Link>
          <Link to="/blog" className="block text-neutral-400 hover:text-white py-0.5">MALAC Blog</Link>
          <Link to="/faq" className="block text-neutral-400 hover:text-white py-0.5">FAQs</Link>
          <Link to="/terms" className="block text-neutral-400 hover:text-white py-0.5">Terms of Service</Link>
          <Link to="/policy" className="block text-neutral-400 hover:text-white py-0.5">Privacy Policy</Link>
          <Link to="/shop" className="block text-neutral-400 hover:text-white py-0.5">All Products</Link>
          <p className="text-neutral-500 mt-3 leading-relaxed">Damaged or wrong item? Message us on WhatsApp within 7 days of delivery and we will make it right.</p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] !text-neutral-300 mb-3">Courier Partners</p>
          <p className="text-neutral-500 leading-relaxed">Orders are dispatched nationwide through Pakistan&apos;s trusted courier networks:</p>
          <p className="mt-3 flex flex-wrap gap-1.5">
            {COURIERS.map((c) => (
              <span key={c} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-neutral-300">{c}</span>
            ))}
          </p>
          <p className="text-neutral-500 mt-3">Standard delivery {rs(fees.standard)} · <span className="text-neutral-200 font-medium">FREE over {rs(fees.freeThreshold)}</span></p>
        </div>
        <div>
          <p className="eyebrow !text-[10px] !text-neutral-300 mb-3">Payments</p>
          <p className="text-neutral-400 py-0.5">Cash on Delivery (COD)</p>
          <p className="text-neutral-400 py-0.5">JazzCash — Muhammad Abdullah · 0303 6253428</p>
          <p className="text-neutral-400 py-0.5">Meezan Bank — Muhammad Abdullah · 04820113003065</p>
          <p className="text-neutral-400 py-0.5">Easypaisa — Muhammad Abdullah · 0303 6253428</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-3.5 flex flex-col md:flex-row items-center justify-between gap-1.5 text-xs text-neutral-500 text-center">
          <span>© {new Date().getFullYear()} MALAC (M.A Luxury Apparel Collection). All Rights Reserved.</span>
          <span>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <span className="mx-1.5">·</span>
            <Link to="/policy" className="hover:text-white">Privacy Policy</Link>
          </span>
          <span>{CITIES.join(" · ")}</span>
        </div>
      </div>
      {/* Get the app — PWA install strip (last block of the footer) */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-5 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 text-center">
          <p className="flex items-center gap-2 text-sm text-neutral-400">
            <Smartphone size={17} className="text-neutral-300 shrink-0" />
            Get the MALAC app — install it on your phone for faster shopping.
          </p>
          <InstallAppButton />
        </div>
      </div>
    </footer>
  );
}
