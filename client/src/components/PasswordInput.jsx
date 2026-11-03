import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Password input with a show/hide (eye) toggle — the shared version of
// the pattern Signup uses inline. The parent keeps full control of the
// value; the given className is passed through untouched apart from
// pr-10, which keeps the text from running under the eye button. Every
// other input prop (placeholder, autoComplete, name, required, disabled,
// minLength, ...) passes through via ...rest.
export default function PasswordInput({ value, onChange, className = "", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={`${className} pr-10`}
        value={value} onChange={onChange} {...rest} />
      <button type="button" tabIndex={-1} aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
