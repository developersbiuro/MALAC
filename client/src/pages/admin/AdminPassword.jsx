import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import PasswordInput from "../../components/PasswordInput.jsx";

// Change Password (/admin/password) — available to every signed-in staff
// member (Super Admin and Vice-Admins alike), unlike Roles & Users and
// Store Settings which stay Super-Admin-only. Uses the same self-service
// endpoint as the customer Profile Settings page: PUT /api/auth/me/password
// verifies the current password server-side before storing the new one.
//
// Accounts with no password yet (hasPassword === false from GET
// /api/auth/me — e.g. a Vice-Admin still on pending_setup) cannot use
// this form, because there is no current password to verify; they get
// the set-your-first-password guidance instead.
export default function AdminPassword() {
  const { user } = useAuth();
  const [hasPassword, setHasPassword] = useState(null); // null = still loading
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setHasPassword(Boolean(r.data.user?.hasPassword)))
      .catch(() => setHasPassword(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (pw.next.length < 8) { setErr("New password must be at least 8 characters."); return; }
    if (pw.next !== pw.confirm) { setErr("New password and confirmation do not match."); return; }
    if (pw.next === pw.current) { setErr("New password must be different from your current password."); return; }
    setSaving(true);
    try {
      const r = await api.put("/auth/me/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setMsg(r.data.message || "Password updated.");
    } catch (error) {
      setErr(error.response?.data?.message || "Could not update your password.");
    } finally {
      setSaving(false);
    }
  };

  const input = "border rounded px-3 py-2 text-sm w-full";
  const roleLabel = user?.role === "admin" ? "Super Admin" : "Vice-Admin";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold">Update Password</h1>
      <p className="text-sm text-gray-500 mt-1">
        Signed in as <span className="font-medium text-gray-700">{user?.name}</span>
        {user?.email ? <> · {user.email}</> : null} · {roleLabel}
      </p>

      {hasPassword === null && <p className="text-gray-400 mt-3">Loading...</p>}

      {hasPassword === true && (
        <form onSubmit={submit} className="bg-white rounded-md p-4 mt-3 space-y-3">
          <label className="block text-sm">Current password
            <PasswordInput className={input} value={pw.current} autoComplete="current-password" required
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
          </label>
          <label className="block text-sm">New password
            <PasswordInput className={input} value={pw.next} autoComplete="new-password" required minLength={8}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
          </label>
          <label className="block text-sm">Confirm new password
            <PasswordInput className={input} value={pw.confirm} autoComplete="new-password" required minLength={8}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
          </label>
          <p className="text-[11px] text-gray-400">At least 8 characters. Changing your password does not sign out other devices — sessions already signed in stay active until they expire.</p>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {msg && <p className="text-green-600 text-sm">{msg}</p>}
          <button disabled={saving} className="bg-brand text-white rounded px-6 py-2 text-sm font-medium disabled:opacity-60">
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}

      {hasPassword === false && (
        <div className="bg-white rounded-md p-4 mt-3 text-sm space-y-2">
          <p className="font-semibold">No password is set for your account yet</p>
          {user?.role === "admin" ? (
            <p className="text-gray-500">
              To set your first password, sign out and use <span className="font-medium text-gray-700">Admin Login → Forgot password</span> with
              your email — a verification code is emailed to you and you set the password there. After that, you can change it here any time.
            </p>
          ) : (
            <p className="text-gray-500">
              Your account was created by the Super Admin and is still waiting for its first password. Use the setup link from your
              invitation email, or ask the Super Admin to resend it from <span className="font-medium text-gray-700">Roles &amp; Users → Resend Setup</span>.
              Once your password is set, you can change it here any time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
