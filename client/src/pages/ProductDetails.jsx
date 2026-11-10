import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, Truck, ShieldCheck, BadgeCheck, ChevronDown, Minus, Plus, MessageCircle, Lock, ImagePlus, X } from "lucide-react";
import api from "../api/client.js";
import RatingStars from "../components/RatingStars.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rs, priceOf, discountPct, deliveryWindow } from "../utils/format.js";
import { usePublicSettings } from "../utils/usePublicSettings.js";
import { useSeo } from "../utils/seo.js";

export default function ProductDetails() {
  const { fees } = usePublicSettings();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add, setDrawerOpen } = useCart();
  const { toggle, has } = useWishlist();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [selected, setSelected] = useState({}); // variant group -> variant object
  const [qty, setQty] = useState(1);
  const [city, setCity] = useState("Lahore");
  const [openQa, setOpenQa] = useState(null);
  const [question, setQuestion] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState([]); // data URIs from /uploads/review-images
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    api.get(`/products/${slug}`).then(async (r) => {
      setProduct(r.data.product); setImg(0); setSelected({});
      const rev = await api.get(`/products/${r.data.product._id}/reviews`).catch(() => ({ data: { reviews: [] } }));
      setReviews(rev.data.reviews);
      const rel = await api.get("/products", { params: { category: r.data.product.category, limit: 6 } }).catch(() => ({ data: { products: [] } }));
      setRelated(rel.data.products.filter((p) => p._id !== r.data.product._id));
    }).catch(() => setProduct(null));
  }, [slug]);

  const groups = useMemo(() => {
    const g = {};
    (product?.variants || []).forEach((v) => { (g[v.name] = g[v.name] || []).push(v); });
    return g;
  }, [product]);

  const seoDescription = product?.description ? product.description.trim().slice(0, 155) : undefined;
  // Share image: the product's own photo only when it is an absolute
  // http(s) URL (relative /uploads paths would be broken in shares);
  // otherwise undefined, so useSeo falls back to the branded site image.
  const firstImage = product?.images?.[0];
  const seoImage = firstImage && /^https?:\/\//i.test(firstImage) ? firstImage : undefined;
  useSeo({
    title: product ? `${product.title} — MALAC` : undefined,
    description: seoDescription,
    image: seoImage,
    jsonLd: product
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: seoImage ? [seoImage] : ["https://www.malac.pp.ua/og-image.png"],
            description: seoDescription,
            sku: product.sku || undefined,
            offers: {
              "@type": "Offer",
              url: `https://www.malac.pp.ua/product/${product.slug}`,
              priceCurrency: "PKR",
              price: priceOf(product),
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.malac.pp.ua/" },
              { "@type": "ListItem", position: 2, name: "Shop", item: "https://www.malac.pp.ua/shop" },
              {
                "@type": "ListItem",
                position: 3,
                name: product.category,
                item: `https://www.malac.pp.ua/shop?category=${encodeURIComponent(product.category)}`,
              },
              {
                "@type": "ListItem",
                position: 4,
                name: product.title,
                item: `https://www.malac.pp.ua/product/${product.slug}`,
              },
            ],
          },
        ]
      : undefined,
  });

  if (!product) return <p className="p-8 text-center text-gray-400">Loading product...</p>;

  const variantDelta = Object.values(selected).reduce((s, v) => s + (v?.priceDelta || 0), 0);
  const unitPrice = priceOf(product) + variantDelta;
  const variantLabel = Object.values(selected).filter(Boolean).map((v) => `${v.name}: ${v.value}`).join(", ");
  const variantStock = Object.values(selected).filter(Boolean).reduce((min, v) => Math.min(min, v.stock), product.stock);
  // The delivery charge a customer actually pays is the store Settings
  // fee (Admin → Settings) — the legacy per-product shippingFee field
  // (seeded 199 on every product) is NOT used for charging anywhere.
  const shipping = fees.standard;

  const doAdd = () => {
    // Guest lock: cart is a signed-in function — send guests to login
    // and bring them back to this product afterwards.
    if (!add(product, qty, variantLabel, unitPrice)) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`);
      return;
    }
    setDrawerOpen(true);
  };
  const buyNow = () => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`); return; }
    add(product, qty, variantLabel, unitPrice);
    navigate("/checkout");
  };
  const toggleWish = () => {
    if (!toggle(product)) navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`);
  };

  // Downscale a picked photo to at most 1024px (JPEG) before upload, so
  // review photos stay small on the server and on the product page.
  const downscalePhoto = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("photo"))), "image/jpeg", 0.82);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("photo")); };
    image.src = url;
  });

  const pickReviewPhotos = async (e) => {
    if (!user) { e.target.value = ""; return navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`); }
    const files = [...(e.target.files || [])].slice(0, 3 - reviewPhotos.length);
    e.target.value = "";
    if (!files.length) return;
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("images", await downscalePhoto(f), "review.jpg");
      const r = await api.post("/uploads/review-images", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setReviewPhotos((prev) => [...prev, ...(r.data.images || [])].slice(0, 3));
    } catch {
      setReviewMsg("Photo upload failed — you can still submit the review without photos.");
    } finally { setPhotoBusy(false); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`);
    try {
      await api.post(`/products/${product._id}/reviews`, { rating: myRating, comment: myComment, images: reviewPhotos });
      // Reviews publish only after admin approval (anti-defamation gate),
      // so the new review is NOT added to the public list here.
      setMyComment(""); setReviewPhotos([]);
      setReviewMsg("Thank you! Your review has been submitted — it will appear here after our team approves it.");
    } catch {
      setReviewMsg("Sorry, your review could not be submitted. Please try again.");
    }
  };
  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`);
    const r = await api.post(`/products/${product._id}/questions`, { question });
    setProduct({ ...product, questions: r.data.questions }); setQuestion("");
  };

  return (
    <main className="max-w-7xl mx-auto px-3 pt-3 pb-24 md:pb-6">
      <p className="text-xs text-gray-400 mb-2 break-words"><Link to="/">Home</Link> / <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> / {product.title}</p>
      <div className="bg-white rounded-md p-3 sm:p-5 grid md:grid-cols-[420px_1fr_260px] gap-6">
        {/* Gallery */}
        <div>
          <div className="relative overflow-hidden rounded border" onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}>
            <img src={product.images?.[img] || "/icons/icon.svg"} alt={`${product.title} — ${product.category}`}
              onError={(e) => { if (!e.currentTarget.src.endsWith("/icons/icon.svg")) e.currentTarget.src = "/icons/icon.svg"; }}
              className={`w-full aspect-square object-cover transition-transform duration-200 ${zoom ? "scale-150" : ""}`} />
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
            {(product.images || []).map((src, i) => (
              <button key={i} onClick={() => setImg(i)} className={`border rounded overflow-hidden w-16 h-16 shrink-0 ${i === img ? "border-lux-amber" : ""}`}>
                <img src={src} alt={`${product.title} — photo ${i + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { if (!e.currentTarget.src.endsWith("/icons/icon.svg")) e.currentTarget.src = "/icons/icon.svg"; }} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lux-burnt">{product.category}{product.subCategory ? ` · ${product.subCategory}` : ""}</p>
          <h1 className="font-serif text-2xl font-semibold leading-snug mt-0.5">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm">
            <RatingStars value={product.ratingAvg} size={16} />
            <span className="text-sky-600">{product.ratingCount} ratings</span>
            <span className="text-gray-300">|</span><span className="text-gray-500">{product.sold} sold</span>
            <button onClick={toggleWish} className="ml-auto" aria-label="Wishlist">
              <Heart size={20} className={has(product._id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
            </button>
          </div>
          <div className="bg-cream-soft rounded-xl p-3 mt-3">
            <span className="text-lux-amber text-3xl font-extrabold">{rs(unitPrice)}</span>
            {variantDelta === 0 && product.salePrice > 0 && <>
              <span className="text-gray-400 line-through ml-2 text-sm">{rs(product.basePrice)}</span>
              <span className="bg-lux-gradient text-white text-xs font-bold px-1.5 py-0.5 rounded ml-2 align-middle">-{discountPct(product)}%</span>
              <p className="text-[#059669] text-sm font-semibold mt-1">You Save {rs(product.basePrice - product.salePrice)} ({discountPct(product)}%)</p>
            </>}
          </div>
          {Object.entries(groups).map(([name, variants]) => (
            <div key={name} className="mt-4">
              <p className="text-sm text-gray-500">{name}: <b className="text-gray-800">{selected[name]?.value || "Select"}</b></p>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {variants.map((v) => (
                  <button key={v._id} onClick={() => setSelected((s) => ({ ...s, [name]: v }))}
                    className={`border rounded px-3 py-1.5 text-sm ${selected[name]?._id === v._id ? "border-lux-amber text-lux-burnt" : ""}`}>
                    {v.value}{v.priceDelta ? ` (+${rs(v.priceDelta)})` : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm text-gray-500">Quantity</span>
            <div className="flex items-center border rounded">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2" aria-label="Decrease quantity"><Minus size={14} /></button>
              <span className="px-2 min-w-[1.5rem] text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(variantStock, qty + 1))} className="px-3 py-2" aria-label="Increase quantity"><Plus size={14} /></button>
            </div>
            <span className={`text-sm ${variantStock <= 5 ? "text-red-500" : "text-gray-400"}`}>
              {variantStock > 0 ? `${variantStock} items in stock` : "Out of stock"}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-4 whitespace-pre-line">{product.description}</p>
          <a href={`https://wa.me/923236016684?text=${encodeURIComponent(`Hi MALAC! I'm interested in "${product.title}" (${rs(unitPrice)}). ${window.location.href}`)}`}
            target="_blank" rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#1eb857] text-white rounded-full py-2.5 font-semibold text-sm transition-colors">
            <MessageCircle size={18} /> Order on WhatsApp
          </a>
          <p className="text-[11px] text-gray-400 text-center mt-1.5">Chat with us for instant ordering</p>
        </div>

        {/* Delivery box */}
        <aside className="text-sm space-y-3 border-l pl-4 hidden md:block">
          <p className="font-semibold flex items-center gap-1.5"><Truck size={16} /> Delivery</p>
          <label className="block">City
            <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded w-full mt-1 px-2 py-1.5">
              {["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <p>Standard delivery to {city}: <b>{rs(shipping)}</b></p>
          <p className="text-gray-500">Get it by {deliveryWindow("Standard")}</p>
          <p>Express: <b>{rs(399)}</b> · by {deliveryWindow("Express")}</p>
          {product.codAvailable && <p className="flex items-center gap-1.5 text-green-600"><BadgeCheck size={16} /> Cash on Delivery available</p>}
          <p className="flex items-center gap-1.5 text-gray-500"><ShieldCheck size={16} /> 7-days easy return (change of mind not applicable)</p>
        </aside>
      </div>

      {/* Sticky buy bar */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 bg-white border-t mt-3 rounded-md p-3 z-30">
        <div className="flex gap-3">
          <button onClick={doAdd} disabled={variantStock === 0}
            className="btn-lux flex-1 py-2.5 min-h-[44px]">Add to Cart</button>
          <button onClick={buyNow} disabled={variantStock === 0}
            className="flex-1 bg-lux-ink text-white rounded-full py-2.5 min-h-[44px] font-semibold disabled:opacity-50 hover:bg-lux-deep transition-colors">Buy Now</button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-2.5 text-[12px] text-gray-500">
          <span className="flex items-center gap-1"><Lock size={13} className="text-[#059669]" /> SSL Secured Checkout</span>
          <span className="flex items-center gap-1"><Truck size={13} className="text-[#059669]" /> Free Shipping Over {rs(fees.freeThreshold)}</span>
          <span className="flex items-center gap-1"><BadgeCheck size={13} className="text-[#059669]" /> Cash on Delivery</span>
        </div>
      </div>

      {/* Ratings & reviews */}
      <section id="reviews" className="bg-white rounded-md mt-3 p-4 grid md:grid-cols-[220px_1fr] gap-6">
        <div>
          <p className="font-semibold">Ratings & Reviews</p>
          <p className="text-3xl font-bold mt-2">{(product.ratingAvg || 0).toFixed(1)}<span className="text-base text-gray-400">/5</span></p>
          <RatingStars value={product.ratingAvg} size={16} />
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-xs mt-1.5">
              <span>{star} star</span>
              <div className="flex-1 bg-gray-100 rounded h-2">
                <div className="bg-lux-gold h-2 rounded" style={{ width: `${product.ratingCount ? (product.ratingBreakdown?.[star] || 0) / product.ratingCount * 100 : 0}%` }} />
              </div>
              <span className="text-gray-400">{product.ratingBreakdown?.[star] || 0}</span>
            </div>
          ))}
          <form onSubmit={submitReview} className="mt-4 space-y-2">
            <select value={myRating} onChange={(e) => setMyRating(Number(e.target.value))} className="border rounded px-2 py-1.5 w-full text-sm">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
            </select>
            <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} placeholder="Write a review..." className="border rounded px-2 py-1.5 w-full text-sm" rows={2} />
            <div className="flex items-center gap-2 flex-wrap">
              {reviewPhotos.map((src, i) => (
                <span key={i} className="relative inline-block">
                  <img src={src} alt="Your review photo" className="w-12 h-12 object-cover rounded" />
                  <button type="button" aria-label="Remove photo" onClick={() => setReviewPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5 shadow"><X size={11} /></button>
                </span>
              ))}
              {user && reviewPhotos.length < 3 && (
                <label className="inline-flex items-center gap-1 text-xs text-lux-burnt border border-dashed border-cream-line rounded-full px-3 py-1.5 cursor-pointer hover:bg-cream-50">
                  <ImagePlus size={13} /> {photoBusy ? "Uploading..." : "Add photos"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={pickReviewPhotos} />
                </label>
              )}
            </div>
            <button className="bg-lux-gradient text-white text-sm rounded-full px-4 py-1.5 w-full font-semibold">Submit Review</button>
            {reviewMsg && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-2">{reviewMsg}</p>}
            <p className="text-[11px] text-gray-400">Reviews are checked by our team before they appear, to keep them genuine.</p>
          </form>
        </div>
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r._id} className="border-b pb-3">
              <div className="flex items-center gap-2"><RatingStars value={r.rating} /><b className="text-sm">{r.authorName}</b>
                {r.verifiedPurchase && <span className="text-[11px] text-green-600">Verified Purchase</span>}</div>
              <p className="text-sm mt-1">{r.comment}</p>
              {(r.images || []).map((src, i) => <img key={i} src={src} alt={`Customer review photo for ${product.title}`} className="w-16 h-16 object-cover rounded mt-2 inline-block mr-2" />)}
            </article>
          ))}
          {reviews.length === 0 && <p className="text-gray-400 text-sm">No reviews yet.</p>}
        </div>
      </section>

      {/* Q&A accordion */}
      <section className="bg-white rounded-md mt-3 p-4">
        <p className="font-semibold mb-2">Questions & Answers</p>
        {(product.questions || []).map((q, i) => (
          <div key={q._id} className="border-b py-2">
            <button onClick={() => setOpenQa(openQa === i ? null : i)} className="w-full flex justify-between text-left text-sm font-medium">
              <span>Q: {q.question}</span><ChevronDown size={16} className={openQa === i ? "rotate-180 transition" : "transition"} />
            </button>
            {openQa === i && <p className="text-sm text-gray-600 mt-1.5">{q.answer ? `A: ${q.answer} — ${q.answeredBy || "MALAC"}` : "Not answered yet. Our team usually replies within a day."}</p>}
          </div>
        ))}
        <form onSubmit={submitQuestion} className="flex gap-2 mt-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="Ask a question about this product" className="border rounded px-3 py-2 text-sm flex-1 min-w-0" />
          <button className="bg-lux-gradient text-white text-sm rounded-full px-4 shrink-0 font-semibold">Ask</button>
        </form>
      </section>

      {related.length > 0 && (
        <section className="mt-5">
          <p className="eyebrow">Keep Exploring</p>
          <h2 className="font-serif text-3xl font-semibold leading-none mt-1 mb-3">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {related.slice(0, 5).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
