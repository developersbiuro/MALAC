import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  { eyebrow: "M.A Luxury Apparel Collection", pre: "The Art of ", italic: "Luxury Living", sub: "Fashion, mobiles, electronics & more — premium picks delivered nationwide with Cash on Delivery.", img: "https://picsum.photos/seed/malac-hero1/1400/420", to: "/shop", cta: "Shop the Collection" },
  { eyebrow: "Flash Deals & Exclusive Offers", pre: "Unmissable ", italic: "Deals", sub: "Handpicked offers at extraordinary prices — limited stock, refreshed daily.", img: "https://picsum.photos/seed/malac-hero2/1400/420", to: "/shop?flash=1", cta: "Shop Flash Sale" },
  { eyebrow: "Just Landed", pre: "New ", italic: "Arrivals", sub: "Fresh styles and the latest gadgets, added every week.", img: "https://picsum.photos/seed/malac-hero3/1400/420", to: "/shop", cta: "Explore New In" },
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState(null);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);
  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);
  const slide = slides[idx];
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setTouchX(null); } }}>
      <Link to={slide.to}>
        <img src={slide.img} alt={`${slide.pre}${slide.italic}`} className="w-full h-[210px] sm:h-[300px] lg:h-[380px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-lux-deep/75 via-lux-deep/35 to-transparent flex flex-col justify-center px-5 sm:px-12">
          <p className="eyebrow !text-lux-pale">{slide.eyebrow}</p>
          <p className="font-display text-white text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mt-2 max-w-xl">
            {slide.pre}<span className="font-serif italic font-semibold normal-case tracking-normal">{slide.italic}</span>
          </p>
          <p className="text-white/85 text-xs sm:text-base mt-2.5 max-w-md">{slide.sub}</p>
          <span className="btn-lux mt-4 px-6 py-2.5 text-xs sm:text-sm w-max">{slide.cta}</span>
        </div>
      </Link>
      <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-2 sm:p-1.5"><ChevronLeft size={18} /></button>
      <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-2 sm:p-1.5"><ChevronRight size={18} /></button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full ${i === idx ? "w-5 bg-lux-gold" : "w-1.5 bg-white/50"}`} />)}
      </div>
    </div>
  );
}
