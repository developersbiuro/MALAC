import { Star } from "lucide-react";

export default function RatingStars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          className={i <= Math.round(value) ? "fill-lux-gold text-lux-gold" : "text-gray-300"} />
      ))}
    </span>
  );
}
