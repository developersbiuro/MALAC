import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DESIGN_HERO } from "../assets/design.js";

// Design-1 hero (Abdullah, 2026-11-17): his own reference design image used
// AS-IS — "bilkul isi design ko copy paste kro". On desktop the headline,
// subtext, EXPLORE COLLECTION button and SCROLL DOWN are all part of the
// image; an invisible link over the button keeps it functional. On phones
// the wide image cannot fit, so the photo frames the model + emblem and
// the same text is overlaid for real.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607] overflow-hidden">
      <div className="relative min-h-[440px] sm:min-h-[520px] lg:min-h-[560px]">
        <img
          src={DESIGN_HERO}
          alt="MALAC — Premium Lifestyle Store. More than style. It's your identity."
          className="absolute inset-0 w-full h-full object-cover object-[85%_center] lg:object-center"
        />
        {/* Desktop: invisible link over the button baked into the image */}
        <Link
          to="/shop"
          aria-label="Explore Collection — shop all products"
          className="hidden lg:block absolute left-[3.2%] top-[72%] w-[19%] h-[13%] rounded-sm"
        />
        {/* Mobile / tablet: real text over the framed photo */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10">
          <div className="absolute inset-x-0 bottom-0 max-w-xl px-5 sm:px-8 pb-8">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.42em] text-neutral-300 uppercase">
              Premium Lifestyle Store
            </p>
            <h1 className="font-sans text-[34px] sm:text-5xl font-extrabold leading-[1.06] tracking-tight text-white mt-3">
              MORE THAN STYLE.
              <br />
              IT'S YOUR IDENTITY.
            </h1>
            <p className="hidden sm:block text-sm text-neutral-300 leading-relaxed mt-3 max-w-md">
              Discover premium fashion, accessories and lifestyle essentials crafted for the modern you.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 mt-5 bg-neutral-50 text-neutral-950 text-xs font-bold tracking-[0.14em] px-6 py-3.5 rounded-sm hover:bg-white transition"
            >
              EXPLORE COLLECTION <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
