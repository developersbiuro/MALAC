import { Link } from "react-router-dom";
import { useSeo } from "../utils/seo.js";

// Catch-all page for unknown storefront URLs (App.jsx route "*").
// Deliberately styled like a normal store page — cream theme, ink-navy
// heading, gradient CTA — instead of silently bouncing visitors home:
// a mistyped or stale link should say so and offer the way back.
export default function NotFound() {
  useSeo({
    title: "Page Not Found — MALAC",
    description: "The page you are looking for does not exist on MALAC. Browse the shop, track your order, or return home.",
    robots: "noindex",
  });
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
      <p className="eyebrow">404 — Not Found</p>
      <h1 className="font-display text-3xl sm:text-5xl font-bold mt-3">Yeh page mojood nahi hai</h1>
      <p className="text-gray-500 mt-4 max-w-md mx-auto">
        The page you are looking for may have been moved or the link may be incorrect.
        Aap neeche se wapas shopping shuru kar sakte hain.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-lux px-6 py-2.5 text-sm">Go to Home</Link>
        <Link to="/shop" className="px-6 py-2.5 text-sm font-semibold rounded-full border border-cream-line bg-white hover:border-lux-burnt transition">Browse the Shop</Link>
        <Link to="/track-order" className="px-6 py-2.5 text-sm font-semibold rounded-full border border-cream-line bg-white hover:border-lux-burnt transition">Track Your Order</Link>
      </div>
    </main>
  );
}
