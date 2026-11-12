import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Truck, Banknote, Smartphone, UploadCloud, Landmark, MapPin, ArrowLeft } from "lucide-react";
import api from "../api/client.js";
import LiveLocationButton from "../components/LiveLocationButton.jsx";
import LocationSelect from "../components/LocationSelect.jsx";
import { findCity } from "../data/pakLocations.js";
import PhoneInput from "../components/PhoneInput.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rs, deliveryWindow, couponReason } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";
import { MANUAL_METHODS, WALLET_KEY } from "../utils/payments.js";
import { isRealEmail } from "../utils/customerContact.js";

// NOTE: This page is wrapped in <ProtectedRoute> — guests are redirected to
// /login?redirect=/checkout and return here after login. The server also
// rejects unauthenticated POST /api/orders with 401 (no guest ordering).
const steps = ["Shipping Address", "Delivery Method", "Payment"];
const MANUAL = MANUAL_METHODS;

export default function Checkout() {
  useSeo({ title: "Checkout — MALAC", robots: "noindex" });
  const { items, clear, remove } = useCart();
  // Daraz-style subset checkout: the cart page stores the keys the
  // customer ticked; only those are ordered (and only those leave the
  // cart). No stored selection = the whole cart, as before.
  const [checkoutKeys] = useState(() => {
    try {
      const k = JSON.parse(sessionStorage.getItem("malac_checkout_keys") || "null");
      return Array.isArray(k) && k.length ? k : null;
    } catch { return null; }
  });
  const orderItems = checkoutKeys ? items.filter((i) => checkoutKeys.includes(i.key)) : items;
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({
    fullName: user?.name || "", phone: user?.phone || "",
    province: "Punjab", city: "Lahore", area: "", street: "", postalCode: "",
    lat: null, lng: null, mapsUrl: "",
  });
  const [savedId, setSavedId] = useState(""); // "" = typing a new address
  // Order email is REQUIRED at checkout (owner's rule, 2026-11-11,
  // Daraz-style): every order carries a real email so the confirmation
  // and shipping updates always reach the customer — including
  // phone-signup accounts whose account email is a placeholder.
  const [email, setEmail] = useState(isRealEmail(user?.email) ? user.email : "");
  // Daraz-style address flow (owner's ask, 2026-11-12): step 1 shows
  // ONE of three views — "card" (the saved address, Daraz checkout
  // style, with EDIT), "book" (the Select Shipping Address page) or
  // "form" (add/edit one address). Name, phone AND email are saved
  // WITH the address the first time and applied automatically on every
  // later checkout; nothing is asked again until the customer edits it.
  const [addrView, setAddrView] = useState("form"); // "card" | "book" | "form"
  const [book, setBook] = useState(null); // freshest address book (API responses)
  const bookList = book ?? user?.addresses ?? [];
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrMsg, setAddrMsg] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Standard");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [wallets, setWallets] = useState(null); // from GET /settings/public
  const [manual, setManual] = useState({ screenshotPath: "", transactionId: "", senderAccount: "", senderTitle: "" });
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api.get("/settings/public").then((r) => setWallets(r.data.payments)).catch(() => setWallets(null));
  }, []);

  // The address book is fetched FRESH on checkout mount: the auth
  // context loads /auth/me once at app start, so an address the
  // customer saved minutes ago in Account Settings would otherwise be
  // missing here until a full reload (owner report, 2026-11-12 —
  // "settings me save kiya, checkout par nahi aa raha"). If the fresh
  // book no longer contains the address that was auto-applied from the
  // stale context copy (edited/deleted in Settings), re-apply from the
  // fresh list instead.
  useEffect(() => {
    let alive = true;
    api.get("/auth/me")
      .then((r) => {
        if (!alive || !Array.isArray(r.data.user?.addresses)) return;
        const list = r.data.user.addresses;
        setBook(list);
        if (savedIdRef.current && !list.some((a) => a._id === savedIdRef.current)) {
          const def = list.find((a) => a.isDefault) || list[0];
          if (def?._id) { pickSaved(def._id); setAddrView("card"); }
          else { pickSaved(""); setAddrView("form"); }
        }
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The owner's Settings switch: COD disabled in Admin → Settings hides
  // the COD option here (the server refuses COD orders too), and a
  // pre-selected COD moves to the first manual method.
  const codOff = wallets != null && wallets.codEnabled === false;
  useEffect(() => {
    if (codOff && paymentMethod === "COD") setPaymentMethod("JazzCash");
  }, [codOff, paymentMethod]);

  // Picking a saved address fills the whole form — including its
  // live-location pin when it has one, so the pin rides into the order.
  const pickSaved = (id) => {
    setSavedId(id);
    savedIdRef.current = id;
    const a = bookList.find((x) => x._id === id);
    if (!a) {
      setAddress({
        fullName: user?.name || "", phone: user?.phone || "",
        province: "Punjab", city: "Lahore", area: "", street: "", postalCode: "",
        lat: null, lng: null, mapsUrl: "",
      });
      return;
    }
    // Legacy saved addresses predate the province field: adopt the
    // saved province, or infer it from the city when it matches the
    // national dataset (left blank when the city is unknown).
    const city = a.city || "Lahore";
    setAddress({
      fullName: a.fullName || user?.name || "", phone: a.phone || user?.phone || "",
      province: a.province || findCity(city)?.province || "",
      city, area: a.area || "", street: a.street || "",
      postalCode: a.postalCode || "",
      lat: a.lat ?? null, lng: a.lng ?? null, mapsUrl: a.mapsUrl || "",
    });
    // The email saved WITH this address wins over the account email —
    // it is the address's own contact email, entered once by the
    // customer and never asked again (owner's rule, 2026-11-12).
    if (isRealEmail(a.email)) setEmail(a.email);
  };

  // Daraz-style default address: the customer's saved default (or
  // first) address is applied automatically when checkout opens, so
  // they never re-type it — CHANGE on the address card picks another.
  const autoAppliedRef = useRef(false);
  const savedIdRef = useRef("");
  useEffect(() => {
    if (autoAppliedRef.current) return;
    const list = book ?? user?.addresses ?? [];
    if (!list.length) return;
    autoAppliedRef.current = true;
    const def = list.find((a) => a.isDefault) || list[0];
    if (def?._id) { pickSaved(def._id); setAddrView("card"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, book]);
  const selSaved = bookList.find((a) => a._id === savedId) || null;

  // Saving the address form writes it to the address book IMMEDIATELY
  // (Daraz-style: Edit/Add saves the address itself, not just this
  // order) — including the email, which from then on rides with the
  // address. After saving, the customer lands back on the address card.
  const saveAddressToBook = async (e) => {
    e.preventDefault();
    setAddrMsg("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAddrMsg("Please enter a valid email address — order ki confirmation aur updates isi email par jayengi.");
      return;
    }
    setSavingAddr(true);
    try {
      const payload = {
        label: selSaved?.label || "Home",
        fullName: address.fullName, phone: address.phone, email: email.trim(),
        province: address.province, city: address.city, area: address.area,
        street: address.street, postalCode: address.postalCode,
        lat: address.lat, lng: address.lng, mapsUrl: address.mapsUrl,
      };
      const r = savedId
        ? await api.put(`/auth/addresses/${savedId}`, payload)
        : await api.post("/auth/addresses", { ...payload, isDefault: bookList.length === 0 });
      const list = r.data.addresses || [];
      setBook(list);
      if (!savedId) {
        const added = [...list].reverse().find((a) => a.street === address.street && a.phone === address.phone) || list[list.length - 1];
        if (added?._id) setSavedId(added._id);
      }
      setAddrView("card");
    } catch (err) {
      setAddrMsg(err.response?.data?.message || "Address save nahi ho saka — dobara try karein.");
    } finally { setSavingAddr(false); }
  };

  const applyLocation = ({ lat, lng, mapsUrl, addressLine, area, city }) => {
    setAddress((cur) => {
      // Adopt the reverse-geocoded city when it matches the national
      // dataset (case-insensitive), bringing its province along. A
      // geocoded name outside the dataset is still kept as the city
      // (LocationSelect pins it as an extra option) and the province
      // is left as the customer picked it.
      const hit = findCity(city);
      return {
        ...cur, lat, lng, mapsUrl,
        street: addressLine || cur.street,
        area: area || cur.area,
        province: hit ? hit.province : cur.province,
        city: hit ? hit.city : (city || cur.city),
      };
    });
  };

  const discount = coupon?.discount || 0;
  const shipping = useMemo(() => {
    if (orderItems.length === 0) return 0;
    if (deliveryMethod === "Express") return wallets?.expressShippingFee ?? 399;
    return subtotal - discount >= (wallets?.freeShippingThreshold ?? 3000) ? 0 : (wallets?.defaultShippingFee ?? 249);
  }, [orderItems, deliveryMethod, subtotal, discount, wallets]);
  const total = subtotal - discount + shipping;
  // Daraz-style "Total Saving": coupon discount + the standard fee saved
  // when this order ships free.
  const totalSaving = discount + (shipping === 0 && deliveryMethod === "Standard" && orderItems.length > 0 ? (wallets?.defaultShippingFee ?? 249) : 0);
  const isManual = MANUAL.includes(paymentMethod);
  const walletInfo = isManual && wallets ? wallets[WALLET_KEY[paymentMethod]] : null;

  // Voucher feedback lives in its OWN state rendered right under the
  // voucher row — it used to write into the order-level `error`, which
  // only renders on the payment step, so Apply looked completely dead
  // on the address/delivery steps (Abdullah, 2026-11-11).
  const [couponMsg, setCouponMsg] = useState(null); // { kind: "ok"|"err", text }
  const [applying, setApplying] = useState(false);
  const applyCoupon = async () => {
    const c = code.trim();
    if (!c) { setCouponMsg({ kind: "err", text: "Pehle voucher code likhein, phir Apply dabayein." }); return; }
    setApplying(true);
    try {
      const r = await api.get(`/coupons/validate/${c}`, { params: { subtotal } });
      if (r.data.valid) {
        setCoupon(r.data);
        setCouponMsg({ kind: "ok", text: `Voucher lag gaya — aap ko ${rs(r.data.discount)} ki bachat hui.` });
      } else {
        setCoupon(null);
        setCouponMsg({ kind: "err", text: couponReason(r.data.reason) });
      }
    } catch {
      setCoupon(null);
      setCouponMsg({ kind: "err", text: "Voucher check nahi ho saka — connection dekh kar dobara try karein." });
    } finally { setApplying(false); }
  };
  const removeCoupon = () => { setCoupon(null); setCode(""); setCouponMsg(null); };

  const uploadScreenshot = async (file) => {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("screenshot", file);
      const r = await api.post("/uploads/payment-screenshot", fd,
        { headers: { "Content-Type": "multipart/form-data" } });
      setManual((m) => ({ ...m, screenshotPath: r.data.path }));
    } catch (e) {
      setError(e.response?.data?.message || "Screenshot upload failed (max 5 MB, PNG/JPG)");
    } finally { setUploading(false); }
  };

  const placeOrder = async () => {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address — order ki confirmation aur updates isi email par jayengi.");
    if (isManual) {
      if (!walletInfo?.configured) return setError(`${paymentMethod} is not configured by the store yet. Please choose another payment method.`);
      if (!manual.screenshotPath) return setError(`Please upload your ${paymentMethod} payment screenshot first.`);
      if (!manual.transactionId.trim()) return setError("Please enter the transaction ID from your payment receipt.");
      if (!manual.senderAccount.trim()) return setError("Please enter the account number you sent the money from.");
    }
    setPlacing(true);
    try {
      const r = await api.post("/orders", {
        items: orderItems.map((i) => ({ product: i.product, qty: i.qty, variantLabel: i.variantLabel })),
        address: { ...address, email: email.trim() }, paymentMethod, deliveryMethod, couponCode: coupon?.code || "",
        ...(isManual ? {
          paymentScreenshot: manual.screenshotPath,
          transactionId: manual.transactionId.trim(),
          senderAccount: manual.senderAccount.trim(),
          senderTitle: manual.senderTitle.trim(),
        } : {}),
      });
      // Save the delivery address to the customer's address book so
      // the next checkout pre-fills it (Daraz-style default address).
      // Strictly best-effort: an address-book failure must never
      // affect a placed order.
      try {
        const payload = {
          fullName: address.fullName, phone: address.phone, email: email.trim(),
          province: address.province,
          city: address.city, area: address.area, street: address.street,
          postalCode: address.postalCode, lat: address.lat, lng: address.lng,
          mapsUrl: address.mapsUrl,
        };
        if (savedId) {
          const orig = bookList.find((x) => x._id === savedId);
          const same = orig && ["fullName", "phone", "email", "province", "city", "area", "street", "postalCode"]
            .every((f) => (orig[f] || "") === (payload[f] || ""));
          if (!same) {
            const r = await api.put(`/auth/addresses/${savedId}`, payload);
            if (r.data.addresses) setBook(r.data.addresses);
          }
        } else if (address.street && address.city) {
          const r = await api.post("/auth/addresses", {
            ...payload, label: "Home",
            isDefault: bookList.length === 0,
          });
          if (r.data.addresses) setBook(r.data.addresses);
        }
      } catch { /* address book is a convenience, never a blocker */ }
      if (checkoutKeys) {
        // Only the ordered (ticked) items leave the cart.
        orderItems.forEach((i) => remove(i.key));
        try { sessionStorage.removeItem("malac_checkout_keys"); } catch { /* ignore */ }
      } else {
        clear();
      }
      navigate(`/order-confirmation/${r.data.order.orderId}`, { state: { order: r.data.order } });
    } catch (e) {
      if (e.response?.status === 401) navigate(`/login?redirect=${encodeURIComponent("/checkout")}`);
      else setError(e.response?.data?.message || "Could not place order");
    } finally { setPlacing(false); }
  };

  if (orderItems.length === 0) return <main className="max-w-4xl mx-auto px-3 pt-8"><div className="bg-white rounded-md p-8 text-center text-gray-400">Your cart is empty.</div></main>;
  const input = "border rounded px-3 py-2 text-sm w-full";
  const methodCard = (value, Icon, title, sub) => (
    <label className={`flex gap-3 border rounded p-3 cursor-pointer ${paymentMethod === value ? "border-brand bg-brand-light" : ""}`}>
      <input type="radio" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
      <Icon size={18} className="text-brand shrink-0" />
      <span className="flex-1"><b>{title}</b>{sub && <><br /><span className="text-gray-500">{sub}</span></>}</span>
    </label>
  );

  return (
    <main className="max-w-6xl mx-auto px-3 pt-4 grid lg:grid-cols-[1fr_320px] gap-4 items-start pb-10">
      <section className="bg-white rounded-md p-4">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-5">
          {steps.map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 text-xs sm:text-sm ${i <= step ? "text-brand font-medium" : "text-gray-400"}`}>
              <CheckCircle2 size={16} className={`shrink-0 ${i < step ? "text-green-500" : ""}`} />
              <span className={i === step ? "" : "hidden min-[420px]:inline"}>{s}</span>
              {i < steps.length - 1 && <span className="w-3 sm:w-6 border-t mx-0.5 sm:mx-1" />}
            </div>
          ))}
        </div>

        {step === 0 && addrView === "card" && (
          <div>
            <div className="border rounded-md p-3 bg-brand-light/40">
              <div className="flex items-start gap-2">
                <MapPin size={17} className="text-brand shrink-0 mt-0.5" />
                <p className="flex-1 min-w-0 font-semibold text-sm break-words">
                  {address.fullName || user?.name}, {address.phone || user?.phone}
                </p>
                <button
                  type="button"
                  onClick={() => setAddrView("book")}
                  className="shrink-0 text-brand font-semibold text-sm"
                >
                  EDIT
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1.5 break-words">
                <span className="inline-block bg-white border rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide mr-1.5 align-middle">
                  {selSaved?.label || "Home"}
                </span>
                {selSaved?.isDefault && (
                  <span className="inline-block border border-rose-300 text-rose-600 rounded px-1.5 py-0.5 text-[10px] font-semibold mr-1.5 align-middle">
                    Default shipping address
                  </span>
                )}
                {address.street}, {address.area ? `${address.area}, ` : ""}{address.city}
                {address.province ? `, ${address.province}` : ""}
                {address.postalCode ? ` — ${address.postalCode}` : ""}
                {address.lat != null && address.lng != null ? " 📍" : ""}
              </p>
              {email && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Order updates isi email par jayengi: <span className="font-medium">{email}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setStep(1)}
              className="bg-brand text-white rounded px-6 py-2.5 sm:py-2 text-sm font-medium w-full sm:w-auto mt-3"
            >
              Continue to Delivery
            </button>
          </div>
        )}

        {step === 0 && addrView === "book" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                aria-label="Back"
                onClick={() => setAddrView(savedId ? "card" : "form")}
                className="p-1 -ml-1 text-gray-600"
              >
                <ArrowLeft size={19} />
              </button>
              <p className="font-semibold">Select Shipping Address</p>
            </div>
            <button
              type="button"
              onClick={() => { pickSaved(""); setAddrView("form"); }}
              className="block w-full border-2 border-dashed border-brand/60 text-brand rounded-md py-4 text-sm font-semibold mb-3 bg-white"
            >
              + Add address
            </button>
            <div className="space-y-3">
              {bookList.map((a) => (
                <div
                  key={a._id}
                  onClick={() => { pickSaved(a._id); setAddrView("card"); }}
                  className={`border rounded-md p-3 cursor-pointer bg-white ${a._id === savedId ? "border-brand ring-1 ring-brand/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
                    <p className="flex-1 min-w-0 text-sm font-semibold break-words">
                      {a.fullName} <span className="text-gray-500 font-normal">{a.phone}</span>
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); pickSaved(a._id); setAddrView("form"); }}
                      className="shrink-0 text-brand text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {a.street}, {a.area ? `${a.area}, ` : ""}{a.city}
                    {a.province ? `, ${a.province}` : ""}
                    {a.postalCode ? ` — ${a.postalCode}` : ""}
                    {a.lat != null && a.lng != null ? " 📍" : ""}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {a.label || "Home"}
                    </span>
                    {a.isDefault && (
                      <span className="inline-block border border-rose-300 text-rose-600 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                        Default shipping address
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 0 && addrView === "form" && (
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={saveAddressToBook}>
            {bookList.length > 0 ? (
              <div className="sm:col-span-2 flex items-center gap-2 -mb-1">
                <button
                  type="button"
                  aria-label="Back to addresses"
                  onClick={() => setAddrView("book")}
                  className="p-1 -ml-1 text-gray-600"
                >
                  <ArrowLeft size={19} />
                </button>
                <p className="font-semibold text-sm">{savedId ? "Edit Address" : "Add Address"}</p>
              </div>
            ) : (
              <p className="sm:col-span-2 text-xs text-gray-400 -mb-1">
                Ye address aap ke account me save ho jayega — agli baar checkout par khud bhar jayega, baar baar likhna nahi parega.
              </p>
            )}
            <input required placeholder="Full name" className={input} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            <PhoneInput required className={input} value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
            <input required type="email" placeholder="Email address (order updates ke liye lazmi)" className={`${input} sm:col-span-2`} value={email} onChange={(e) => setEmail(e.target.value)} />
            <LocationSelect
              inputClassName={input}
              value={{ province: address.province, city: address.city, area: address.area }}
              onChange={(loc) => setAddress((cur) => ({ ...cur, ...loc }))}
            />
            <input required placeholder="Street address, house no." className={`${input} sm:col-span-2`} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
            <input placeholder="Postal code (optional)" className={input} value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
            <div className="sm:col-span-2 border-t pt-3">
              <LiveLocationButton onLocation={applyLocation} />
              {address.lat != null && address.lng != null ? (
                <p className="text-xs mt-1.5">
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">📍 Location attached</span>{" "}
                  <a href={address.mapsUrl || `https://www.google.com/maps?q=${address.lat},${address.lng}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">View map</a>{" "}
                  <button type="button" onClick={() => setAddress({ ...address, lat: null, lng: null, mapsUrl: "" })} className="text-red-500 hover:underline">Remove pin</button>
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1.5">Ya apni live location se order karein — rider seedha aap ki location par ayega (optional).</p>
              )}
            </div>
            {addrMsg && <p className="sm:col-span-2 text-sm text-red-500">{addrMsg}</p>}
            <div className="sm:col-span-2">
              <button disabled={savingAddr} className="bg-brand text-white rounded px-6 py-2.5 sm:py-2 text-sm font-medium w-full sm:w-auto disabled:opacity-60">
                {savingAddr ? "Saving..." : "Save Address"}
              </button>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Save karne ke baad yehi address har checkout par khud lag jayega — badalna ho to Edit se badal jayega.
              </p>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-3 text-sm">
            {[{ m: "Standard", fee: subtotal - discount >= (wallets?.freeShippingThreshold ?? 3000) ? 0 : (wallets?.defaultShippingFee ?? 249), note: `Get it by ${deliveryWindow("Standard")}` },
              { m: "Express", fee: wallets?.expressShippingFee ?? 399, note: `Get it by ${deliveryWindow("Express")}` }].map((o) => (
              <label key={o.m} className={`flex gap-3 border rounded p-3 cursor-pointer ${deliveryMethod === o.m ? "border-brand bg-brand-light" : ""}`}>
                <input type="radio" checked={deliveryMethod === o.m} onChange={() => setDeliveryMethod(o.m)} />
                <Truck size={18} className="text-brand" />
                <span className="flex-1"><b>{o.m} Delivery</b><br /><span className="text-gray-500">{o.note} to {address.city}</span></span>
                <b>{o.fee === 0 ? "Free" : rs(o.fee)}</b>
              </label>
            ))}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button onClick={() => setStep(0)} className="border rounded px-5 py-2.5 sm:py-2">Back</button>
              <button onClick={() => setStep(2)} className="bg-brand text-white rounded px-6 py-2.5 sm:py-2 font-medium flex-1 sm:flex-none">Continue to Payment</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            {!codOff && methodCard("COD", Banknote, "Cash on Delivery", "Pay in cash when your order arrives.")}
            {methodCard("JazzCash", Smartphone, "JazzCash (Manual Transfer)",
              walletInfo && paymentMethod === "JazzCash" ? "" : "Send money to the store JazzCash account, then upload the screenshot.")}
            {methodCard("Easypaisa", Smartphone, "Easypaisa (Manual Transfer)",
              walletInfo && paymentMethod === "Easypaisa" ? "" : "Send money to the store Easypaisa account, then upload the screenshot.")}
            {methodCard("Meezan Bank", Landmark, "Meezan Bank Transfer",
              walletInfo && paymentMethod === "Meezan Bank" ? "" : "Transfer to the store's Meezan Bank account, then upload the screenshot.")}
            {methodCard("NayaPay", Smartphone, "NayaPay",
              walletInfo && paymentMethod === "NayaPay" ? "" : "Store ke NayaPay number par bhejein, phir screenshot upload karein.")}
            {methodCard("SadaPay", Smartphone, "SadaPay",
              walletInfo && paymentMethod === "SadaPay" ? "" : "Store ke SadaPay number par bhejein, phir screenshot upload karein.")}
            {methodCard("FirstPay — HBL Microfinance Bank", Landmark, "FirstPay — HBL Microfinance Bank",
              walletInfo && paymentMethod === "FirstPay — HBL Microfinance Bank" ? "" : "Store ke FirstPay — HBL Microfinance Bank number par bhejein, phir screenshot upload karein.")}

            {isManual && (
              <div className="border rounded p-3 ml-0 sm:ml-8 space-y-3 bg-gray-50">
                {!wallets ? <p className="text-gray-500">Loading payment accounts...</p>
                : !walletInfo?.configured ? (
                  <p className="text-amber-600">
                    The store has not configured its {paymentMethod} account yet, so this method is
                    unavailable right now. {codOff ? "Please choose another payment method." : "Please choose COD."}
                  </p>
                ) : (
                  <>
                    <p>Send <b>{rs(total)}</b> to this {paymentMethod} account:</p>
                    <div className="bg-white border rounded p-3">
                      <p className="text-xs text-gray-400">Account Title</p>
                      <p className="font-semibold">{walletInfo.accountTitle || "(title not set)"}</p>
                      <p className="text-xs text-gray-400 mt-2">Account Number</p>
                      <p className="font-mono font-semibold tracking-wide">{walletInfo.accountNumber}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      After sending, upload the payment screenshot and enter the transaction details.
                      Your order stays <b>Pending Verification</b> until the MALAC team verifies the payment.
                    </p>
                    <label className="flex items-center gap-2 border border-dashed rounded p-3 bg-white cursor-pointer">
                      <UploadCloud size={18} className="text-brand shrink-0" />
                      <span className="flex-1 min-w-0 break-words">{manual.screenshotPath ? "Screenshot uploaded ✓" : uploading ? "Uploading..." : "Upload payment screenshot (PNG/JPG, max 5 MB)"}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => uploadScreenshot(e.target.files?.[0])} />
                    </label>
                    {manual.screenshotPath && <img src={manual.screenshotPath} alt="Payment screenshot" className="max-h-44 rounded border" />}
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input required placeholder="Transaction ID (e.g. 1234567890)" className={input}
                        value={manual.transactionId} onChange={(e) => setManual({ ...manual, transactionId: e.target.value })} />
                      <input required placeholder="Your account number (sender)" className={input}
                        value={manual.senderAccount} onChange={(e) => setManual({ ...manual, senderAccount: e.target.value })} />
                      <input placeholder="Your account title / name (sender)" className={`${input} sm:col-span-2`}
                        value={manual.senderTitle} onChange={(e) => setManual({ ...manual, senderTitle: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            )}

            {error && <p className="text-red-500">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button onClick={() => setStep(1)} className="border rounded px-5 py-2.5 sm:py-2">Back</button>
              <button onClick={placeOrder} disabled={placing || uploading} className="bg-brand text-white rounded px-6 py-2.5 sm:py-2 font-medium disabled:opacity-60 flex-1 sm:flex-none">
                {placing ? "Placing order..." : `Place Order · ${rs(total)}`}
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="bg-white rounded-md p-4 text-sm space-y-2 lg:sticky lg:top-32">
        <p className="font-semibold">Order Summary</p>
        {orderItems.map((i) => (
          <div key={i.key} className="flex justify-between gap-2">
            <span className="line-clamp-1 min-w-0">{i.title} × {i.qty}</span><span className="shrink-0">{rs(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Voucher code" className="border rounded px-2 py-1.5 flex-1 min-w-0" />
          <button onClick={applyCoupon} disabled={applying} className="bg-brand text-white rounded px-3 disabled:opacity-50">{applying ? "Checking…" : "Apply"}</button>
        </div>
        {coupon ? (
          <p className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 rounded px-2.5 py-1.5 text-xs font-medium">
            <span>{coupon.code} applied — {rs(discount)} off</span>
            <button onClick={removeCoupon} className="text-green-700 font-bold px-1" aria-label="Remove voucher">✕</button>
          </p>
        ) : couponMsg ? (
          <p className={`text-sm font-semibold ${couponMsg.kind === "ok" ? "text-green-600" : "text-red-500"}`}>{couponMsg.text}</p>
        ) : null}
        <div className="flex justify-between"><span>Subtotal</span><span>{rs(subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span className="text-green-600">-{rs(discount)}</span></div>
        <div className="flex justify-between"><span>Shipping ({deliveryMethod})</span><span>{shipping === 0 ? "Free" : rs(shipping)}</span></div>
        {totalSaving > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Total Saving</span><span>{rs(totalSaving)}</span></div>}
        <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-brand">{rs(total)}</span></div>
        {address.lat != null && address.lng != null && (
          <p className="pt-1">
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 text-[11px] font-semibold">Delivery location pinned 📍</span>
          </p>
        )}
        {isManual && <p className="text-[11px] text-gray-400">For {paymentMethod}, the payable total above is the amount to transfer.</p>}
      </aside>
    </main>
  );
}
