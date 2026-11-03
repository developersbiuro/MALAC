import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Pencil, Trash2, Plus } from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// Profile Settings (/account/settings, login required — see
// ProtectedRoute in App.jsx). Three sections:
//  1. Profile — display name is editable; email & phone are read-only
//     because they are this account's OTP-verified identities.
//  2. Change password — only when the account actually has a password
//     (server reports hasPassword via GET /auth/me); Google / OTP-only
//     accounts see an explanatory note instead.
//  3. Address book — add / edit / delete / set-default against
//     /api/auth/addresses (own addresses only, server-enforced).
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Sialkot"];
const input = "w-full border border-cream-line rounded-full px-4 py-2.5 text-sm bg-white outline-none focus:border-lux-amber";
const emptyAddress = { label: "Home", fullName: "", phone: "", city: "Lahore", area: "", street: "", postalCode: "", isDefault: false };

function Section({ eyebrow, title, children }) {
  return (
    <section className="bg-white border border-cream-line rounded-2xl shadow-sm mt-5 p-4 sm:p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-serif text-2xl font-semibold mt-1 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function ProfileSettings() {
  const { saveSession } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [profileMsg, setProfileMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [addrMsg, setAddrMsg] = useState("");
  const [form, setForm] = useState(null); // null = form closed; object = add/edit form
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => {
        setProfile(r.data.user);
        setName(r.data.user.name || "");
        setAddresses(r.data.user.addresses || []);
      })
      .catch(() => setProfileMsg("Could not load your profile. Please refresh the page."));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault(); setProfileMsg("");
    try {
      const r = await api.put("/auth/me", { name: name.trim() });
      setProfile(r.data.user);
      // Keep the header (name + account menu) in sync without a reload.
      saveSession({ user: r.data.user, token: localStorage.getItem("malac_token") });
      setProfileMsg("Profile saved.");
    } catch (err) { setProfileMsg(err.response?.data?.message || "Could not save your profile."); }
  };

  const savePassword = async (e) => {
    e.preventDefault(); setPwMsg("");
    if (pw.next !== pw.confirm) { setPwMsg("New password and confirmation do not match."); return; }
    try {
      const r = await api.put("/auth/me/password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg(r.data.message || "Password updated.");
    } catch (err) { setPwMsg(err.response?.data?.message || "Could not update your password."); }
  };

  const openAdd = () => {
    setAddrMsg("");
    setForm({ ...emptyAddress, fullName: profile?.name || "", phone: profile?.phone || "", isDefault: addresses.length === 0 });
    setEditingId(null);
  };
  const openEdit = (a) => {
    setAddrMsg("");
    setForm({
      label: a.label || "Home", fullName: a.fullName || "", phone: a.phone || "",
      city: a.city || "Lahore", area: a.area || "", street: a.street || "",
      postalCode: a.postalCode || "", isDefault: Boolean(a.isDefault),
    });
    setEditingId(a._id);
  };

  const saveAddress = async (e) => {
    e.preventDefault(); setAddrMsg("");
    try {
      const r = editingId
        ? await api.put(`/auth/addresses/${editingId}`, form)
        : await api.post("/auth/addresses", form);
      setAddresses(r.data.addresses || []);
      setForm(null); setEditingId(null);
      setAddrMsg(editingId ? "Address updated." : "Address added.");
    } catch (err) { setAddrMsg(err.response?.data?.message || "Could not save the address."); }
  };

  const removeAddress = async (a) => {
    if (!window.confirm(`Delete the "${a.label || "Home"}" address?`)) return;
    setAddrMsg("");
    try {
      const r = await api.delete(`/auth/addresses/${a._id}`);
      setAddresses(r.data.addresses || []);
      if (editingId === a._id) { setForm(null); setEditingId(null); }
    } catch (err) { setAddrMsg(err.response?.data?.message || "Could not delete the address."); }
  };

  const makeDefault = async (a) => {
    setAddrMsg("");
    try {
      const r = await api.put(`/auth/addresses/${a._id}`, { isDefault: true });
      setAddresses(r.data.addresses || []);
    } catch (err) { setAddrMsg(err.response?.data?.message || "Could not set the default address."); }
  };

  if (!profile) {
    return (
      <main className="max-w-4xl mx-auto px-4 pt-6 pb-12">
        <p className="text-gray-400">{profileMsg || "Loading your profile..."}</p>
      </main>
    );
  }

  const cityOptions = form && form.city && !CITIES.includes(form.city) ? [form.city, ...CITIES] : CITIES;

  return (
    <main className="max-w-4xl mx-auto px-4 pt-6 pb-12">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-lux-burnt font-medium hover:underline">
        <ArrowLeft size={16} /> Back to My Orders
      </Link>
      <p className="eyebrow mt-6">My Account</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1.5">Profile Settings</h1>

      {/* 1. Profile */}
      <Section eyebrow="Profile" title="Your Details">
        <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Email (verified — cannot be changed here)</span>
            <input value={profile.email} readOnly className={`${input} mt-1 bg-cream-alt text-gray-500`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Phone (verified — cannot be changed here)</span>
            <input value={profile.phone} readOnly className={`${input} mt-1 bg-cream-alt text-gray-500`} />
          </label>
          <div className="flex items-end">
            <button className="btn-lux px-6 py-2.5 text-sm">Save Changes</button>
          </div>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          Your email and phone are verified with one-time codes and act as your sign-in identity.
          To use a different email or phone, please sign up with the new details or contact us on WhatsApp for help.
        </p>
        {profileMsg && <p className="text-sm text-gray-600 mt-2">{profileMsg}</p>}
      </Section>

      {/* 2. Change password */}
      <Section eyebrow="Security" title="Password">
        {profile.hasPassword ? (
          <form onSubmit={savePassword} className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Current password</span>
              <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required className={`${input} mt-1`} autoComplete="current-password" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">New password (min 8 characters)</span>
              <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} className={`${input} mt-1`} autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Confirm new password</span>
              <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} className={`${input} mt-1`} autoComplete="new-password" />
            </label>
            <div className="sm:col-span-3">
              <button className="btn-lux px-6 py-2.5 text-sm">Update Password</button>
              {pwMsg && <span className="text-sm text-gray-600 ml-3">{pwMsg}</span>}
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            No password is set for this account — you signed up with Google or one-time codes,
            so there is no password to change. You can keep signing in the same way.
          </p>
        )}
      </Section>

      {/* 3. Address book */}
      <Section eyebrow="Delivery" title="Address Book">
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a._id} className="border border-cream-line rounded-xl p-4 flex flex-wrap gap-3 items-start">
              <MapPin size={18} className="text-lux-burnt mt-0.5 shrink-0" />
              <div className="flex-1 text-sm min-w-[200px]">
                <p className="font-semibold flex items-center gap-2">
                  {a.label || "Home"}
                  {a.isDefault && <span className="text-[10px] font-bold uppercase tracking-wider bg-lux-gradient text-white rounded-full px-2 py-0.5">Default</span>}
                </p>
                <p className="text-gray-600 mt-0.5">
                  {a.fullName} · {a.phone}<br />
                  {a.street}, {a.area}, {a.city}{a.postalCode ? ` — ${a.postalCode}` : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                {!a.isDefault && (
                  <button onClick={() => makeDefault(a)} title="Set as default" className="border border-cream-line rounded-full px-3 py-1.5 text-xs flex items-center gap-1 hover:border-lux-amber">
                    <Star size={13} /> Default
                  </button>
                )}
                <button onClick={() => openEdit(a)} title="Edit address" className="border border-cream-line rounded-full px-3 py-1.5 text-xs flex items-center gap-1 hover:border-lux-amber">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => removeAddress(a)} title="Delete address" className="border border-red-200 text-red-500 rounded-full px-3 py-1.5 text-xs flex items-center gap-1 hover:bg-red-50">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
          {addresses.length === 0 && !form && (
            <p className="text-sm text-gray-400">No saved addresses yet. Add one to check out faster.</p>
          )}
        </div>

        {addrMsg && <p className="text-sm text-gray-600 mt-3">{addrMsg}</p>}

        {form ? (
          <form onSubmit={saveAddress} className="grid sm:grid-cols-2 gap-3 mt-5 border-t border-cream-line pt-5">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Label</span>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" className={`${input} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Full name</span>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required className={`${input} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="03xx-xxxxxxx" className={`${input} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">City</span>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={`${input} mt-1`}>
                {cityOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Area / Town</span>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required className={`${input} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Postal code (optional)</span>
              <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={`${input} mt-1`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500">Street address, house no.</span>
              <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required className={`${input} mt-1`} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-[#d97706]" />
              Set as my default delivery address
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-lux px-6 py-2.5 text-sm">{editingId ? "Save Address" : "Add Address"}</button>
              <button type="button" onClick={() => { setForm(null); setEditingId(null); }} className="border border-cream-line rounded-full px-6 py-2.5 text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={openAdd} className="mt-4 border border-dashed border-lux-amber text-lux-burnt rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-1.5 hover:bg-cream-alt">
            <Plus size={16} /> Add New Address
          </button>
        )}
      </Section>
    </main>
  );
}
