import { Link } from "react-router-dom";
import { ArrowRight, Mouse } from "lucide-react";
import { DESIGN_HERO } from "../assets/design.js";

// Design-1 hero, BUILT as a real design (Abdullah, 2026-11-17): real text,
// real button, real layout matching his reference 1:1 — eyebrow, two-line
// headline, subtext, EXPLORE COLLECTION, SCROLL DOWN — over the photo.
// Fully responsive: the photo covers, the text scales, nothing is a
// pasted picture.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607] overflow-hidden">
      <img
        src={DESIGN_HERO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[78%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
      <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 min-h-[480px] sm:min-h-[560px] lg:min-h-[600px] flex flex-col justify-center py-16">
        <div className="max-w-[840px]">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.42em] text-neutral-300 uppercase fade-up">
            Premium Lifestyle Store
          </p>
          <h1
            className="font-sans text-[38px] sm:text-6xl lg:text-[68px] font-extrabold leading-[1.05] tracking-tight text-white mt-4 fade-up"
            style={{ animationDelay: "70ms" }}
          >
            MORE THAN STYLE.
            <br />
            IT'S YOUR IDENTITY.
          </h1>
          <p
            className="text-sm sm:text-base text-neutral-300 leading-relaxed mt-5 max-w-md fade-up"
            style={{ animationDelay: "140ms" }}
          >
            Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.
          </p>
          <div className="mt-8 fade-up" style={{ animationDelay: "210ms" }}>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-neutral-50 text-neutral-950 text-xs font-bold tracking-[0.14em] px-7 py-[15px] rounded-[3px] hover:bg-white transition"
            >
              EXPLORE COLLECTION <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="absolute bottom-6 left-5 sm:left-8 flex items-start gap-2.5">
          <span className="flex flex-col items-center gap-1.5">
            <Mouse size={16} className="text-white/60" />
            <span className="w-px h-9 bg-white/35" />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.3em] text-white/60 uppercase pt-0.5">Scroll Down</span>
        </div>
      </div>
    </section>
  );
}
