import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_MODEL, HERO_SILK, HERO_ACCESSORIES } from "../assets/hero.js";

// Silver-theme hero (Abdullah's reference design, 2026-11-16): black /
// silver luxury photography with the headline set in Cinzel on the dark
// left of the frame — slide 1 mirrors his "Wear Your Identity — MALAC"
// reference. Photos are the generated black/silver set in assets/hero.js
// (embedded data URIs, durable like the product photos route).
const slides = [
  { eyebrow: "Wear Your Identity", title: "MALAC", italic: "Luxury Apparel Collection", sub: "Premium fashion, timeless style — designed for the modern you, delivered nationwide with Cash on Delivery.", img: HERO_MODEL, to: "/shop", cta: "Shop Now" },
  { eyebrow: "Premium Collection", title: "NEW", italic: "Arrivals", sub: "Step into luxury — redefine your style with the season's freshest drops.", img: HERO_SILK, to: "/shop", cta: "Explore Collection" },
  { eyebrow: "Flash Deals & Exclusive Offers", title: "TIMELESS", italic: "Accessories", sub: "Watches, eyewear and leather goods — handpicked offers at extraordinary prices, refreshed daily.", img: HERO_ACCESSORIES, to: "/shop?flash=1", cta: "Shop Flash Sale" },
];

const AUTOPLAY_MS = 5000;

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchX, setTouchX] = useState(null);
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);
  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);
  const slide = slides[idx];
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lux ring-1 ring-black/40"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setTouchX(null); } }}>
      <Link to={slide.to}>
        {/* Photo layer: keyed by slide so the zoom + fade restart per slide;
            all slides are mounted and cross-faded for a smooth transition. */}
        <div className="relative w-full h-[240px] sm:h-[320px] lg:h-[400px] bg-lux-deep">
          {slides.map((s, i) => (
            <img key={s.img.slice(0, 40)} src={s.img} alt="" aria-hidden={i !== idx} loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100 hero-zoom" : "opacity-0"}`} />
          ))}
        </div>
        {/* Cinematic overlay: near-black from the left for the text, a
            gentle bottom vignette, and a hairline silver rule at the base. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-silver-gradient" />
        <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-12" key={idx}>
          <p className="eyebrow !text-neutral-300 fade-up flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-neutral-300" />{slide.eyebrow}
          </p>
          <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl font-bold leading-none mt-2.5 max-w-xl fade-up" style={{ animationDelay: "70ms" }}>
            {slide.title}
          </h1>
          <p className="font-serif italic text-neutral-200 text-xl sm:text-2xl lg:text-[28px] leading-snug mt-1.5 fade-up" style={{ animationDelay: "120ms" }}>{slide.italic}</p>
          <p className="text-white/75 text-xs sm:text-base mt-3 max-w-md fade-up" style={{ animationDelay: "170ms" }}>{slide.sub}</p>
          <span className="mt-5 w-max inline-flex items-center justify-center gap-2 rounded-full bg-white text-neutral-900 font-semibold px-6 py-2.5 text-xs sm:text-sm shadow-lg fade-up" style={{ animationDelay: "220ms" }}>{slide.cta} →</span>
        </div>
      </Link>
      <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/25 rounded-full p-2 sm:p-1.5"><ChevronLeft size={18} /></button>
      <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/25 rounded-full p-2 sm:p-1.5"><ChevronRight size={18} /></button>
      {/* Pagination pills — buttons (not nested in the Link) so a tap jumps
          straight to a slide; the active pill fills with a progress bar
          synced to the autoplay timer. */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((s, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
            className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 ${i === idx ? "w-7 bg-white/30" : "w-1.5 bg-white/50"}`}>
            {i === idx && !paused && <span key={idx} className="hero-progress absolute inset-0 bg-neutral-100 rounded-full" />}
            {i === idx && paused && <span className="absolute inset-0 bg-neutral-100 rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  );
}
