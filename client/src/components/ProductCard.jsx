import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import RatingStars from "./RatingStars.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { rs, discountPct, priceOf } from "../utils/format.js";

export default function ProductCard({ product }) {
  const { toggle, has } = useWishlist();
  const { add, setDrawerOpen } = useCart();
  const pct = discountPct(product);
  const out = product.stock === 0;
  const addToCart = () => { add(product); setDrawerOpen(true); };
  return (
    <div className="group relative flex flex-col h-full bg-white rounded-xl overflow-hidden border border-cream-line hover:shadow-xl hover:-translate-y-0.5 transition fade-up">
      <div className="p-1.5 pb-0 sm:p-2 sm:pb-0">
        <div className="relative rounded-lg overflow-hidden aspect-square">
          <Link to={`/product/${product.slug}`}>
            <img src={product.images?.[0] || "/icons/icon.svg"} alt={product.category ? `${product.title} — ${product.category}` : product.title} loading="lazy"
              onError={(e) => { if (!e.currentTarget.src.endsWith("/icons/icon.svg")) e.currentTarget.src = "/icons/icon.svg"; }}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </Link>
          {pct > 0 && <span className="absolute top-1.5 left-1.5 bg-lux-gradient text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">-{pct}%</span>}
          <button aria-label="Toggle wishlist"
            onClick={() => toggle(product)}
            className="absolute top-2 right-2 bg-white rounded-full p-2 sm:p-1.5 shadow-md">
            <Heart size={16} className={has(product._id) ? "fill-red-500 text-red-500" : "text-gray-500"} />
          </button>
        </div>
      </div>
      <div className="p-2 sm:p-3 flex flex-col flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lux-burnt truncate">
          {product.category}{product.subCategory ? ` · ${product.subCategory}` : ""}
        </p>
        <Link to={`/product/${product.slug}`}
          className="font-serif font-semibold text-[15px] sm:text-[18px] leading-snug line-clamp-2 mt-0.5 hover:text-lux-burnt">
          {product.title}
        </Link>
        {(product.ratingCount || 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <RatingStars value={product.ratingAvg || 0} />
            <span className="text-[11px] text-gray-400">({product.ratingCount})</span>
          </div>
        )}
        {out
          ? <p className="text-[11px] text-gray-400 mt-1">Out of stock</p>
          : product.stock <= 5
            ? <p className="text-[11px] font-medium text-red-500 mt-1">Only {product.stock} left{product.codAvailable ? " · COD" : ""}</p>
            : <p className="text-[11px] font-medium text-[#059669] mt-1">In Stock{product.codAvailable ? " · COD" : ""}</p>}
        <div className="mt-auto pt-2">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-lux-amber font-extrabold text-[15px] sm:text-base whitespace-nowrap">{rs(priceOf(product))}</span>
            {product.salePrice > 0 && <span className="text-xs text-gray-400 line-through whitespace-nowrap">{rs(product.basePrice)}</span>}
          </p>
          <button onClick={addToCart} disabled={out} className="btn-lux w-full mt-2 py-2 min-h-[40px] text-sm">
            {out ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
