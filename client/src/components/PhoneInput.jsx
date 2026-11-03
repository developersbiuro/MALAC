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

// The national digits of a RAW value coming out of the text field (user
// typing or pasting into the national-part box). The field only ever shows
// the national part, so a leading "92" here can only be a pasted
// international number, and a leading "0" is the local trunk prefix —
// neither belongs in the national part.
export function nationalDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("92")) d = d.slice(2); // intl paste: 92 + 10 digits
  if (d.startsWith("0")) d = d.replace(/^0+/, ""); // trunk 0 (typed or pasted local form)
  return d.slice(0, 10);
}

// The national digits to DISPLAY for a STORED value. Stored values are
// canonical ("+92" + national digits), so the national part is quite
// literally what follows the "+92" — parsing must use that, NOT the raw
// rules above: re-parsing a partial canonical value like "+923" with the
// raw rules leaks the "92" into the field (the user types one digit and
// three appear). Legacy stored values in 03… shape fall back to the raw
// parse so old addresses still open correctly for editing.
export function displayNational(stored) {
  const s = String(stored || "");
  if (s.startsWith("+92")) return s.slice(3).replace(/\D/g, "").slice(0, 10);
  return nationalDigits(s);
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
        value={group(displayNational(value))}
        onChange={(e) => onChange(normalizePkInput(e.target.value))}
      />
    </div>
  );
}
