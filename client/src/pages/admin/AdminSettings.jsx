import { useEffect, useState } from "react";
import api from "../../api/client.js";

// Super Admin only. OTP sender identities + JazzCash/Easypaisa store accounts
// are configured here (or via .env) — they are never hard-coded in UI logic.
export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.get("/admin/settings").then((r) => setForm(r.data.settings)).catch(() => {}); }, []);
  if (!form) return <p className="text-gray-400">Loading settings...</p>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    const r = await api.put("/admin/settings", form);
    setForm(r.data.settings); setMsg("Settings saved.");
  };
  const input = "border rounded px-3 py-2 text-sm w-full";
  const num = (k) => ({ type: "number", value: form[k] ?? 0, onChange: (e) => set(k, Number(e.target.value)) });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold">Store Settings</h1>
      <form onSubmit={save} className="bg-white rounded-md p-4 mt-3 space-y-3">
        <label className="block text-sm">Store name<input className={input} value={form.storeName} onChange={(e) => set("storeName", e.target.value)} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Default shipping fee (Rs.)<input className={input} {...num("defaultShippingFee")} /></label>
          <label className="text-sm">Express shipping fee (Rs.)<input className={input} {...num("expressShippingFee")} /></label>
          <label className="text-sm">Free shipping threshold (Rs.)<input className={input} {...num("freeShippingThreshold")} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.codEnabled} onChange={(e) => set("codEnabled", e.target.checked)} /> Cash on Delivery enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.cardPaymentsEnabled} onChange={(e) => set("cardPaymentsEnabled", e.target.checked)} /> Card payments enabled (simulated)</label>

        <fieldset className="border rounded p-3">
          <legend className="text-sm font-semibold px-1">OTP senders</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Sender email<input className={input} value={form.otpSenderEmail} onChange={(e) => set("otpSenderEmail", e.target.value)} /></label>
            <label className="text-sm">Sender phone / SMS<input className={input} value={form.otpSenderPhone} onChange={(e) => set("otpSenderPhone", e.target.value)} /></label>
            <label className="text-sm">WhatsApp sender number<input className={input} value={form.whatsappSenderNumber} onChange={(e) => set("whatsappSenderNumber", e.target.value)} /></label>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">OTP codes are delivered via the configured providers — email via SMTP, WhatsApp via the Meta WhatsApp Cloud API (authentication template), and SMS via Twilio. Provider credentials live in the server .env; a channel whose provider is not configured cannot send codes.</p>
        </fieldset>

        <fieldset className="border rounded p-3">
          <legend className="text-sm font-semibold px-1">Manual payment accounts (JazzCash / Easypaisa / Meezan Bank)</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">JazzCash account title<input className={input} value={form.jazzcashAccountTitle || ""} onChange={(e) => set("jazzcashAccountTitle", e.target.value)} /></label>
            <label className="text-sm">JazzCash account number<input className={input} value={form.jazzcashAccountNumber || ""} onChange={(e) => set("jazzcashAccountNumber", e.target.value)} /></label>
            <label className="text-sm">Easypaisa account title<input className={input} value={form.easypaisaAccountTitle || ""} onChange={(e) => set("easypaisaAccountTitle", e.target.value)} /></label>
            <label className="text-sm">Easypaisa account number<input className={input} value={form.easypaisaAccountNumber || ""} onChange={(e) => set("easypaisaAccountNumber", e.target.value)} /></label>
            <label className="text-sm">Meezan Bank account title<input className={input} value={form.meezanAccountTitle || ""} onChange={(e) => set("meezanAccountTitle", e.target.value)} /></label>
            <label className="text-sm">Meezan Bank account number<input className={input} value={form.meezanAccountNumber || ""} onChange={(e) => set("meezanAccountNumber", e.target.value)} /></label>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">The Meezan account is ALSO the receiving account for the NayaPay, SadaPay and FirstPay HBL checkout methods — customers send from those apps into this one account.</p>
          <p className="text-[11px] text-gray-400 mt-2">These store accounts are shown to customers at checkout. Leave a number empty to mark that method as unavailable. Defaults come from JAZZCASH_* / EASYPAISA_* in .env (owner-provided shared account for both wallets).</p>
        </fieldset>

        {msg && <p className="text-green-600 text-sm">{msg}</p>}
        <button className="bg-brand text-white rounded px-6 py-2 text-sm font-medium">Save Settings</button>
      </form>
    </div>
  );
}
