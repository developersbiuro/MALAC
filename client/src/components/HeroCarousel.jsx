import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  { title: "Big Sale Days", sub: "Up to 70% off mobiles, fashion & more", img: "https://picsum.photos/seed/malac-hero1/1400/420", to: "/shop?flash=1" },
  { title: "Flash Sale", sub: "New deals every day - limited stock", img: "https://picsum.photos/seed/malac-hero2/1400/420", to: "/shop?flash=1" },
  { title: "New Arrivals", sub: "Fresh styles for the season", img: "https://picsum.photos/seed/malac-hero3/1400/420", to: "/shop" },
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState(null);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);
  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);
  return (
    <div className="relative rounded-md overflow-hidden"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setTouchX(null); } }}>
      <Link to={slides[idx].to}>
        <img src={slides[idx].img} alt={slides[idx].title} className="w-full h-[160px] sm:h-[240px] lg:h-[320px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-5 sm:px-10">
          <p className="text-white text-xl sm:text-4xl font-extrabold">{slides[idx].title}</p>
          <p className="text-white/85 text-xs sm:text-base mt-1">{slides[idx].sub}</p>
          <span className="mt-3 bg-brand text-white text-xs sm:text-sm font-medium px-4 py-2 rounded w-max">Shop Now</span>
        </div>
      </Link>
      <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"><ChevronLeft size={18} /></button>
      <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"><ChevronRight size={18} /></button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />)}
      </div>
    </div>
  );
}
