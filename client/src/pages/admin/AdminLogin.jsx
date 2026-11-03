import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Dedicated Admin Login — shown at /admin when the visitor is not signed in
// as staff. Same OTP endpoints as customer login, but after verification the
// role is checked: only admin (Super Admin) and vice-admin may proceed.
// Customer accounts are rejected here and signed out again.
export default function AdminLogin() {
  const { saveSession, logout } = useAuth();
  const [channel, setChannel] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "border rounded px-3 py-2.5 text-sm w-full";

  const request = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post("/auth/login/otp", { identifier, channel });
      if (r.data.demoCode) setDemoCode(r.data.demoCode);
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || "Could not send OTP"); }
    finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post("/auth/login/verify", { identifier, channel, code });
      if (!["admin", "vice-admin"].includes(r.data.user.role)) {
        // Save then immediately clear so no customer session remains.
        saveSession(r.data); logout();
        setError("This is a customer account. The Admin Suite is for MALAC staff only — please use the customer login.");
        setStep(1);
        return;
      }
      saveSession(r.data); // AdminRoute will now render the suite
    } catch (err) { setError(err.response?.data?.message || "Invalid OTP"); }
    finally { setBusy(false); }
  };

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
        {step === 1 ? (
          <form onSubmit={request} className="space-y-3 mt-5">
            <div className="flex gap-2 text-sm">
              {[["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setChannel(v)}
                  className={`flex-1 border rounded py-2 ${channel === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
              ))}
            </div>
            <input required className={input} placeholder={channel === "email" ? "Staff email address" : "Staff phone (+923xx...)"}
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send Admin OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3 mt-5">
            <p className="text-sm text-gray-500">Enter the 6-digit code sent via {channel} to {identifier}.</p>
            {demoCode && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Demo mode — your code is <b>{demoCode}</b>.</p>}
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Verifying..." : "Verify & Enter Admin Suite"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">Back</button>
          </form>
        )}
        <p className="text-[11px] text-gray-400 mt-4">
          First Super Admin (seeded): the store owner's account — sign in with the owner email/phone
          and an OTP code. Demo mode shows the code here; live mode sends it via the configured OTP senders.
        </p>
      </div>
    </main>
  );
}
