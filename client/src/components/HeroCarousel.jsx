import { Link } from "react-router-dom";
import { DESIGN_HERO } from "../assets/design.js";

// Design-1 hero (Abdullah, 2026-11-17): his own reference design image used
// AS-IS — "bilkul isi design ko copy paste kro". The headline, subtext,
// EXPLORE COLLECTION button and SCROLL DOWN are part of the image; an
// invisible link over the button keeps it functional.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607] overflow-hidden">
      <div className="relative min-h-[440px] sm:min-h-[520px] lg:min-h-[560px]">
        <img
          src={DESIGN_HERO}
          alt="MALAC — Premium Lifestyle Store. More than style. It's your identity."
          className="absolute inset-0 w-full h-full object-cover object-[16%_center] lg:object-center"
        />
        <Link
          to="/shop"
          aria-label="Explore Collection — shop all products"
          className="absolute left-[3.2%] top-[72%] w-[19%] h-[13%] rounded-sm"
        />
      </div>
    </section>
  );
}
