import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "../utils/google.js";
import PhoneInput from "../components/PhoneInput.jsx";
import { useSeo } from "../utils/seo.js";

// Customer login — three ways in:
//  1) email OR phone + password (whichever the customer signed up with),
//  2) one-time code by email / WhatsApp / SMS (no password needed),
//  3) Continue with Google.
// Supports ?redirect=/checkout so shoppers return to checkout after login.
// (Staff do NOT sign in here — they use the Admin Login at /admin.)
export function GoogleButton({ onDone }) {
  const [error, setError] = useState("");
  const buttonRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Real mode (VITE_GOOGLE_CLIENT_ID configured): render the official
  // Google Identity Services button. Google calls back with an ID token
  // (credential), which the server verifies — no fabricated profile.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setError("");
            try {
              const r = await api.post("/auth/google", { credential: response.credential });
              onDoneRef.current(r.data);
            } catch (err) {
              setError(err.response?.data?.message || "Google sign-in failed");
            }
          },
        });
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline", size: "large", text: "continue_with",
          width: Math.min(buttonRef.current.offsetWidth || 320, 400),
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Google sign-in. Check your connection and try again.");
      });
    return () => { cancelled = true; };
  }, []);

  if (GOOGLE_CLIENT_ID) {
    return (
      <div>
        <div ref={buttonRef} className="flex justify-center min-h-[44px]" />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // No client ID configured: Google sign-in is genuinely unavailable.
  // There is no fallback or fake sign-in — the button is shown disabled
  // with a note, and the server rejects profile-only sign-in anyway.
  return (
    <div>
      <button type="button" disabled aria-disabled="true"
        className="w-full border rounded py-2.5 text-sm font-medium flex items-center justify-center gap-2 bg-gray-50 text-gray-400 cursor-not-allowed">
        <span className="font-extrabold text-[#4285F4] opacity-50">G</span> Continue with Google
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">Google sign-in is not available yet</p>
    </div>
  );
}

export default function Login() {
  useSeo({ title: "Login — MALAC", robots: "noindex" });
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [method, setMethod] = useState("password"); // password | otp
  // email-or-phone + password state
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  // OTP state
  const [channel, setChannel] = useState("email"); // email | whatsapp | sms
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = (data) => { saveSession(data); navigate(redirect, { replace: true }); };
  const run = (fn, fallback) => async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await fn(); } catch (err) { setError(err.response?.data?.message || fallback); }
    finally { setBusy(false); }
  };

  const passwordLogin = run(async () => {
    const r = await api.post("/auth/login/customer-password", { identifier: loginId, password });
    finish(r.data);
  }, "Could not sign in");

  const request = run(async () => {
    await api.post("/auth/login/otp", { identifier, channel });
    setStep(2);
  }, "Could not send OTP");
  const verify = run(async () => {
    const r = await api.post("/auth/login/verify", { identifier, channel, code });
    finish(r.data);
  }, "Invalid OTP");

  const input = "border rounded px-3 py-2.5 text-sm w-full";
  const tab = (v, label) => (
    <button type="button" key={v} onClick={() => { setMethod(v); setError(""); }}
      className={`flex-1 border rounded py-2 ${method === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
  );
  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white rounded-md p-6 fade-up">
        <h1 className="text-xl font-bold">Welcome to MALAC</h1>
        <p className="text-sm text-gray-500 mt-1">Log in with your password, a one-time code, or Google.</p>

        <div className="flex gap-2 text-sm mt-4">
          {tab("password", "Password")}
          {tab("otp", "OTP Code")}
        </div>

        {method === "password" && (
          <form onSubmit={passwordLogin} className="space-y-3 mt-4">
            <input required type="text" autoComplete="username" className={input} placeholder="Email or Phone Number"
              value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            <input required type="password" autoComplete="current-password" className={input} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Signing in..." : "Log In"}
            </button>
            <p className="text-xs text-gray-400">Forgot your password? Use the OTP Code tab above — the code signs you in without a password.</p>
          </form>
        )}

        {method === "otp" && (step === 1 ? (
          <form onSubmit={request} className="space-y-3 mt-4">
            <div className="flex gap-2 text-sm">
              {[["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => {
                  setChannel(v); setError("");
                  // The identifier box is shared across channels: drop a
                  // value typed for the other kind so an email never lands
                  // in the phone field (or a number in the email field).
                  if (v === "email" ? /^\+?[\d\s()-]+$/.test(identifier) : identifier.includes("@")) setIdentifier("");
                }}
                  className={`flex-1 border rounded py-2 ${channel === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
              ))}
            </div>
            {channel === "email" ? (
              <input required type="email" autoComplete="email" className={input} placeholder="Email address"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            ) : (
              <PhoneInput required className={input} value={identifier} onChange={setIdentifier} />
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">Enter the 6-digit code sent via {channel} to {identifier}.</p>
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Verifying..." : "Verify & Log In"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-400">Back</button>
          </form>
        ))}
        <div className="flex items-center gap-3 my-4"><span className="flex-1 border-t" /><span className="text-xs text-gray-400">OR</span><span className="flex-1 border-t" /></div>
        <GoogleButton onDone={finish} />
        <p className="text-sm text-center mt-4">New to MALAC? <Link to={`/signup${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="text-brand font-medium">Sign up</Link></p>
        <p className="text-xs text-center mt-2 text-gray-400">Staff? Use the <Link to="/admin" className="text-brand">Admin Login</Link> instead.</p>
      </div>
    </main>
  );
}
