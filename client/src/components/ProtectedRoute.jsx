import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Customer guard: browsing (home/shop/product pages) is public, but every
// function — cart, wishlist, tracking, checkout, orders — needs login
// (Abdullah, 2026-11-09).
// Unauthenticated users go to /login and return afterwards via `redirect`.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="p-6 text-center text-gray-400">Loading...</p>;
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${back}`} replace />;
  }
  return children;
}
