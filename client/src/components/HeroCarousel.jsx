import { Link } from "react-router-dom";
import { ArrowRight, Mouse } from "lucide-react";
import { DESIGN_HERO } from "../assets/design.js";

// Design-1 hero (Abdullah, 2026-11-17): the background photo is the clean
// one HE supplied (his model, his wall emblem, dark space on the left).
// The design itself is BUILT over it: real headline, real subtext, a real
// working EXPLORE COLLECTION button and SCROLL DOWN, sized to his pixel
// spec — nothing is a pasted picture.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607] overflow-hidden">
      <img
        src={DESIGN_HERO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[78%_62%] lg:object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
      <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-[60px] min-h-[480px] sm:min-h-[540px] lg:min-h-[600px] flex flex-col justify-end pb-24 pt-[186px] sm:justify-center sm:pt-[138px] sm:pb-16 lg:pt-[120px]">
        <div className="max-w-[840px]">
          <p className="text-[13px] font-semibold tracking-[0.46em] text-[#A3A3A3] uppercase fade-up">
            Premium Lifestyle Store
          </p>
          <h1
            className="font-sans text-[38px] sm:text-6xl lg:text-[52px] font-extrabold leading-[1.1] tracking-tight text-white mt-4 fade-up"
            style={{ animationDelay: "70ms" }}
          >
            MORE THAN STYLE.
            <br />
            <span className="text-[#9E9E9E]">IT'S YOUR IDENTITY.</span>
          </h1>
          <p
            className="text-base text-[#CCCCCC] leading-[1.5] mt-5 max-w-[460px] fade-up"
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
        <div className="absolute bottom-6 left-5 sm:left-8 lg:left-[60px] hidden sm:flex items-start gap-2.5">
          <span className="flex flex-col items-center gap-1.5">
            <Mouse size={16} className="text-[#999]" />
            <span className="w-px h-9 bg-white/35" />
          </span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-[#999] uppercase pt-0.5">Scroll Down</span>
        </div>
      </div>
    </section>
  );
}
