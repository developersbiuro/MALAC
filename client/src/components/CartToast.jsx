import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";

// Daraz-style "added" feedback: a small dark pill at the bottom with a
// shortcut to the cart PAGE. The cart opens as a page (/cart), never as
// a slide-in drawer (Abdullah's direction, 2026-11-11).
export default function CartToast() {
  const { toast, setToast } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast || location.pathname === "/cart" || location.pathname === "/checkout") return null;

  return (
    <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-50 flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2.5 bg-neutral-900 text-white text-sm rounded-full pl-3.5 pr-2 py-2 shadow-xl max-w-full">
        <CheckCircle2 size={17} className="text-green-400 shrink-0" />
        <span className="truncate">Cart me add ho gaya — {toast.text}</span>
        <button
          onClick={() => { setToast(null); navigate("/cart"); }}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-full px-3 py-1.5"
        >
          Cart dekhein
        </button>
      </div>
    </div>
  );
}
