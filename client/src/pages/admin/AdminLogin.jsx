import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Dedicated Admin Login — shown at /admin when the visitor is not signed in
// as staff. There is deliberately NO "create admin account" option here:
// staff accounts are created ONLY by the Super Admin inside the panel
// (Admin -> Roles & Users). Sign-in is by OTP or by staff password; after
// verification the role is checked — only admin (Super Admin) and
// vice-admin may proceed, customer accounts are rejected and signed out.
//
// Forgot password: staff submit their email. A Vice-Admin's request then
// needs Super Admin approval in the panel before a reset link is emailed.
// The Super Admin's own reset is verified by an email OTP sent to
// SUPER_ADMIN_EMAIL and completed right here.
export default function AdminLogin() {
  const { saveSession, logout } = useAuth();
  // view: "otp" | "password" | "forgot" | "forgot-done" | "owner-reset" | "reset-done"
  const [view, setView] = useState("otp");
  const [channel, setChannel] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "border rounded px-3 py-2.5 text-sm w-full";

  const acceptStaff = (data) => {
    if (!["admin", "vice-admin"].includes(data.user.role)) {
      // Save then immediately clear so no customer session remains.
      saveSession(data); logout();
      setError("This is a customer account. The Admin Suite is for MALAC staff only — please use the customer login.");
      setStep(1);
      return false;
    }
    saveSession(data); // AdminRoute will now render the suite
    return true;
  };

  const request = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/auth/login/otp", { identifier, channel });
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || "Could not send OTP"); }
    finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post("/auth/login/verify", { identifier, channel, code });
      acceptStaff(r.data);
    } catch (err) { setError(err.response?.data?.message || "Invalid OTP"); }
    finally { setBusy(false); }
  };

  const passwordLogin = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post("/auth/login/password", { identifier, password });
      acceptStaff(r.data);
    } catch (err) { setError(err.response?.data?.message || "Password sign-in failed"); }
    finally { setBusy(false); }
  };

  const forgotSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const r = await api.post("/auth/password-reset/request", { email: forgotEmail });
      if (r.data.flow === "owner-otp") {
        setNotice(r.data.message);
        setView("owner-reset");
      } else {
        setNotice(r.data.message || "Reset request submitted for Super Admin approval.");
        setView("forgot-done");
      }
    } catch (err) { setError(err.response?.data?.message || "Could not submit the request"); }
    finally { setBusy(false); }
  };

  const ownerResetSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post("/auth/password-reset/owner/verify", { email: forgotEmail, code, newPassword });
      setNotice(r.data.message);
      setView("reset-done");
    } catch (err) { setError(err.response?.data?.message || "Could not reset the password"); }
    finally { setBusy(false); }
  };

  const errBox = error && <p className="text-red-500 text-sm">{error}</p>;
  const noticeBox = notice && <p className="text-sm bg-green-50 border border-green-200 rounded p-2">{notice}</p>;

  return (
    <main className="min-h-screen bg-[#0f1b29] flex items-center justify-center px-3 py-10">
      <div className="bg-white rounded-lg p-6 w-full max-w-md fade-up">
        <div className="flex items-center gap-2">
          <span className="bg-brand text-white rounded-full p-2"><ShieldCheck size={20} /></span>
          <div>
            <h1 className="text-lg font-bold leading-tight">MALAC Admin Login</h1>
            <p className="text-xs text-gray-500">Super Admin & Vice-Admin only</p>
          </div>
        </div>

        {view === "otp" && (step === 1 ? (
          <form onSubmit={request} className="space-y-3 mt-5">
            <div className="flex gap-2 text-sm">
              {[["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setChannel(v)}
                  className={`flex-1 border rounded py-2 ${channel === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
              ))}
            </div>
            <input required className={input} placeholder={channel === "email" ? "Staff email address" : "Staff phone (+923xx...)"}
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            {errBox}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send Admin OTP"}
            </button>
            <div className="flex justify-between text-sm pt-1">
              <button type="button" onClick={() => { setView("password"); setError(""); }} className="text-brand">Use password instead</button>
              <button type="button" onClick={() => { setView("forgot"); setError(""); }} className="text-gray-500">Forgot password?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3 mt-5">
            <p className="text-sm text-gray-500">Enter the 6-digit code sent via {channel} to {identifier}.</p>
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {errBox}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Verifying..." : "Verify & Enter Admin Suite"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">Back</button>
          </form>
        ))}

        {view === "password" && (
          <form onSubmit={passwordLogin} className="space-y-3 mt-5">
            <input required className={input} placeholder="Staff email or phone"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            <input required type="password" className={input} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            {errBox}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Signing in..." : "Sign In to Admin Panel"}
            </button>
            <div className="flex justify-between text-sm pt-1">
              <button type="button" onClick={() => { setView("otp"); setError(""); }} className="text-brand">Use OTP instead</button>
              <button type="button" onClick={() => { setView("forgot"); setError(""); }} className="text-gray-500">Forgot password?</button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={forgotSubmit} className="space-y-3 mt-5">
            <p className="text-sm text-gray-500">
              Enter your staff email. Vice-Admin requests must be approved by the Super Admin
              in the Admin Panel before a reset link is emailed. The Super Admin verifies
              his own reset with an email code.
            </p>
            <input required type="email" className={input} placeholder="Staff email address"
              value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            {errBox}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Submitting..." : "Request Password Reset"}
            </button>
            <button type="button" onClick={() => { setView("otp"); setError(""); }} className="w-full text-sm text-gray-400">Back to sign in</button>
          </form>
        )}

        {view === "forgot-done" && (
          <div className="space-y-3 mt-5">
            {noticeBox}
            <p className="text-sm text-gray-500">Once the Super Admin approves your request, a one-time reset link (valid 1 hour) will be sent to your email.</p>
            <button type="button" onClick={() => setView("otp")} className="w-full border rounded py-2.5 text-sm">Back to sign in</button>
          </div>
        )}

        {view === "owner-reset" && (
          <form onSubmit={ownerResetSubmit} className="space-y-3 mt-5">
            {noticeBox}
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <input required type="password" className={input} placeholder="New password (min 8 characters)" minLength={8}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {errBox}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Saving..." : "Verify & Set New Password"}
            </button>
            <button type="button" onClick={() => { setView("otp"); setError(""); }} className="w-full text-sm text-gray-400">Back to sign in</button>
          </form>
        )}

        {view === "reset-done" && (
          <div className="space-y-3 mt-5">
            {noticeBox}
            <button type="button" onClick={() => setView("password")} className="w-full border rounded py-2.5 text-sm">Sign in with your new password</button>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4">
          There is no public admin registration. The only Super Admin is the store owner
          (seeded, pending first password setup via Forgot password above). Vice-Admin
          accounts are created by the Super Admin inside Admin → Roles &amp; Users only.
        </p>
      </div>
    </main>
  );
}
