import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white mt-10 border-t pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <p className="text-xl font-extrabold text-brand">MALAC</p>
          <p className="text-gray-500 mt-2">Online shopping in Pakistan — mobiles, fashion, electronics, groceries and more, with Cash on Delivery nationwide.</p>
        </div>
        <div><p className="font-semibold mb-2">Customer Care</p>
          <Link to="/orders" className="block text-gray-500 py-0.5">Track Your Order</Link>
          <Link to="/orders" className="block text-gray-500 py-0.5">Returns & Refunds</Link>
          <Link to="/shop" className="block text-gray-500 py-0.5">All Products</Link></div>
        <div><p className="font-semibold mb-2">Make Money With Us</p>
          <Link to="/admin" className="block text-gray-500 py-0.5">Sell on MALAC</Link>
          <Link to="/admin" className="block text-gray-500 py-0.5">Admin Login</Link></div>
        <div><p className="font-semibold mb-2">Payment Methods</p>
          <p className="text-gray-500">Cash on Delivery · Debit/Credit Card (simulated in demo)</p></div>
      </div>
      <div className="border-t py-3 text-center text-xs text-gray-400">© {new Date().getFullYear()} MALAC. All rights reserved.</div>
    </footer>
  );
}
