import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSeo } from "../utils/seo.js";

// Landing page for Google sign-in (redirect mode). The server verified
// the Google ID token and 302'd here with the session in the URL
// fragment (#t=<jwt>&u=<user json>) — fragments never reach servers or
// logs. Save the session, replay the welcome-guide flag when the trip
// started at sign-up, and continue to the page the user wanted.
export default function AuthComplete() {
  useSeo({ title: "Signing in — MALAC", robots: "noindex" });
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let next = "/";
    try {
      next = sessionStorage.getItem("malac_google_next") || "/";
      if (sessionStorage.getItem("malac_google_guide")) {
        sessionStorage.setItem("malac_guide_pending", "1");
      }
      sessionStorage.removeItem("malac_google_next");
      sessionStorage.removeItem("malac_google_guide");
    } catch { /* storage unavailable — defaults apply */ }
    // Only same-site paths may be honoured as the landing page.
    if (!next.startsWith("/") || next.startsWith("//")) next = "/";

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("t");
    const rawUser = hash.get("u");
    if (token && rawUser) {
      try {
        saveSession({ user: JSON.parse(rawUser), token });
        navigate(next, { replace: true });
        return;
      } catch { /* malformed payload — fall through to login */ }
    }
    navigate("/login?googleError=" + encodeURIComponent("Google sign-in failed. Please try again."), { replace: true });
  }, []);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-neutral-500">Signing you in…</p>
    </div>
  );
}
