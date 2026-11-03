import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// Customer login: passwordless OTP (email or WhatsApp/SMS) + Google.
// Supports ?redirect=/checkout so shoppers return to checkout after login.
export function GoogleButton({ onDone }) {
  const demoLogin = async () => {
    // Demo mode: in production load Google Identity Services, get the ID
    // token (credential), and POST { credential } instead of { profile }.
    const email = window.prompt("Demo Google sign-in: enter your Google email");
    if (!email) return;
    const r = await api.post("/auth/google", { profile: { email, name: email.split("@")[0], sub: `demo-${email}` } });
    onDone(r.data);
  };
  return (
    <button onClick={demoLogin} type="button"
      className="w-full border rounded py-2.5 text-sm font-medium flex items-center justify-center gap-2 bg-white hover:bg-gray-50">
      <span className="font-extrabold text-[#4285F4]">G</span> Continue with Google
    </button>
  );
}

export default function Login() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [channel, setChannel] = useState("email"); // email | whatsapp | sms
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = (data) => { saveSession(data); navigate(redirect, { replace: true }); };

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
      finish(r.data);
    } catch (err) { setError(err.response?.data?.message || "Invalid OTP"); }
    finally { setBusy(false); }
  };

  const input = "border rounded px-3 py-2.5 text-sm w-full";
  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white rounded-md p-6 fade-up">
        <h1 className="text-xl font-bold">Welcome to MALAC</h1>
        <p className="text-sm text-gray-500 mt-1">Log in with a one-time code — no password needed.</p>
        {step === 1 ? (
          <form onSubmit={request} className="space-y-3 mt-4">
            <div className="flex gap-2 text-sm">
              {[["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setChannel(v)}
                  className={`flex-1 border rounded py-2 ${channel === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
              ))}
            </div>
            <input required className={input} placeholder={channel === "email" ? "Email address" : "Phone (+923xx...)"}
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">Enter the 6-digit code sent via {channel} to {identifier}.</p>
            {demoCode && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Demo mode — your code is <b>{demoCode}</b> (live delivery needs provider credentials).</p>}
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Verifying..." : "Verify & Log In"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">Back</button>
          </form>
        )}
        <div className="flex items-center gap-3 my-4"><span className="flex-1 border-t" /><span className="text-xs text-gray-400">OR</span><span className="flex-1 border-t" /></div>
        <GoogleButton onDone={finish} />
        <p className="text-sm text-center mt-4">New to MALAC? <Link to={`/signup${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="text-brand font-medium">Sign up</Link></p>
        <p className="text-xs text-center mt-2 text-gray-400">Staff? Use the <Link to="/admin" className="text-brand">Admin Login</Link> instead.</p>
      </div>
    </main>
  );
}
