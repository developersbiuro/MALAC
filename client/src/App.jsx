import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import CartToast from "./components/CartToast.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { isAppMode } from "./utils/appMode.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";

// Pages are code-split (React.lazy): the phone downloads only the page
// it opens instead of the whole store in one ~1.5 MB bundle. On the
// slow connections most customers use, first load is now a fraction of
// what it was; the shell (header/nav/cart/chat) stays eager so the
// frame paints instantly. (Owner flagged slow app loading, 2026-11-11.)
const Home = lazy(() => import("./pages/Home.jsx"));
const Shop = lazy(() => import("./pages/Shop.jsx"));
const Categories = lazy(() => import("./pages/Categories.jsx"));
const ProductDetails = lazy(() => import("./pages/ProductDetails.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation.jsx"));
const MyOrders = lazy(() => import("./pages/MyOrders.jsx"));
const OrderDetail = lazy(() => import("./pages/OrderDetail.jsx"));
const TrackOrder = lazy(() => import("./pages/TrackOrder.jsx"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings.jsx"));
const AccountHub = lazy(() => import("./pages/AccountHub.jsx"));
const WishlistPage = lazy(() => import("./pages/WishlistPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Blog = lazy(() => import("./pages/Blog.jsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.jsx"));
const Policy = lazy(() => import("./pages/Policy.jsx"));

import AdminLogin from "./pages/admin/AdminLogin.jsx";
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.jsx"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm.jsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons.jsx"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews.jsx"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));
const AdminPassword = lazy(() => import("./pages/admin/AdminPassword.jsx"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications.jsx"));
const AdminChatbot = lazy(() => import("./pages/admin/AdminChatbot.jsx"));

const PageLoading = <p className="p-8 text-center text-gray-400">Loading...</p>;

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
  const { pathname } = useLocation();
  if (loading) return <p className="p-8 text-center text-gray-400">Loading...</p>;
  if (!user || !isStaff) return <AdminLogin />;
  return (
    <AdminLayout>
      <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={PageLoading}>
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
      </Suspense>
      </ErrorBoundary>
    </AdminLayout>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  // Daraz-style (owner, 2026-11-11): the bottom nav disappears inside
  // the buying flow — product page, cart, checkout, order confirmation
  // — so nothing competes with the buy actions there.
  const hideNav = pathname.startsWith("/product/")
    || pathname === "/cart"
    || pathname === "/checkout"
    || pathname.startsWith("/order-confirmation");
  // App mode (Android WebView): the website footer disappears (the app
  // uses its bottom nav instead) and the bottom nav is always rendered,
  // so the content wrapper keeps nav clearance at every width.
  const appMode = isAppMode();
  return (
    <>
      {!isAdmin && <Header />}
      {!isAdmin && <CartToast />}
      <div className={appMode && !isAdmin && !hideNav ? "pb-20" : undefined}>
      <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={PageLoading}>
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
        <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/admin/*" element={<AdminShell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      </div>
      {!isAdmin && !appMode && <Footer />}
      {!isAdmin && !hideNav && <MobileBottomNav />}
      {!isAdmin && <ChatWidget />}
    </>
  );
}
