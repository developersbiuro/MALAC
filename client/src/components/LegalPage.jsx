import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Shared layout for the store's legal pages (/terms, /policy): cream
// background, Cinzel title with an orange eyebrow, Cormorant section
// headings, and a Back to Store link — matching the ported luxury theme.
export function LegalSection({ title, children }) {
  return (
    <section className="mt-7">
      <h2 className="font-serif text-2xl font-semibold text-lux-ink">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function LegalPage({ eyebrow, title, intro, children }) {
  return (
    <main className="max-w-4xl mx-auto px-4 pt-6 pb-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-lux-burnt font-medium hover:underline">
        <ArrowLeft size={16} /> Back to Store
      </Link>
      <p className="eyebrow mt-6">{eyebrow}</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1.5">{title}</h1>
      {intro && <p className="text-sm text-gray-500 leading-relaxed mt-3">{intro}</p>}
      {children}
      <p className="text-xs text-gray-400 mt-10 border-t border-cream-line pt-4">
        Questions? Email us at info@malac.pp.ua or WhatsApp +92 3236016684.
      </p>
    </main>
  );
}
