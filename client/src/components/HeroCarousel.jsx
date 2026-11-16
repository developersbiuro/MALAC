import { Link } from "react-router-dom";
import { DESIGN_HERO } from "../assets/design.js";

// Design-1 hero (Abdullah, 2026-11-17): his own reference design image used
// AS-IS and fully RESPONSIVE — the image scales with the screen width and
// keeps its own aspect ratio, so the complete design (headline, model,
// emblem, button) is always visible, never cropped, on phone and desktop
// alike. An invisible link over the baked-in EXPLORE COLLECTION button
// (positioned in % of the image, so it tracks at every size) keeps it
// functional.
export default function HeroCarousel() {
  return (
    <section className="relative bg-[#060607]">
      <div className="relative">
        <img
          src={DESIGN_HERO}
          alt="MALAC — Premium Lifestyle Store. More than style. It's your identity."
          className="block w-full h-auto"
        />
        <Link
          to="/shop"
          aria-label="Explore Collection — shop all products"
          className="absolute left-[3.4%] top-[73%] w-[16.5%] h-[14%] rounded-sm"
        />
      </div>
    </section>
  );
}
