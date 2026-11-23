import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DESIGN_HERO, DESIGN_HERO_MOBILE } from "../assets/design.js";

// Design-1 hero (Abdullah, 2026-11-17): the background photo is the clean
// one HE supplied (his model, his wall emblem, dark space on the left).
// The design itself is BUILT over it: real headline, real subtext, a real
// working EXPLORE COLLECTION button and SCROLL DOWN, sized to his pixel
// spec — nothing is a pasted picture.
//
// Mobile (Abdullah, 2026-11-17): the wide photo must NOT zoom/crop on a
// phone — it shows in full at its natural aspect under the header, and
// the headline block sits below it on black. sm+ keeps the full-bleed
// overlay design exactly as settled.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607] overflow-hidden pt-[190px] sm:pt-0">
      {/* Mobile: poori photo, koi zoom nahi */}
      <img
        src={DESIGN_HERO_MOBILE}
        alt=""
        aria-hidden="true"
        width={828}
        height={323}
        fetchpriority="high"
        className="block w-full h-auto sm:hidden"
      />
      <div className="h-10 -mt-10 relative bg-gradient-to-t from-[#060607] to-transparent sm:hidden" />
      {/* sm+: full-bleed background photo */}
      <img
        src={DESIGN_HERO}
        alt=""
        aria-hidden="true"
        width={1920}
        height={749}
        loading="lazy"
        className="hidden sm:block absolute inset-0 w-full h-full object-cover object-[78%_62%] lg:object-center"
      />
      <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
      <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-[60px] pt-2 pb-10 sm:pt-[138px] sm:pb-16 lg:pt-[120px] sm:min-h-[540px] lg:min-h-[600px] flex flex-col sm:justify-center">
        <div className="max-w-[840px]">
          <p className="text-[11px] sm:text-[13px] font-semibold tracking-[0.46em] text-[#A3A3A3] uppercase fade-up">
            Premium Lifestyle Store
          </p>
          <h1
            className="font-sans text-[32px] sm:text-5xl lg:text-[52px] font-extrabold leading-[1.1] tracking-tight text-white mt-4 fade-up"
            style={{ animationDelay: "70ms" }}
          >
            MORE THAN STYLE.
            <br />
            <span className="text-[#9E9E9E]">IT'S YOUR IDENTITY.</span>
          </h1>
          <p
            className="text-sm sm:text-base text-[#CCCCCC] leading-[1.5] mt-5 max-w-[460px] fade-up"
            style={{ animationDelay: "140ms" }}
          >
            Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.
          </p>
          <div className="mt-8 fade-up" style={{ animationDelay: "210ms" }}>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#D6D6D6] text-[#0A0A0A] text-[13px] font-bold tracking-[0.14em] px-7 py-3.5 rounded hover:bg-white transition"
            >
              EXPLORE COLLECTION <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label="Scroll down"
          onClick={() => window.scrollBy({ top: window.innerHeight - 140, behavior: "smooth" })}
          className="relative mt-10 flex items-start gap-2.5 animate-scroll-bob cursor-pointer sm:hidden lg:flex lg:absolute lg:mt-0 lg:bottom-6 lg:left-[60px]"
        >
          <span className="flex flex-col items-center gap-1.5">
            <span className="block w-[18px] h-[28px] rounded-full border-[1.5px] border-[#999] relative">
              <span className="absolute left-1/2 -translate-x-1/2 top-[5px] w-[3px] h-[6px] rounded-full bg-[#D6D6D6] animate-scroll-wheel" />
            </span>
            <span className="w-px h-9 bg-white/35 animate-scroll-line" />
          </span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-[#999] uppercase pt-1.5">Scroll Down</span>
        </button>
      </div>
    </section>
  );
}
