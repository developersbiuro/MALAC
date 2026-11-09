import { Fragment, useEffect, useState } from "react";
import api from "../../api/client.js";
import PhoneInput, { isValidPkMobile } from "../../components/PhoneInput.jsx";

// The grantable Vice-Admin sections (mirrors the server's
// utils/permissions.js keys). The Super Admin decides per Vice-Admin
// how much access they get; the Super Admin themself always has all.
const PERMISSION_OPTIONS = [
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments verification" },
  { key: "coupons", label: "Coupons" },
  { key: "chatbot", label: "Chatbot & Support" },
];

function PermissionChecks({ value, onChange }) {
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {PERMISSION_OPTIONS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="checkbox" checked={value.includes(key)} onChange={() => toggle(key)} />
          {label}
        </label>
      ))}
    </div>
  );
}

// Super Admin only (nav + server both enforce it):
//  - Create Vice-Admin accounts (the ONLY way staff accounts are created —
//    there is no public admin registration), choosing their section
//    access. The new Vice-Admin sets their own password through an
//    emailed setup link; the Super Admin never chooses or sees it.
//  - Manage each Vice-Admin afterwards: edit access, mark verified,
//    re-send the setup email, or delete the account.
//  - Approve / reject staff "forgot password" requests. Only on approval
//    does the server generate the one-time reset link and email it.
//  - Role changes, with hard limits: the owner (Super Admin) account's
//    role is locked, and nobody can be promoted to Super Admin.
//  - The owner account can carry an alternate phone: both numbers sign
//    in to the same Super Admin account.
export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [resets, setResets] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", permissions: ["products", "orders"] });
  const [busy, setBusy] = useState(false);
  const [accessOpenId, setAccessOpenId] = useState(null);
  const [accessDraft, setAccessDraft] = useState([]);
  const [altPhones, setAltPhones] = useState({});
  const input = "border rounded px-3 py-2 text-sm w-full";

  const loadUsers = () => api.get("/admin/users").then((r) => setUsers(r.data.users)).catch(() => {});
  const loadResets = () => api.get("/admin/password-resets").then((r) => setResets(r.data.requests)).catch(() => {});
  useEffect(() => { loadUsers(); loadResets(); }, []);

  // Replace one row with the server's updated record, keeping the
  // client-only owner flag the API list adds on top.
  const replaceUser = (updated) =>
    setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...updated, isSuperAdminOwner: u.isSuperAdminOwner } : u)));

  const setRole = async (id, role) => {
    setError("");
    try {
      const r = await api.patch(`/admin/users/${id}/role`, { role });
      replaceUser(r.data.user);
      setMsg(`Role updated to ${role}.`);
    } catch (err) { setError(err.response?.data?.message || "Could not update role"); }
  };

  const createViceAdmin = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    try {
      const r = await api.post("/admin/users", form);
      setMsg(`Vice-Admin created for ${r.data.user.email}. ${r.data.setup.message}`);
      setForm({ name: "", email: "", phone: "", permissions: ["products", "orders"] });
      loadUsers();
    } catch (err) { setError(err.response?.data?.message || "Could not create the Vice-Admin"); }
    finally { setBusy(false); }
  };

  const savePermissions = async (u) => {
    setError(""); setMsg("");
    try {
      const r = await api.patch(`/admin/users/${u._id}/permissions`, { permissions: accessDraft });
      replaceUser(r.data.user);
      setAccessOpenId(null);
      setMsg(`Access updated for ${u.name}.`);
    } catch (err) { setError(err.response?.data?.message || "Could not update access"); }
  };

  const markVerified = async (u) => {
    setError(""); setMsg("");
    try {
      const r = await api.patch(`/admin/users/${u._id}/verify`);
      replaceUser(r.data.user);
      setMsg(`${u.name} is now marked verified (email + phone).`);
    } catch (err) { setError(err.response?.data?.message || "Could not verify the account"); }
  };

  const resendSetup = async (u) => {
    setError(""); setMsg("");
    try {
      const r = await api.post(`/admin/users/${u._id}/resend-setup`);
      setMsg(`Setup email re-sent to ${u.email}. ${r.data.message || ""}`);
    } catch (err) { setError(err.response?.data?.message || "Could not re-send the setup email"); }
  };

  const deleteViceAdmin = async (u) => {
    if (!window.confirm(`Delete Vice-Admin ${u.name} (${u.email})?\n\nThis permanently deletes their account and sign-in. This cannot be undone.`)) return;
    setError(""); setMsg("");
    try {
      await api.delete(`/admin/users/${u._id}`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      setMsg(`Vice-Admin ${u.name} deleted.`);
    } catch (err) { setError(err.response?.data?.message || "Could not delete the Vice-Admin"); }
  };

  const saveAltPhone = async (u) => {
    const value = altPhones[u._id] ?? u.secondaryPhone ?? "";
    if (value && !isValidPkMobile(value)) { setError("Please enter a valid Pakistani mobile number for the alternate phone."); return; }
    setError(""); setMsg("");
    try {
      const r = await api.patch(`/admin/users/${u._id}/phones`, { secondaryPhone: value });
      replaceUser(r.data.user);
      setMsg(value ? `Alternate phone saved for ${u.name} — both numbers now sign in to this account.` : `Alternate phone removed for ${u.name}.`);
    } catch (err) { setError(err.response?.data?.message || "Could not save the alternate phone"); }
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
        Super Admin: full access to everything. Each Vice-Admin gets only the sections you grant
        them below (Products, Categories, Orders, Payments verification, Coupons) — Roles &amp; Users
        and Settings stay Super-Admin-only. A Vice-Admin created before per-user access existed keeps
        the standard Products + Orders until you change it.
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
        <p className="text-xs text-gray-400 mt-3 mb-1.5">Access — which admin sections can they use?</p>
        <PermissionChecks value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
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

      {/* All users + role assignment + per-Vice-Admin access */}
      <div className="bg-white rounded-md mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead><tr className="text-left text-gray-400 border-b"><th className="p-3">User</th><th>Email</th><th>Phone</th><th>Verified</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const isViceAdmin = u.role === "vice-admin";
              const fullyVerified = u.emailVerified && u.phoneVerified;
              return (
                <Fragment key={u._id}>
                  <tr className="border-b last:border-0 align-top">
                    <td className="p-3 font-medium">{u.name}{u.accountStatus === "pending_setup" ? <span className="text-[11px] text-amber-600"> · pending setup</span> : ""}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">
                      {u.phone}
                      {u.secondaryPhone ? <span className="block text-xs text-gray-400">Alt: {u.secondaryPhone}</span> : null}
                      {u.isSuperAdminOwner && (
                        <div className="mt-2 min-w-[190px]">
                          <p className="text-[11px] text-gray-400 mb-1">Alternate phone (both numbers sign in as you):</p>
                          <div className="flex items-center gap-1.5">
                            <PhoneInput
                              className="border rounded px-2 py-1.5 text-sm flex-1"
                              value={altPhones[u._id] ?? u.secondaryPhone ?? ""}
                              onChange={(v) => setAltPhones((prev) => ({ ...prev, [u._id]: v }))}
                            />
                            <button onClick={() => saveAltPhone(u)} className="border rounded px-2.5 py-1.5 text-xs whitespace-nowrap">Save</button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-xs">{u.emailVerified ? "Email ✓ " : ""}{u.phoneVerified ? "Phone ✓" : ""}{u.googleId ? " Google" : ""}</td>
                    <td className="py-3">
                      {u.isSuperAdminOwner ? (
                        <span className="text-xs font-semibold bg-brand-light text-brand rounded px-2 py-1">Super Admin (Owner) — locked</span>
                      ) : (
                        <select value={u.role} onChange={(e) => setRole(u._id, e.target.value)} className="border rounded px-2 py-1">
                          {["vice-admin", "customer"].map((r) => <option key={r} value={r}>{label[r]}</option>)}
                          {u.role === "admin" && <option value="admin">{label.admin}</option>}
                        </select>
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {isViceAdmin && (
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => { setAccessOpenId(accessOpenId === u._id ? null : u._id); setAccessDraft(u.permissions || []); }} className="border rounded px-2.5 py-1.5 text-xs">Access</button>
                          {!fullyVerified && (
                            <button onClick={() => markVerified(u)} className="border rounded px-2.5 py-1.5 text-xs">Mark verified</button>
                          )}
                          {u.accountStatus === "pending_setup" && (
                            <button onClick={() => resendSetup(u)} className="border rounded px-2.5 py-1.5 text-xs">Resend setup email</button>
                          )}
                          <button onClick={() => deleteViceAdmin(u)} className="border border-red-200 text-red-600 rounded px-2.5 py-1.5 text-xs">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isViceAdmin && accessOpenId === u._id && (
                    <tr className="border-b bg-gray-50">
                      <td colSpan={6} className="px-3 py-3">
                        <p className="text-xs text-gray-500 mb-2">
                          Access for <b>{u.name}</b> — tick the sections this Vice-Admin may use.
                          (Unticking everything and saving means NO access — this Vice-Admin will not be able to open any section.)
                        </p>
                        <PermissionChecks value={accessDraft} onChange={setAccessDraft} />
                        <div className="mt-2.5 flex gap-2">
                          <button onClick={() => savePermissions(u)} className="bg-brand text-white rounded px-3 py-1.5 text-xs font-medium">Save access</button>
                          <button onClick={() => setAccessOpenId(null)} className="border rounded px-3 py-1.5 text-xs">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No users yet.</p>}
      </div>
    </div>
  );
}
