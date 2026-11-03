import { useWishlist } from "../context/WishlistContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function WishlistPage() {
  const { items } = useWishlist();
  return (
    <main className="max-w-7xl mx-auto px-3 pt-4">
      <h1 className="font-bold text-xl mb-3">My Wishlist ({items.length})</h1>
      {items.length === 0
        ? <p className="bg-white rounded-md p-8 text-center text-gray-400">Nothing saved yet. Tap the heart on any product.</p>
        : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{items.map((p) => <ProductCard key={p._id} product={p} />)}</div>}
    </main>
  );
}
