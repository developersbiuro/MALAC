import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import RatingStars from "../../components/RatingStars.jsx";
import { customerContact } from "../../utils/customerContact.js";

// Review moderation: every customer review starts "pending" and stays off
// the store until approved here — the anti-defamation gate. API + menu are
// both gated by the "products" permission.
const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default function AdminReviews() {
  const [tab, setTab] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");
  const [qaItems, setQaItems] = useState([]);
  const [qaDrafts, setQaDrafts] = useState({});

  const load = () => {
    const q = tab ? `?status=${tab}` : "";
    api.get(`/admin/reviews${q}`)
      .then((r) => { setReviews(r.data.reviews); setPendingCount(r.data.pendingCount || 0); })
      .catch(() => setError("Could not load reviews."));
  };
  useEffect(load, [tab]);

  // Product Q&A answering (Daraz-style): customers ask on the product page;
  // until now the staff answer endpoint existed but no screen called it, so
  // questions could never be answered. Flattened from the catalogue here.
  const loadQuestions = () => {
    api.get("/products", { params: { limit: 100 } })
      .then((r) => {
        const items = [];
        (r.data.products || []).forEach((p) => (p.questions || []).forEach((q) => items.push({ product: p, q })));
        items.sort((a, b) => new Date(b.q.createdAt || 0) - new Date(a.q.createdAt || 0));
        setQaItems(items);
      })
      .catch(() => {});
  };
  useEffect(loadQuestions, []);

  const answerQuestion = async (productId, qid) => {
    const text = (qaDrafts[qid] || "").trim();
    if (!text) return;
    try {
      await api.post(`/products/${productId}/questions/${qid}/answer`, { answer: text });
      setQaDrafts((d) => ({ ...d, [qid]: "" }));
      loadQuestions();
    } catch { setError("Could not post that answer."); }
  };

  const setStatus = async (id, status) => {
    try {
      const r = await api.patch(`/admin/reviews/${id}/status`, { status });
      setPendingCount(r.data.pendingCount || 0);
      load();
    } catch { setError("Could not update that review."); }
  };

  const statusBadge = (r) => {
    if (r.status === "approved") return <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Approved</span>;
    if (r.status === "rejected") return <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Rejected</span>;
    if (r.status === "pending") return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Pending</span>;
    return <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">Live (older)</span>;
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold">Review Moderation</h1>
      <p className="text-sm text-gray-500 mt-1">
        Customer reviews appear on the store only after approval — nothing goes public unchecked.
        {pendingCount > 0 && <> <b className="text-amber-700">{pendingCount} waiting for approval.</b></>}
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-4 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${tab === t.key ? "bg-lux-gradient text-white border-transparent" : "border-cream-line text-gray-600 bg-white"}`}>
            {t.label}{t.key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>
      <div className="space-y-3 mt-4">
        {reviews.map((r) => {
          const contact = r.user ? customerContact(r.user).line : "";
          return (
            <article key={r._id} className="bg-white rounded-md border border-cream-line p-4">
              <div className="flex items-start gap-2 flex-wrap">
                <RatingStars value={r.rating} />
                <b className="text-sm">{r.authorName}</b>
                {r.verifiedPurchase
                  ? <span className="text-[11px] font-semibold text-green-600">Verified Purchase</span>
                  : <span className="text-[11px] text-gray-400">Not a verified purchase</span>}
                <span className="ml-auto">{statusBadge(r)}</span>
              </div>
              {r.comment && <p className="text-sm mt-1.5 whitespace-pre-wrap">{r.comment}</p>}
              {(r.images || []).map((src, i) => (
                <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded mt-2 inline-block mr-2"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ))}
              <p className="text-xs text-gray-400 mt-2">
                Product: {r.product?.slug
                  ? <Link className="text-lux-burnt underline" to={`/product/${r.product.slug}`}>{r.product.title}</Link>
                  : (r.product?.title || "—")}
                {" · "}{new Date(r.createdAt).toLocaleString()}
                {r.orderId ? ` · Order ${r.orderId}` : ""}
                {contact ? ` · ${contact}` : ""}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {r.status !== "approved" && (
                  <button onClick={() => setStatus(r._id, "approved")} className="px-4 py-1.5 rounded-full text-sm font-semibold bg-green-600 text-white">Approve</button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => setStatus(r._id, "rejected")} className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white border border-red-300 text-red-600">Reject</button>
                )}
                {r.status && r.status !== "pending" && (
                  <button onClick={() => setStatus(r._id, "pending")} className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white border border-cream-line text-gray-600">Move to Pending</button>
                )}
              </div>
            </article>
          );
        })}
        {reviews.length === 0 && (
          <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line">
            {tab === "pending" ? "No reviews are waiting — all caught up." : "No reviews here yet."}
          </p>
        )}
      </div>

      <h2 className="text-lg font-bold mt-10">Customer Questions (Q&amp;A)</h2>
      <p className="text-sm text-gray-500 mt-1">
        Questions customers asked on product pages. Answered ones show on the product page with your name.
        {qaItems.some((x) => !x.q.answer) && <> <b className="text-amber-700">{qaItems.filter((x) => !x.q.answer).length} waiting for an answer.</b></>}
      </p>
      <div className="space-y-3 mt-4">
        {qaItems.map(({ product, q }) => (
          <article key={q._id} className="bg-white rounded-md border border-cream-line p-4">
            <p className="text-sm"><b>Q:</b> {q.question}</p>
            <p className="text-xs text-gray-400 mt-1">
              Product: <Link className="text-lux-burnt underline" to={`/product/${product.slug}`}>{product.title}</Link>
              {q.askedBy ? ` · asked by ${q.askedBy}` : ""}
              {q.createdAt ? ` · ${new Date(q.createdAt).toLocaleString()}` : ""}
            </p>
            {q.answer ? (
              <p className="text-sm mt-2 text-gray-700"><b>A:</b> {q.answer} <span className="text-gray-400">— {q.answeredBy || "MALAC"}</span></p>
            ) : (
              <div className="flex gap-2 mt-3">
                <input value={qaDrafts[q._id] || ""} onChange={(e) => setQaDrafts((d) => ({ ...d, [q._id]: e.target.value }))}
                  placeholder="Write the answer..." className="border rounded px-3 py-2 text-sm flex-1 min-w-0" />
                <button onClick={() => answerQuestion(product._id, q._id)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold bg-lux-gradient text-white shrink-0">Answer</button>
              </div>
            )}
          </article>
        ))}
        {qaItems.length === 0 && (
          <p className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-cream-line">No customer questions yet.</p>
        )}
      </div>
    </div>
  );
}
