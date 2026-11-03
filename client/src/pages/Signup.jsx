import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { GoogleButton } from "./Login.jsx";

// Sign-up: create the account with email + password, then verify with
// codes, in order:
//  1) email OTP   2) phone OTP via WhatsApp or SMS (customer chooses)
// The account (and its password) takes effect only after BOTH codes are
// verified — the server creates the account at the final step.
export default function Signup() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneChannel, setPhoneChannel] = useState("whatsapp");
  const [step, setStep] = useState(1); // 1 details, 2 email code, 3 phone code
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "border rounded px-3 py-2.5 text-sm w-full";
  const wrap = (fn) => async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await fn(); } catch (err) { setError(err.response?.data?.message || "Something went wrong"); }
    finally { setBusy(false); }
  };

  const requestEmail = wrap(async () => {
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== confirmPassword) { setError("Passwords do not match"); return; }
    const r = await api.post("/auth/signup/email-otp", form);
    if (r.data.demoCode) setDemoCode(r.data.demoCode);
    setStep(2);
  });
  const verifyEmail = wrap(async () => {
    await api.post("/auth/signup/verify-email", { email: form.email, code: emailCode, channel: phoneChannel });
    const r = await api.post("/auth/signup/phone-otp", { phone: form.phone, channel: phoneChannel });
    if (r.data.demoCode) setDemoCode(r.data.demoCode); else setDemoCode("");
    setStep(3);
  });
  const verifyPhone = wrap(async () => {
    const r = await api.post("/auth/signup/verify-phone", { ...form, code: phoneCode, channel: phoneChannel });
    saveSession(r.data);
    navigate(redirect, { replace: true });
  });

  const codeBox = (value, setValue) => (
    <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
      value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
  );

  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white rounded-md p-6 fade-up">
        <h1 className="text-xl font-bold">Create your MALAC account</h1>
        <div className="flex gap-1.5 mt-3">
          {["Details", "Email OTP", "Phone OTP"].map((s, i) => (
            <span key={s} className={`flex-1 text-center text-[11px] rounded-full py-1 ${step === i + 1 ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{s}</span>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={requestEmail} className="space-y-3 mt-4">
            <input required placeholder="Full name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required type="email" placeholder="Email address" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required placeholder="Phone (+923xx...)" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input required type="password" placeholder="Create a password (min 8 characters)" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input required type="password" placeholder="Confirm password" className={input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <p className="text-xs text-gray-500">You'll sign in with this password after verifying your email and phone with the codes we send.</p>
            <p className="text-xs text-gray-500">Verify my phone by:</p>
            <div className="flex gap-2 text-sm">
              {[["whatsapp", "WhatsApp OTP"], ["sms", "SMS OTP"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setPhoneChannel(v)}
                  className={`flex-1 border rounded py-2 ${phoneChannel === v ? "border-brand text-brand bg-brand-light" : ""}`}>{label}</button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">
              {busy ? "Sending..." : "Send Email OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyEmail} className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">Step 1 of 2: enter the code sent to <b>{form.email}</b> from MALAC's email sender.</p>
            {demoCode && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Demo mode — your code is <b>{demoCode}</b>.</p>}
            {codeBox(emailCode, setEmailCode)}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">Verify Email</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={verifyPhone} className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">Step 2 of 2: enter the {phoneChannel === "whatsapp" ? "WhatsApp" : "SMS"} code sent to <b>{form.phone}</b>.</p>
            {demoCode && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Demo mode — your code is <b>{demoCode}</b>.</p>}
            {codeBox(phoneCode, setPhoneCode)}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="w-full bg-brand text-white rounded py-2.5 font-medium disabled:opacity-60">Verify Phone & Create Account</button>
          </form>
        )}

        <div className="flex items-center gap-3 my-4"><span className="flex-1 border-t" /><span className="text-xs text-gray-400">OR</span><span className="flex-1 border-t" /></div>
        <GoogleButton onDone={(data) => { saveSession(data); navigate(redirect, { replace: true }); }} />
        <p className="text-sm text-center mt-4">Already have an account? <Link to="/login" className="text-brand font-medium">Log in</Link></p>
      </div>
    </main>
  );
}
