// Shared Pakistani mobile number input.
//
// Value contract: the PARENT stores the full normalized string
// "+92" + 10 national digits (e.g. "+923001234567") — the same canonical
// form the server stores (see server/src/utils/phone.js) — or "" when
// the field is untouched. This component renders a fixed, non-editable
// "+92" prefix segment and lets the user edit only the national part,
// displayed grouped as "300 1234567" (so with the prefix it reads in the
// familiar local shape, 0300 1234567).
//
// Anything typed or pasted is reduced to digits and re-based onto +92:
// "03001234567", "+92 300 1234567" and "3001234567" all land as
// "+923001234567". Display derivation normalizes too, so older saved
// values still stored in 03… shape render correctly when a form (e.g.
// the address book) is opened for editing.

// The 10 national digits of any raw/partial/stored value.
export function nationalDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("92")) d = d.slice(2); // intl paste: 92 + 10 digits
  if (d.length > 10 && d.startsWith("0")) d = d.replace(/^0+/, ""); // local paste: 0 + 10 digits
  return d.slice(0, 10);
}

// Any raw input -> the stored form: "+92" + national digits, or "".
export function normalizePkInput(raw) {
  const n = nationalDigits(raw);
  return n ? `+92${n}` : "";
}

// A complete Pakistani mobile: +92, then 3, then 9 more digits.
export function isValidPkMobile(value) {
  return /^\+923\d{9}$/.test(String(value || ""));
}

const group = (n) => (n.length > 3 ? `${n.slice(0, 3)} ${n.slice(3)}` : n);

export default function PhoneInput({
  value, onChange, className = "", invalid = false, required = false,
  placeholder = "300 1234567", name, disabled = false,
}) {
  return (
    <div className={`flex items-center ${className} ${invalid ? "border-red-400 ring-1 ring-red-200" : ""}`}>
      <span aria-hidden="true" className="shrink-0 select-none font-semibold text-gray-500 border-r border-gray-200 pr-2 mr-2">+92</span>
      <input
        type="tel" inputMode="tel" autoComplete="tel"
        name={name} required={required} disabled={disabled}
        pattern="3[0-9]{2} ?[0-9]{7}"
        title="Sahi Pakistani mobile number likhein — maslan 0300 1234567"
        className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-400"
        placeholder={placeholder}
        value={group(nationalDigits(value))}
        onChange={(e) => onChange(normalizePkInput(e.target.value))}
      />
    </div>
  );
}
