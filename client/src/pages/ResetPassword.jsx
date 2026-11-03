import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PasswordInput from "../components/PasswordInput.jsx";

// Password reset — the destination of the emailed one-time link, shared
// by two flows that the ?type parameter keeps apart:
//  - STAFF (no type in the link): the link is only ever generated AFTER
//    the Super Admin approves the request in Admin -> Roles & Users, and
//    it works once, within 1 hour. (The Super Admin's own reset does not
//    use this page: he verifies with an email OTP on the Admin Login
//    screen instead.)
//  - CUSTOMER (?type=customer): self-service "forgot password" — the
//    link is emailed immediately on request from /forgot-password
//    (inbox ownership is the proof), also one-time and 1 hour, but it is
//    consumed through the customer endpoint and ends at the customer
//    Login page, never the Admin Login.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const isCustomer = params.get("type") === "customer";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "border rounded px-3 py-2.5 text-sm w-full";

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    if (newPassword !== confirm) { setBusy(false); return setError("Passwords do not match"); }
    try {
      const r = isCustomer
        ? await api.post("/auth/password/reset", { token, password: newPassword })
        : await api.post("/auth/password-reset/complete", { token, email, newPassword });
      setDone(r.data.message);
    } catch (err) { setError(err.response?.data?.message || "This reset link is invalid or has expired"); }
    finally { setBusy(false); }
  };

  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white rounded-md p-6 fade-up">
        <h1 className="text-xl font-bold">Set a new password</h1>
        {done ? (
          <>
            <p className="text-sm bg-green-50 border border-green-200 rounded p-2 mt-4">{done}</p>
            {isCustomer ? (
              <Link to="/login" className="block text-center w-full bg-brand text-white rounded py-2.5 font-medium mt-4">Go to Login</Link>
            ) : (
              <Link to="/admin" className="block text-center w-full bg-brand text-white rounded py-2.5 font-medium mt-4">Go to Admin Login</Link>
            )}
          </>
        ) : !token ? (
          isCustomer ? (
            <p className="text-sm text-red-500 mt-4">
              This page needs the one-time link from your password reset email. Request a new
              link from the <Link to="/forgot-password" className="text-brand">Forgot Password</Link> page.
            </p>
          ) : (
            <p className="text-sm text-red-500 mt-4">
              This page needs the one-time link from your password reset email. Request a reset
              from the <Link to="/admin" className="text-brand">Admin Login</Link> screen — a
              Super Admin must approve it before a link is sent.
            </p>
          )
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-4">
            {email && <p className="text-sm text-gray-500">For {isCustomer ? "account" : "staff account"}: <b>{email}</b></p>}
            <PasswordInput required className={input} placeholder="New password (min 8 characters)" minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <PasswordInput required className={input} placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Saving..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
