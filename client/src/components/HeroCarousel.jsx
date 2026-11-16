import { Link } from "react-router-dom";
import { Mouse } from "lucide-react";
import { DESIGN_HERO } from "../assets/design.js";

// Homepage hero — Abdullah's final reference design (2026-11-16 night):
// one cinematic black/silver frame, the model + silver MALAC emblem
// baked into the photo, headline set in Cinzel on the dark left.
// "MORE THAN STYLE. IT'S YOUR IDENTITY." — his design's words, kept.
export default function HeroCarousel() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lux ring-1 ring-black/40 bg-lux-deep">
      <img src={DESIGN_HERO} alt="MALAC — premium fashion, watches and accessories in black and silver"
        className="absolute inset-0 w-full h-full object-cover object-[70%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
      <div className="relative flex flex-col justify-center px-5 sm:px-12 py-14 sm:py-20 lg:py-24 min-h-[380px] sm:min-h-[440px] lg:min-h-[500px] max-w-2xl">
        <p className="eyebrow !text-neutral-300 flex items-center gap-3 fade-up">
          <span className="inline-block h-px w-10 bg-neutral-300" />Premium Lifestyle Store
        </p>
        <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-[64px] font-bold leading-[1.04] mt-3 fade-up" style={{ animationDelay: "70ms" }}>
          MORE THAN STYLE.<br />IT&apos;S YOUR IDENTITY.
        </h1>
        <p className="text-white/75 text-sm sm:text-base mt-4 max-w-md fade-up" style={{ animationDelay: "140ms" }}>
          Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.
        </p>
        <Link to="/shop"
          className="mt-6 w-max inline-flex items-center justify-center gap-2 rounded-md bg-neutral-100 text-neutral-900 font-semibold px-6 py-3 text-xs sm:text-sm tracking-[0.08em] uppercase shadow-lg fade-up" style={{ animationDelay: "210ms" }}>
          Explore Collection <span aria-hidden>→</span>
        </Link>
        <p className="mt-10 hidden sm:flex items-center gap-2 text-[10px] tracking-[0.3em] text-neutral-400 uppercase fade-up" style={{ animationDelay: "280ms" }}>
          <Mouse size={16} className="animate-bounce" /> Scroll Down
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
    </div>
  );
}
