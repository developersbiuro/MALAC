import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck, MessageCircle, Facebook, Instagram, Youtube, Mail, Smartphone } from "lucide-react";
import { LOGO_SILVER } from "../assets/logoSilver.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";
import InstallAppButton from "./InstallAppButton.jsx";
import { rs } from "../utils/format.js";

// Footer — Abdullah's design 1 (2026-11-16/17): silver hairline, the
// design strip (Stay Connected · Join Our Newsletter · "Wear Your
// Identity. — MALAC —"), compact link columns and the copyright bar.
const CATEGORIES = [
  "Men's Fashion",
  "Women's Fashion",
  "Watches",
  "Eyewear",
  "Bags & Accessories",
  "Mobile Accessories",
];

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur"];

const SOCIALS = [
  { Icon: Facebook, href: "https://www.facebook.com/profile.php?id=61576352788122", label: "MALAC on Facebook" },
  { Icon: Instagram, href: "https://www.instagram.com/macollectionsofficial", label: "MALAC on Instagram" },
  { Icon: MessageCircle, href: "https://wa.me/923236016684", label: "MALAC on WhatsApp" },
  { Icon: Youtube, href: "https://www.youtube.com", label: "MALAC on YouTube" },
];

export default function Footer() {
  const { fees } = usePublicSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const subscribe = (e) => {
    e.preventDefault();
    navigate(email.trim() ? `/signup?email=${encodeURIComponent(email.trim())}` : "/signup");
  };
  return (
    <footer className="bg-[#08080a] text-neutral-400 mt-14 sm:mt-16 pb-24 md:pb-0">
      <div className="h-[3px] bg-silver-gradient" />
      {/* Design strip — Stay Connected · Newsletter · Wear Your Identity */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-7 grid gap-6 md:grid-cols-[1fr_1.2fr_1fr] md:items-center">
          <div>
            <h3 className="text-white text-[13px] font-bold tracking-[0.18em] uppercase">Stay Connected</h3>
            <p className="text-xs text-neutral-500 mt-1">Follow us for latest updates and exclusive offers.</p>
            <div className="flex gap-2 mt-3">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  className="bg-white/5 border border-white/10 rounded-full p-2.5 text-neutral-300 hover:text-white hover:border-white/40 transition">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div className="md:border-x md:border-white/10 md:px-8">
            <h3 className="text-white text-[13px] font-bold tracking-[0.18em] uppercase">Join Our Newsletter</h3>
            <p className="text-xs text-neutral-500 mt-1">Get exclusive deals and style inspiration.</p>
            <form onSubmit={subscribe} className="mt-3 flex max-w-md bg-white/5 border border-white/15 rounded-md overflow-hidden focus-within:border-neutral-400">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address"
                className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none" />
              <button className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-5 shrink-0">Subscribe</button>
            </form>
          </div>
          <div className="md:text-right">
            <p className="font-serif italic text-3xl sm:text-[34px] text-neutral-100 leading-tight">Wear Your Identity.</p>
            <p className="text-[11px] tracking-[0.3em] text-neutral-500 mt-1.5">— MALAC —</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-3 pt-8 pb-5 grid grid-cols-2 md:grid-cols-3 gap-6 text-[13px]">
        <div>
          <img src={LOGO_SILVER} alt="MALAC — M.A Luxury Apparel Collection" className="h-16 w-auto" />
          <p className="mt-3 leading-relaxed text-neutral-500">Premium fashion, watches and accessories — designed for the modern you, delivered all over Pakistan.</p>
          <p className="mt-3 flex items-start gap-1.5"><Truck size={14} className="mt-0.5 shrink-0 text-neutral-400" /> Standard delivery {rs(fees.standard)} — FREE on orders over {rs(fees.freeThreshold)}. TCS · Leopards · Trax · PostEx.</p>
          <p className="mt-2 flex items-center gap-1.5"><Mail size={14} className="shrink-0 text-neutral-400" /> info@malac.pp.ua</p>
          <p className="mt-1.5 flex items-center gap-1.5"><MessageCircle size={14} className="shrink-0 text-neutral-400" /> WhatsApp 0323 6016684</p>
        </div>
        <nav>
          <h3 className="font-display text-white text-base font-bold mb-2.5 tracking-wide">SHOP BY CATEGORY</h3>
          <ul className="space-y-1.5">
            {CATEGORIES.map((c) => (
              <li key={c}><Link to={`/category/${encodeURIComponent(c)}`} className="hover:text-white">{c}</Link></li>
            ))}
            <li><Link to="/shop" className="hover:text-white">All Products</Link></li>
          </ul>
        </nav>
        <nav>
          <h3 className="font-display text-white text-base font-bold mb-2.5 tracking-wide">CUSTOMER CARE</h3>
          <ul className="space-y-1.5">
            <li><Link to="/track-order" className="hover:text-white">Track Your Order</Link></li>
            <li><Link to="/about" className="hover:text-white">About MALAC</Link></li>
            <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link to="/faq" className="hover:text-white">FAQs</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            <li><Link to="/policy" className="hover:text-white">Privacy &amp; Refund Policy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col sm:flex-row justify-between gap-1 text-xs text-neutral-500">
          <span>© {new Date().getFullYear()} MALAC (M.A Luxury Apparel Collection). All Rights Reserved.</span>
          <span className="hidden xl:inline">Delivering to: {CITIES.join(" · ")} &amp; all over Pakistan</span>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-neutral-300"><Smartphone size={16} className="text-neutral-400" /> Get the MALAC app — faster shopping, order tracking &amp; app-only deals.</p>
          <InstallAppButton />
        </div>
      </div>
    </footer>
  );
}
