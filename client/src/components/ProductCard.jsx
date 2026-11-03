import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import RatingStars from "./RatingStars.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { rs, discountPct, priceOf } from "../utils/format.js";

export default function ProductCard({ product }) {
  const { toggle, has } = useWishlist();
  const pct = discountPct(product);
  return (
    <Link to={`/product/${product.slug}`}
      className="group relative block bg-white rounded-md overflow-hidden hover:shadow-lg transition-shadow fade-up">
      <div className="relative aspect-square overflow-hidden">
        <img src={product.images?.[0]} alt={product.title} loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {pct > 0 && <span className="absolute top-2 left-2 bg-brand text-white text-xs font-semibold px-1.5 py-0.5 rounded">-{pct}%</span>}
        <button aria-label="Toggle wishlist"
          onClick={(e) => { e.preventDefault(); toggle(product); }}
          className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow">
          <Heart size={16} className={has(product._id) ? "fill-red-500 text-red-500" : "text-gray-500"} />
        </button>
      </div>
      <div className="p-2.5">
        <p className="text-[13px] leading-snug line-clamp-2 min-h-[34px]">{product.title}</p>
        <p className="text-brand font-semibold mt-1">{rs(priceOf(product))}</p>
        {product.salePrice > 0 && <p className="text-xs text-gray-400 line-through">{rs(product.basePrice)}</p>}
        <div className="flex items-center gap-1 mt-1">
          <RatingStars value={product.ratingAvg || 0} />
          <span className="text-[11px] text-gray-400">({product.ratingCount || 0}) · {product.sold || 0} sold</span>
        </div>
        {product.stock <= 5 && product.stock > 0 &&
          <p className="text-[11px] text-red-500 mt-1">Only {product.stock} left</p>}
        {product.stock === 0 && <p className="text-[11px] text-gray-400 mt-1">Out of stock</p>}
      </div>
    </Link>
  );
}
