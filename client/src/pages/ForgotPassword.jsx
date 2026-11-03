import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useSeo } from "../utils/seo.js";

// Customer "forgot password" — step 1: ask for the account email. The
// server answers generically whether or not the email has an account
// (no account enumeration), so this page ALWAYS shows the same
// confirmation after submitting. The emailed link (valid 60 minutes,
// single use) lands on /reset-password?type=customer. Staff do NOT use
// this page — their resets are approval-gated from the Admin Login.
export default function ForgotPassword() {
  useSeo({ title: "Forgot Password — MALAC", robots: "noindex" });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/auth/password/forgot", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the reset email. Please try again.");
    } finally { setBusy(false); }
  };

  const input = "border rounded px-3 py-2.5 text-sm w-full";
  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white rounded-md p-6 fade-up">
        <h1 className="text-xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-gray-500 mt-1">
          Apna account email likhein — hum aap ko password reset link bhej dein ge.
        </p>
        {sent ? (
          <>
            <p className="text-sm bg-green-50 border border-green-200 rounded p-3 mt-4">
              Agar is email par MALAC account mojood hai, to password reset link bhej diya gaya hai.
              Link 60 minute ke liye valid hai.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Email nazar na aye to spam / junk folder bhi check kar lein.
            </p>
            <Link to="/login" className="block text-center w-full bg-brand text-white rounded py-2.5 font-medium mt-4">
              Back to Login
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-4">
            <input required type="email" autoComplete="email" className={input} placeholder="Email address"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-sm text-center">
              Remembered it? <Link to="/login" className="text-brand font-medium">Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
