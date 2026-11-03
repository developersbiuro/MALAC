import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Truck, CreditCard, Banknote, Smartphone, UploadCloud } from "lucide-react";
import api from "../api/client.js";
import LiveLocationButton from "../components/LiveLocationButton.jsx";
import PhoneInput from "../components/PhoneInput.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rs, deliveryWindow } from "../utils/format.js";
import { useSeo } from "../utils/seo.js";

// NOTE: This page is wrapped in <ProtectedRoute> — guests are redirected to
// /login?redirect=/checkout and return here after login. The server also
// rejects unauthenticated POST /api/orders with 401 (no guest ordering).
const steps = ["Shipping Address", "Delivery Method", "Payment"];
const MANUAL = ["JazzCash", "Easypaisa"];
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Sialkot"];

export default function Checkout() {
  useSeo({ title: "Checkout — MALAC", robots: "noindex" });
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({
    fullName: user?.name || "", phone: user?.phone || "",
    city: "Lahore", area: "", street: "", postalCode: "",
    lat: null, lng: null, mapsUrl: "",
  });
  const [savedId, setSavedId] = useState(""); // "" = typing a new address
  const [deliveryMethod, setDeliveryMethod] = useState("Standard");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
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

  // Picking a saved address fills the whole form — including its
  // live-location pin when it has one, so the pin rides into the order.
  const pickSaved = (id) => {
    setSavedId(id);
    const a = (user?.addresses || []).find((x) => x._id === id);
    if (!a) {
      setAddress({
        fullName: user?.name || "", phone: user?.phone || "",
        city: "Lahore", area: "", street: "", postalCode: "",
        lat: null, lng: null, mapsUrl: "",
      });
      return;
    }
    setAddress({
      fullName: a.fullName || user?.name || "", phone: a.phone || user?.phone || "",
      city: a.city || "Lahore", area: a.area || "", street: a.street || "",
      postalCode: a.postalCode || "",
      lat: a.lat ?? null, lng: a.lng ?? null, mapsUrl: a.mapsUrl || "",
    });
  };

  const applyLocation = ({ lat, lng, mapsUrl, addressLine, area, city }) => {
    setAddress((cur) => ({
      ...cur, lat, lng, mapsUrl,
      street: addressLine || cur.street,
      area: area || cur.area,
      // The checkout city field is a fixed select — only adopt the
      // reverse-geocoded city when it is one of the served cities.
      city: CITIES.includes(city) ? city : cur.city,
    }));
  };

  const discount = coupon?.discount || 0;
  const shipping = useMemo(() => {
    if (items.length === 0) return 0;
    if (deliveryMethod === "Express") return 399;
    return subtotal - discount >= 5000 ? 0 : 199;
  }, [items, deliveryMethod, subtotal, discount]);
  const total = subtotal - discount + shipping;
  const isManual = MANUAL.includes(paymentMethod);
  const walletInfo = isManual && wallets ? wallets[paymentMethod.toLowerCase()] : null;

  const applyCoupon = async () => {
    try {
      const r = await api.get(`/coupons/validate/${code}`, { params: { subtotal } });
      setCoupon(r.data.valid ? r.data : null);
      setError(r.data.valid ? "" : r.data.reason || "Invalid coupon");
    } catch { setError("Could not validate coupon"); }
  };

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
    if (isManual) {
      if (!walletInfo?.configured) return setError(`${paymentMethod} is not configured by the store yet. Please choose another payment method.`);
      if (!manual.screenshotPath) return setError(`Please upload your ${paymentMethod} payment screenshot first.`);
      if (!manual.transactionId.trim()) return setError("Please enter the transaction ID from your payment receipt.");
      if (!manual.senderAccount.trim()) return setError("Please enter the account number you sent the money from.");
    }
    setPlacing(true);
    try {
      const r = await api.post("/orders", {
        items: items.map((i) => ({ product: i.product, qty: i.qty, variantLabel: i.variantLabel })),
        address, paymentMethod, deliveryMethod, couponCode: coupon?.code || "",
        ...(isManual ? {
          paymentScreenshot: manual.screenshotPath,
          transactionId: manual.transactionId.trim(),
          senderAccount: manual.senderAccount.trim(),
          senderTitle: manual.senderTitle.trim(),
        } : {}),
      });
      clear();
      navigate(`/order-confirmation/${r.data.order.orderId}`, { state: { order: r.data.order } });
    } catch (e) {
      if (e.response?.status === 401) navigate(`/login?redirect=${encodeURIComponent("/checkout")}`);
      else setError(e.response?.data?.message || "Could not place order");
    } finally { setPlacing(false); }
  };

  if (items.length === 0) return <main className="max-w-4xl mx-auto px-3 pt-8"><div className="bg-white rounded-md p-8 text-center text-gray-400">Your cart is empty.</div></main>;
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

        {step === 0 && (
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); setStep(1); }}>
            {(user?.addresses?.length > 0) && (
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-500">Deliver to a saved address</span>
                <select className={`${input} mt-1`} value={savedId} onChange={(e) => pickSaved(e.target.value)}>
                  <option value="">Enter a new address manually</option>
                  {user.addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.label || "Home"} — {a.street}, {a.area}, {a.city}{a.lat != null && a.lng != null ? " 📍" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <input required placeholder="Full name" className={input} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
            <PhoneInput required className={input} value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
            <select className={input} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}>
              {(address.city && !CITIES.includes(address.city) ? [address.city, ...CITIES] : CITIES).map((c) => <option key={c}>{c}</option>)}
            </select>
            <input required placeholder="Area / Town" className={input} value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />
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
            <div className="sm:col-span-2"><button className="bg-brand text-white rounded px-6 py-2.5 sm:py-2 text-sm font-medium w-full sm:w-auto">Continue to Delivery</button></div>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-3 text-sm">
            {[{ m: "Standard", fee: subtotal - discount >= 5000 ? 0 : 199, note: `Get it by ${deliveryWindow("Standard")}` },
              { m: "Express", fee: 399, note: `Get it by ${deliveryWindow("Express")}` }].map((o) => (
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
            {methodCard("COD", Banknote, "Cash on Delivery", "Pay in cash when your order arrives.")}
            {methodCard("Card", CreditCard, "Debit / Credit Card", "Simulated in demo — no real payment is processed.")}
            {methodCard("JazzCash", Smartphone, "JazzCash (Manual Transfer)",
              walletInfo && paymentMethod === "JazzCash" ? "" : "Send money to the store JazzCash account, then upload the screenshot.")}
            {methodCard("Easypaisa", Smartphone, "Easypaisa (Manual Transfer)",
              walletInfo && paymentMethod === "Easypaisa" ? "" : "Send money to the store Easypaisa account, then upload the screenshot.")}

            {paymentMethod === "Card" && (
              <div className="grid sm:grid-cols-3 gap-2 pl-8">
                <input placeholder="Card number" className={`${input} sm:col-span-3`} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                <input placeholder="MM/YY" className={input} value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                <input placeholder="CVC" className={input} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
                <p className="text-[11px] text-gray-400 sm:col-span-3">Demo only — card details are not stored.</p>
              </div>
            )}

            {isManual && (
              <div className="border rounded p-3 ml-0 sm:ml-8 space-y-3 bg-gray-50">
                {!wallets ? <p className="text-gray-500">Loading payment accounts...</p>
                : !walletInfo?.configured ? (
                  <p className="text-amber-600">
                    The store has not configured its {paymentMethod} account yet, so this method is
                    unavailable right now. Please choose COD or Card.
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
        {items.map((i) => (
          <div key={i.key} className="flex justify-between gap-2">
            <span className="line-clamp-1 min-w-0">{i.title} × {i.qty}</span><span className="shrink-0">{rs(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Voucher code" className="border rounded px-2 py-1.5 flex-1 min-w-0" />
          <button onClick={applyCoupon} className="bg-brand text-white rounded px-3">Apply</button>
        </div>
        <div className="flex justify-between"><span>Subtotal</span><span>{rs(subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span className="text-green-600">-{rs(discount)}</span></div>
        <div className="flex justify-between"><span>Shipping ({deliveryMethod})</span><span>{shipping === 0 ? "Free" : rs(shipping)}</span></div>
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
