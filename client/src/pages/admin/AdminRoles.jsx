import { useEffect, useState } from "react";
import api from "../../api/client.js";

// Super Admin only: role assignment for staff and customers.
export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/users").then((r) => setUsers(r.data.users)).catch(() => {});
  useEffect(load, []);

  const setRole = async (id, role) => {
    const r = await api.patch(`/admin/users/${id}/role`, { role });
    setUsers((prev) => prev.map((u) => u._id === id ? r.data.user : u));
    setMsg(`Role updated to ${role}.`);
  };
  const label = { admin: "Super Admin", "vice-admin": "Vice-Admin", customer: "Customer" };

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold">Roles & Users</h1>
      <p className="text-sm text-gray-500 mt-1">
        Super Admin: full access incl. coupons, settings, payment verification and role assignment.
        Vice-Admin: product CRUD and order status updates — no settings, coupons or billing.
      </p>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      <div className="bg-white rounded-md mt-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead><tr className="text-left text-gray-400 border-b"><th className="p-3">User</th><th>Email</th><th>Phone</th><th>Verified</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b last:border-0">
                <td className="p-3 font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td className="text-xs">{u.emailVerified ? "Email ✓ " : ""}{u.phoneVerified ? "Phone ✓" : ""}{u.googleId ? " Google" : ""}</td>
                <td>
                  <select value={u.role} onChange={(e) => setRole(u._id, e.target.value)} className="border rounded px-2 py-1">
                    {["admin", "vice-admin", "customer"].map((r) => <option key={r} value={r}>{label[r]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No users yet.</p>}
      </div>
    </div>
  );
}
