import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { isAppMode } from "./utils/appMode.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Categories from "./pages/Categories.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import CartPage from "./pages/CartPage.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import TrackOrder from "./pages/TrackOrder.jsx";
import ProfileSettings from "./pages/ProfileSettings.jsx";
import AccountHub from "./pages/AccountHub.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import NotFound from "./pages/NotFound.jsx";
import Terms from "./pages/Terms.jsx";
import About from "./pages/About.jsx";
import Policy from "./pages/Policy.jsx";

import AdminLogin from "./pages/admin/AdminLogin.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminProductForm from "./pages/admin/AdminProductForm.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminCoupons from "./pages/admin/AdminCoupons.jsx";
import AdminReviews from "./pages/admin/AdminReviews.jsx";
import AdminRoles from "./pages/admin/AdminRoles.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminPassword from "./pages/admin/AdminPassword.jsx";
import AdminNotifications from "./pages/admin/AdminNotifications.jsx";
import AdminChatbot from "./pages/admin/AdminChatbot.jsx";

// Shown when a staff account opens a section URL directly without the
// access for it (the sidebar already hides those sections; this covers
// typed/pasted links). The API enforces the same gates server-side.
function NoAccess() {
  return (
    <div className="bg-white rounded-md p-8 max-w-lg text-center">
      <p className="font-semibold">You don't have access to this section</p>
      <p className="text-sm text-gray-500 mt-2">
        Your Vice-Admin account has not been granted this section. Ask the Super Admin
        to grant it in Roles &amp; Users.
      </p>
    </div>
  );
}

// Wraps one admin section: `permission` gates on the account's effective
// permissions, `superOnly` on the Super Admin role. Dashboard is
// intentionally unwrapped — it stays visible to all staff.
function SectionGuard({ permission, superOnly, children }) {
  const { isSuperAdmin, hasPermission } = useAuth();
  if (superOnly && !isSuperAdmin) return <NoAccess />;
  if (permission && !hasPermission(permission)) return <NoAccess />;
  return children;
}

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
        <Route path="products" element={<SectionGuard permission="products"><AdminProducts /></SectionGuard>} />
        <Route path="products/new" element={<SectionGuard permission="products"><AdminProductForm /></SectionGuard>} />
        <Route path="products/:id/edit" element={<SectionGuard permission="products"><AdminProductForm /></SectionGuard>} />
        <Route path="categories" element={<SectionGuard permission="categories"><AdminCategories /></SectionGuard>} />
        <Route path="orders" element={<SectionGuard permission="orders"><AdminOrders /></SectionGuard>} />
        <Route path="coupons" element={<SectionGuard permission="coupons"><AdminCoupons /></SectionGuard>} />
        <Route path="reviews" element={<SectionGuard permission="products"><AdminReviews /></SectionGuard>} />
        <Route path="chatbot" element={<SectionGuard permission="chatbot"><AdminChatbot /></SectionGuard>} />
        <Route path="roles" element={<SectionGuard superOnly><AdminRoles /></SectionGuard>} />
        <Route path="settings" element={<SectionGuard superOnly><AdminSettings /></SectionGuard>} />
        <Route path="password" element={<AdminPassword />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  // App mode (Android WebView): the website footer disappears (the app
  // uses its bottom nav instead) and the bottom nav is always rendered,
  // so the content wrapper keeps nav clearance at every width.
  const appMode = isAppMode();
  return (
    <>
      {!isAdmin && <Header />}
      {!isAdmin && <CartDrawer />}
      <div className={appMode && !isAdmin ? "pb-20" : undefined}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        {/* Checkout + orders require login (no guest ordering) */}
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        {/* Tracking is a signed-in function now (Abdullah, 2026-11-09:
            browsing is public, every function needs an account) */}
        <Route path="/track-order" element={<ProtectedRoute><TrackOrder /></ProtectedRoute>} />
        <Route path="/account" element={<AccountHub />} />
        <Route path="/account/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Customer forgot password: request a reset link by email */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* Password reset: emailed link target — staff (post Super-Admin
            approval) and customers (?type=customer, self-service) */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/admin/*" element={<AdminShell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      {!isAdmin && !appMode && <Footer />}
      {!isAdmin && <MobileBottomNav />}
      {!isAdmin && <ChatWidget />}
    </>
  );
}
