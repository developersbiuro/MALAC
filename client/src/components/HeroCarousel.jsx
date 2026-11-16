import { Link } from "react-router-dom";
import { Mouse } from "lucide-react";
import { DESIGN_HERO } from "../assets/design.js";

// Homepage hero — Abdullah's design 1 (2026-11-17 prompt): full-width
// seated-model campaign photo, "PREMIUM LIFESTYLE STORE" eyebrow,
// "MORE THAN STYLE. IT'S YOUR IDENTITY." headline, EXPLORE COLLECTION
// button and the SCROLL DOWN indicator at the bottom-left.
export default function HeroCarousel() {
  return (
    <section className="relative bg-lux-deep overflow-hidden">
      <img src={DESIGN_HERO} alt="MALAC — premium lifestyle store" className="absolute inset-0 w-full h-full object-cover object-[70%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
      <div className="relative max-w-7xl mx-auto w-full flex flex-col justify-center px-5 sm:px-8 py-16 sm:py-24 lg:py-28 min-h-[480px] sm:min-h-[560px] lg:min-h-[640px]">
        <div className="max-w-2xl">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.38em] text-neutral-300 uppercase fade-up">
            Premium Lifestyle Store
          </p>
          <h1 className="font-sans text-[42px] sm:text-6xl lg:text-[76px] font-extrabold leading-[1.04] tracking-tight text-white mt-4 fade-up" style={{ animationDelay: "70ms" }}>
            MORE THAN STYLE.<br />IT&apos;S YOUR IDENTITY.
          </h1>
          <p className="text-white/75 text-sm sm:text-base mt-5 max-w-md leading-relaxed fade-up" style={{ animationDelay: "140ms" }}>
            Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.
          </p>
          <Link to="/shop"
            className="mt-7 w-max inline-flex items-center justify-center gap-2 rounded-sm bg-neutral-100 text-neutral-900 font-semibold px-7 py-3.5 text-xs sm:text-sm tracking-[0.08em] uppercase shadow-lg fade-up" style={{ animationDelay: "210ms" }}>
            Explore Collection <span aria-hidden>→</span>
          </Link>
        </div>
        <p className="absolute bottom-6 left-5 sm:left-8 flex items-center gap-2 text-[10px] font-semibold tracking-[0.3em] text-white/60 uppercase">
          <Mouse size={16} /> Scroll Down
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
    </section>
  );
}
