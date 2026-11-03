import { useEffect, useState } from "react";
import { Banknote, ShoppingBag, AlertTriangle, Package } from "lucide-react";
import api from "../../api/client.js";
import { rs } from "../../utils/format.js";

function BarChart({ data, valueKey, labelKey, color = "#f85606" }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-2 h-36 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-gray-400">{d[valueKey]}</span>
          <div className="w-full rounded-t" style={{ height: `${Math.max(4, (d[valueKey] / max) * 110)}px`, background: color }} />
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{String(d[labelKey]).slice(5)}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-gray-400">No data yet.</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <p className="text-gray-400">Loading analytics...</p>;
  const cards = [
    { label: "Total Gross Revenue", value: rs(data.totalRevenue), Icon: Banknote },
    { label: "Active Orders", value: data.activeOrders, Icon: ShoppingBag },
    { label: "Low Stock Alerts", value: data.lowStockAlerts, Icon: AlertTriangle },
    { label: "Total SKUs", value: data.totalSkus, Icon: Package },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {cards.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-md p-4 flex items-center gap-3 min-w-0">
            <span className="bg-brand-light text-brand rounded-full p-2.5 shrink-0"><Icon size={20} /></span>
            <div className="min-w-0"><p className="text-lg font-bold leading-tight break-words">{value}</p><p className="text-xs text-gray-400">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mt-3">
        <div className="bg-white rounded-md p-4">
          <p className="font-semibold text-sm">Daily Order Volume</p>
          <BarChart data={data.dailySeries} valueKey="orders" labelKey="date" />
        </div>
        <div className="bg-white rounded-md p-4">
          <p className="font-semibold text-sm">Top Categories (Revenue)</p>
          <BarChart data={data.topCategories.map((c) => ({ ...c, label: c.category }))} valueKey="revenue" labelKey="label" color="#0ea5e9" />
          <ul className="text-xs text-gray-500 mt-2 space-y-0.5">
            {data.topCategories.map((c) => <li key={c.category} className="flex justify-between"><span>{c.category}</span><span>{rs(c.revenue)}</span></li>)}
          </ul>
        </div>
      </div>
      {data.lowStock.length > 0 && (
        <div className="bg-white rounded-md p-4 mt-3">
          <p className="font-semibold text-sm text-red-500">Low Stock</p>
          <ul className="text-sm mt-2 space-y-1">
            {data.lowStock.map((p) => <li key={p.id} className="flex justify-between"><span>{p.title} <span className="text-gray-400">({p.sku})</span></span><b>{p.stock} left</b></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
