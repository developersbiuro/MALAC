import { useEffect, useState } from "react";
import api from "../../api/client.js";

// Super Admin only (nav + server both enforce it):
//  - Create Vice-Admin accounts (the ONLY way staff accounts are created —
//    there is no public admin registration). The new Vice-Admin sets their
//    own password through an emailed setup link; the Super Admin never
//    chooses or sees their password.
//  - Approve / reject staff "forgot password" requests. Only on approval
//    does the server generate the one-time reset link and email it.
//  - Role changes, with hard limits: the owner (Super Admin) account's
//    role is locked, and nobody can be promoted to Super Admin.
export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const input = "border rounded px-3 py-2 text-sm w-full";

  const loadUsers = () => api.get("/admin/users").then((r) => setUsers(r.data.users)).catch(() => {});
  const loadResets = () => api.get("/admin/password-resets").then((r) => setResets(r.data.requests)).catch(() => {});
  useEffect(() => { loadUsers(); loadResets(); }, []);

  const setRole = async (id, role) => {
    setError("");
    try {
      const r = await api.patch(`/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...r.data.user, isSuperAdminOwner: u.isSuperAdminOwner } : u)));
      setMsg(`Role updated to ${role}.`);
    } catch (err) { setError(err.response?.data?.message || "Could not update role"); }
  };

  const createViceAdmin = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    try {
      const r = await api.post("/admin/users", form);
      setMsg(`Vice-Admin created for ${r.data.user.email}. ${r.data.setup.message}`);
      setForm({ name: "", email: "", phone: "" });
      loadUsers();
    } catch (err) { setError(err.response?.data?.message || "Could not create the Vice-Admin"); }
    finally { setBusy(false); }
  };

  const decideReset = async (id, action) => {
    setError(""); setMsg("");
    try {
      const r = await api.patch(`/admin/password-resets/${id}/${action}`);
      if (action === "approve") {
        setMsg("Approved — reset link emailed to the staff member.");
      } else {
        setMsg("Reset request rejected. No reset link was sent.");
      }
      loadResets();
    } catch (err) { setError(err.response?.data?.message || "Could not update the request"); }
  };

  const label = { admin: "Super Admin", "vice-admin": "Vice-Admin", customer: "Customer" };
  const pendingResets = resets.filter((r) => r.status === "pending");
  const pastResets = resets.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold">Roles & Users</h1>
      <p className="text-sm text-gray-500 mt-1">
        Super Admin: full access incl. coupons, settings, payment verification, staff creation and reset approvals.
        Vice-Admin: product CRUD and order status updates — no settings, coupons, roles or payment verification.
      </p>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {/* Create Vice-Admin (inside the panel only — no public admin sign-up) */}
      <form onSubmit={createViceAdmin} className="bg-white rounded-md p-4 mt-4">
        <h2 className="font-semibold text-sm">Create a Vice-Admin</h2>
        <p className="text-xs text-gray-400 mt-1">
          The account starts as “pending setup”. A one-time setup link is emailed to them so THEY
          choose their own password — you never set or see it. They can also sign in with OTP.
        </p>
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          <input required className={input} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required className={input} placeholder="Phone (+923xx...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button disabled={busy} className="bg-brand text-white rounded px-4 py-2 text-sm font-medium mt-3 disabled:opacity-60">
          {busy ? "Creating..." : "Create Vice-Admin"}
        </button>
      </form>

      {/* Staff password-reset approvals */}
      <div className="bg-white rounded-md p-4 mt-4">
        <h2 className="font-semibold text-sm">Password Reset Requests (staff)</h2>
        <p className="text-xs text-gray-400 mt-1">
          A reset link is generated and emailed ONLY when you approve. Rejected or
          unapproved requests can never change a password.
        </p>
        {pendingResets.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">No pending requests.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2 min-w-[480px]">
            <thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Staff</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {pendingResets.map((r) => (
                <tr key={r._id} className="border-b last:border-0">
                  <td className="py-2">
                    <span className="font-medium">{r.user?.name || r.email}</span>{" "}
                    <span className="text-gray-400 text-xs">{r.email} · {label[r.user?.role] || r.user?.role}</span>
                  </td>
                  <td className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => decideReset(r._id, "approve")} className="bg-brand text-white rounded px-3 py-1.5 text-xs font-medium">Approve</button>
                    <button onClick={() => decideReset(r._id, "reject")} className="border rounded px-3 py-1.5 text-xs ml-2">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {pastResets.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Recent: {pastResets.slice(0, 5).map((r) => `${r.email} — ${r.status}`).join(" · ")}
          </p>
        )}
      </div>

      {/* All users + role assignment */}
      <div className="bg-white rounded-md mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead><tr className="text-left text-gray-400 border-b"><th className="p-3">User</th><th>Email</th><th>Phone</th><th>Verified</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b last:border-0">
                <td className="p-3 font-medium">{u.name}{u.accountStatus === "pending_setup" ? <span className="text-[11px] text-amber-600"> · pending setup</span> : ""}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td className="text-xs">{u.emailVerified ? "Email ✓ " : ""}{u.phoneVerified ? "Phone ✓" : ""}{u.googleId ? " Google" : ""}</td>
                <td>
                  {u.isSuperAdminOwner ? (
                    <span className="text-xs font-semibold bg-brand-light text-brand rounded px-2 py-1">Super Admin (Owner) — locked</span>
                  ) : (
                    <select value={u.role} onChange={(e) => setRole(u._id, e.target.value)} className="border rounded px-2 py-1">
                      {["vice-admin", "customer"].map((r) => <option key={r} value={r}>{label[r]}</option>)}
                      {u.role === "admin" && <option value="admin">{label.admin}</option>}
                    </select>
                  )}
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
