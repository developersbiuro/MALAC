import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, RefreshCcw, Headphones } from "lucide-react";
import { DESIGN_HERO_SLIDES } from "../assets/design.js";

// Homepage hero — Abdullah's storefront reference (2026-11-16 23:55),
// same-to-same: full-width slider, standing model against the MALAC
// wall, "WEAR YOUR IDENTITY" eyebrow, giant silver MALAC headline,
// SHOP NOW button, ‹ › arrows bottom-left, 01/02/03 numbers on the
// right, and the 4-point trust band attached under the hero.
const TRUST = [
  { Icon: ShieldCheck, label: "100% Original Products" },
  { Icon: Truck, label: "Fast Delivery Across Pakistan" },
  { Icon: RefreshCcw, label: "Easy Returns & Exchange" },
  { Icon: Headphones, label: "Dedicated Support" },
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const n = DESIGN_HERO_SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);

  return (
    <section className="bg-lux-deep">
      <div className="relative overflow-hidden">
        {DESIGN_HERO_SLIDES.map((src, i) => (
          <img key={i} src={src} alt="" aria-hidden={i !== idx}
            className={`absolute inset-0 w-full h-full object-cover object-[68%_center] transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />

        <div className="relative max-w-7xl mx-auto w-full flex flex-col justify-center px-5 sm:px-8 py-14 sm:py-20 lg:py-24 min-h-[440px] sm:min-h-[520px] lg:min-h-[600px]">
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-[11px] sm:text-xs font-semibold tracking-[0.34em] text-neutral-200 uppercase fade-up">
              Wear Your Identity <span className="inline-block h-px w-12 bg-neutral-300" />
            </p>
            <h1 className="font-display text-[64px] sm:text-[92px] lg:text-[120px] font-bold leading-none mt-3 fade-up bg-silver-gradient bg-clip-text text-transparent" style={{ animationDelay: "70ms" }}>
              MALAC
            </h1>
            <p className="text-sm sm:text-lg tracking-[0.42em] text-neutral-100 uppercase mt-2 fade-up" style={{ animationDelay: "140ms" }}>
              Luxury Apparel Collection
            </p>
            <p className="text-white/75 text-sm sm:text-base mt-5 max-w-md leading-relaxed fade-up" style={{ animationDelay: "210ms" }}>
              Premium Fashion. Timeless Style.<br />Designed for the Modern You.
            </p>
            <Link to="/shop"
              className="mt-7 w-max inline-flex items-center justify-center gap-2 rounded-sm bg-neutral-100 text-neutral-900 font-semibold px-7 py-3.5 text-xs sm:text-sm tracking-[0.1em] uppercase shadow-lg fade-up" style={{ animationDelay: "280ms" }}>
              Shop Now <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Slider arrows — bottom-left, like the reference */}
          <div className="absolute bottom-6 left-5 sm:left-8 flex gap-2">
            <button type="button" aria-label="Previous slide" onClick={() => setIdx((idx - 1 + n) % n)}
              className="w-10 h-10 flex items-center justify-center border border-white/35 text-white/85 hover:bg-white hover:text-black transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Next slide" onClick={() => setIdx((idx + 1) % n)}
              className="w-10 h-10 flex items-center justify-center border border-white/35 text-white/85 hover:bg-white hover:text-black transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Slide numbers — right edge, like the reference */}
          <div className="absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-3">
            {DESIGN_HERO_SLIDES.map((_, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
                className={`text-sm tracking-widest transition-colors ${i === idx ? "text-white font-bold" : "text-white/40 hover:text-white/75"}`}>
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
      </div>

      {/* Trust band — attached under the hero (reference design) */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-3 grid grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ Icon, label }, i) => (
            <p key={label} className={`flex items-center justify-center gap-2.5 py-4 text-[12px] sm:text-[13px] font-medium text-neutral-200 ${i > 0 ? "lg:border-l lg:border-white/10" : ""}`}>
              <Icon size={21} className="text-neutral-300 shrink-0" strokeWidth={1.6} /> {label}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
