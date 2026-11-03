import Order from "../models/Order.js";
import Product from "../models/Product.js";

export async function getAnalytics() {
  const [orders, products] = await Promise.all([
    Order.find({ status: { $ne: "Cancelled" } }).lean(),
    Product.find({ status: { $ne: "Archived" } }).lean(),
  ]);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const activeOrders = orders.filter((o) =>
    ["Pending", "Processing", "Shipped"].includes(o.status)).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5)
    .map((p) => ({ id: p._id, title: p.title, sku: p.sku, stock: p.stock }));
  const byDay = {};
  for (const o of orders) {
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay[day] = byDay[day] || { date: day, orders: 0, revenue: 0 };
    byDay[day].orders += 1; byDay[day].revenue += o.total;
  }
  const byCategory = {};
  for (const o of orders) for (const item of o.items) {
    // category resolved at read time is approximated by product lookup map
    byCategory[item.title] = byCategory[item.title] || 0;
  }
  const categoryMap = new Map(products.map((p) => [String(p._id), p.category]));
  const categorySales = {};
  for (const o of orders) for (const item of o.items) {
    const cat = categoryMap.get(String(item.product)) || "Other";
    categorySales[cat] = (categorySales[cat] || 0) + item.price * item.qty;
  }
  return {
    totalRevenue,
    activeOrders,
    lowStockAlerts: lowStock.length,
    lowStock,
    totalSkus: products.length,
    totalOrders: orders.length,
    dailySeries: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    topCategories: Object.entries(categorySales)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 6),
  };
}
