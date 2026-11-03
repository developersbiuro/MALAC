import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { GoogleButton } from "./Login.jsx";
import PhoneInput, { isValidPkMobile } from "../components/PhoneInput.jsx";
import { useSeo } from "../utils/seo.js";

// Sign-up, Daraz-style: the customer picks exactly ONE way and verifies
// ONLY that one channel:
//  1) Phone — name + phone + password, then the WhatsApp code
//  2) Email — name + email + password, then the emailed code
//  3) Continue with Google — account created instantly, no code at all
// The server creates the account only when the chosen code verifies.
export default function Signup() {
  useSeo({ title: "Create Account — MALAC", robots: "noindex" });
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [method, setMethod] = useState("phone"); // phone | email
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [channel, setChannel] = useState("whatsapp"); // channel the code was sent on
  const [step, setStep] = useState("details"); // details | otp
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "border rounded-lg px-3 py-2.5 text-sm w-full bg-white";
  const wrap = (fn) => async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await fn(); } catch (err) { setError(err.response?.data?.message || "Something went wrong"); }
    finally { setBusy(false); }
  };

  const mismatch = confirmPassword.length > 0 && form.password !== confirmPassword;
  const phoneValid = isValidPkMobile(form.phone);
  const phoneError = method === "phone" && form.phone !== "" && !phoneValid;
  const canSubmit = !mismatch && form.password.length >= 8 && confirmPassword.length > 0
    && (method !== "phone" || phoneValid);

  const start = wrap(async () => {
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== confirmPassword) { setError("Passwords do not match"); return; }
    const body = method === "email"
      ? { name: form.name, method, email: form.email, password: form.password }
      : { name: form.name, method, phone: form.phone, password: form.password };
    const r = await api.post("/auth/signup/start", body);
    setChannel(r.data.channel || (method === "email" ? "email" : "whatsapp"));
    setStep("otp");
  });
  const verify = wrap(async () => {
    const body = method === "email"
      ? { method, email: form.email, code }
      : { method, phone: form.phone, code, channel };
    const r = await api.post("/auth/signup/verify", body);
    saveSession(r.data);
    navigate(redirect, { replace: true });
  });

  const passwordField = (value, onChange, show, setShow, placeholder) => (
    <div className="relative">
      <input required type={show ? "text" : "password"} placeholder={placeholder} autoComplete="new-password" className={`${input} pr-10`}
        value={value} onChange={onChange} />
      <button type="button" tabIndex={-1} aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );

  const tabBtn = (v, label) => (
    <button type="button" key={v}
      onClick={() => { setMethod(v); setError(""); }}
      className={`flex-1 rounded-full py-2 text-sm font-semibold border transition ${method === v ? "bg-lux-gradient text-white border-transparent" : "bg-white text-gray-500 border-cream-line hover:text-gray-700"}`}>
      {label}
    </button>
  );

  return (
    <main className="max-w-md mx-auto px-3 pt-8 pb-10">
      <div className="bg-white border border-cream-line rounded-2xl shadow-sm p-6 fade-up">
        <p className="eyebrow">Join MALAC</p>
        <h1 className="font-display text-2xl font-bold mt-1">Create your MALAC account</h1>
        <div className="flex gap-1.5 mt-4">
          {["Details", method === "email" ? "Email OTP" : "WhatsApp OTP"].map((s, i) => (
            <span key={s} className={`flex-1 text-center text-[11px] rounded-full py-1 ${(step === "otp" ? 1 : 0) === i ? "bg-lux-gradient text-white" : "bg-gray-100 text-gray-500"}`}>{s}</span>
          ))}
        </div>

        {step === "details" && (
          <form onSubmit={start} className="space-y-3 mt-4">
            <div className="flex gap-2">
              {tabBtn("phone", "Phone")}
              {tabBtn("email", "Email")}
            </div>
            <input required placeholder="Full name" autoComplete="name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {method === "phone" ? (
              <>
                <PhoneInput required className={input} invalid={phoneError} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                {phoneError && <p className="text-red-500 text-xs -mt-1">Sahi Pakistani mobile number likhein — maslan 0300 1234567</p>}
              </>
            ) : (
              <input required type="email" placeholder="Email address" autoComplete="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            )}
            {passwordField(form.password, (e) => setForm({ ...form, password: e.target.value }), showPassword, setShowPassword, "Create a password (min 8 characters)")}
            {passwordField(confirmPassword, (e) => setConfirmPassword(e.target.value), showConfirm, setShowConfirm, "Confirm password")}
            {mismatch && <p className="text-red-500 text-xs -mt-1">Passwords do not match</p>}
            <p className="text-xs text-gray-500">
              {method === "phone"
                ? "We'll send a verification code to this number on WhatsApp — that's the only verification step."
                : "We'll email a verification code to this address — that's the only verification step."}
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy || !canSubmit} className="btn-lux w-full py-2.5 text-sm disabled:opacity-60">
              {busy ? "Sending code..." : method === "phone" ? "Sign Up — Send WhatsApp Code" : "Sign Up — Send Email Code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verify} className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">
              {method === "phone"
                ? <>Enter the WhatsApp code sent to <b>{form.phone}</b>.</>
                : <>Enter the verification code sent to <b>{form.email}</b>.</>}
            </p>
            <input required className={`${input} tracking-[.4em] text-center`} maxLength={6} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button disabled={busy} className="btn-lux w-full py-2.5 text-sm disabled:opacity-60">
              {busy ? "Verifying..." : "Verify & Create Account"}
            </button>
            <button type="button" onClick={() => { setStep("details"); setError(""); }} className="w-full text-sm text-gray-400">Back</button>
          </form>
        )}

        <div className="flex items-center gap-3 my-4"><span className="flex-1 border-t" /><span className="text-xs text-gray-400">OR</span><span className="flex-1 border-t" /></div>
        <GoogleButton onDone={(data) => { saveSession(data); navigate(redirect, { replace: true }); }} />
        <p className="text-sm text-center mt-4">Already have an account? <Link to="/login" className="text-brand font-medium">Log in</Link></p>
      </div>
    </main>
  );
}
