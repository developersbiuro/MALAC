import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import CartPage from "./pages/CartPage.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

import AdminLogin from "./pages/admin/AdminLogin.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminProductForm from "./pages/admin/AdminProductForm.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminCoupons from "./pages/admin/AdminCoupons.jsx";
import AdminRoles from "./pages/admin/AdminRoles.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

// Guard for the whole admin suite. Visiting /admin (or any /admin/* page)
// while not signed in as staff shows the dedicated Admin Login screen at
// the same URL — customers are denied even if they log in there.
function AdminShell() {
  const { user, loading, isStaff } = useAuth();
  if (loading) return <p className="p-8 text-center text-gray-400">Loading...</p>;
  if (!user || !isStaff) return <AdminLogin />;
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <Header />}
      {!isAdmin && <CartDrawer />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/cart" element={<CartPage />} />
        {/* Checkout + orders require login (no guest ordering) */}
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/*" element={<AdminShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && <MobileBottomNav />}
    </>
  );
}
