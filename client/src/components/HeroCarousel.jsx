import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Hero slider photos: real, store-matching imagery (verified external URLs,
// same durable route as the product photos — picsum placeholders retired
// 2026-11-08 because they showed random unrelated pictures). Provenance for
// each URL is recorded in ~/workspace/malac-hero-images.json.
const slides = [
  { eyebrow: "M.A Luxury Apparel Collection", pre: "The Art of ", italic: "Luxury Living", sub: "Fashion, mobiles, electronics & more — premium picks delivered nationwide with Cash on Delivery.", img: "https://morshopfitting.com/wp-content/uploads/2025/10/Retail-Store-Clothing-Display-Racks-with-Lighting-Morshopfitting-4.webp", to: "/shop", cta: "Shop the Collection" },
  { eyebrow: "Flash Deals & Exclusive Offers", pre: "Unmissable ", italic: "Deals", sub: "Handpicked offers at extraordinary prices — limited stock, refreshed daily.", img: "https://preproduction.rungisinternational.com/_next/image?url=https%3A%2F%2Fpreproduction-cms.rungisinternational.com%2Fuploads%2FAdobe_Stock_1990407175_2b1283fa7a.jpeg&w=2048&q=75", to: "/shop?flash=1", cta: "Shop Flash Sale" },
  { eyebrow: "Just Landed", pre: "New ", italic: "Arrivals", sub: "Fresh styles and the latest gadgets, added every week.", img: "https://www.dailydroppk.com/cdn/shop/collections/modern-minimal-electronics-accessories-shopify-collection-banner-premium-smartphones-headphones-smartwatches-chargers-and-tech-accessories-arranged-across-full-frame-on-dark-marble-su.png?v=1782407336&width=800", to: "/shop", cta: "Explore New In" },
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
    <div className="relative rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setTouchX(null); } }}>
      <Link to={slide.to}>
        {/* Photo layer: keyed by slide so the zoom + fade restart per slide;
            all slides are mounted and cross-faded for a smooth transition. */}
        <div className="relative w-full h-[210px] sm:h-[300px] lg:h-[380px] bg-lux-deep">
          {slides.map((s, i) => (
            <img key={s.img} src={s.img} alt="" aria-hidden={i !== idx} loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100 hero-zoom" : "opacity-0"}`} />
          ))}
        </div>
        {/* Cinematic overlay: deep ink-navy from the left for the text, a
            gentle bottom vignette, and a hairline gold rule at the base. */}
        <div className="absolute inset-0 bg-gradient-to-r from-lux-deep/85 via-lux-deep/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-lux-deep/50 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-lux-gradient" />
        <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-12" key={idx}>
          <p className="eyebrow !text-lux-pale fade-up flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-lux-gold" />{slide.eyebrow}
          </p>
          <h1 className="font-display text-white text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mt-2 max-w-xl fade-up" style={{ animationDelay: "70ms" }}>
            {slide.pre}<span className="font-serif italic font-semibold normal-case tracking-normal">{slide.italic}</span>
          </h1>
          <p className="text-white/85 text-xs sm:text-base mt-2.5 max-w-md fade-up" style={{ animationDelay: "140ms" }}>{slide.sub}</p>
          <span className="btn-lux mt-4 px-6 py-2.5 text-xs sm:text-sm w-max fade-up" style={{ animationDelay: "210ms" }}>{slide.cta}</span>
        </div>
      </Link>
      <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-2 sm:p-1.5"><ChevronLeft size={18} /></button>
      <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-2 sm:p-1.5"><ChevronRight size={18} /></button>
      {/* Pagination pills — buttons (not nested in the Link) so a tap jumps
          straight to a slide; the active pill fills with a progress bar
          synced to the autoplay timer. */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((s, i) => (
          <button key={s.img} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
            className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 ${i === idx ? "w-7 bg-white/30" : "w-1.5 bg-white/50"}`}>
            {i === idx && !paused && <span key={idx} className="hero-progress absolute inset-0 bg-lux-gold rounded-full" />}
            {i === idx && paused && <span className="absolute inset-0 bg-lux-gold rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  );
}
