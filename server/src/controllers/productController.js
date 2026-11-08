import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { effectivePermissions } from "../utils/permissions.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

// Escape regex metacharacters in user-supplied search text (and cap its
// length) so a query is always a LITERAL substring match — never a
// pattern the caller controls (match-everything / ReDoS tricks).
const escapeRegex = (s) => String(s).slice(0, 64).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, subCategory, minPrice, maxPrice, flashSale, page = 1, limit = 20, sort } = req.query;
  // The admin panel manages the whole catalog through this same endpoint
  // (its calls carry an admin token): staff with the "products" permission
  // see every status, including Archived, so an archived product can be
  // restored from its edit screen. Public callers only ever see
  // Active / Out of Stock.
  let staff = false;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(auth.slice(7), env.jwtSecret);
      const user = await User.findById(decoded.id).select("role permissions permissionsSet");
      if (user && (user.role === "admin" || user.role === "vice-admin")) {
        staff = effectivePermissions(user).includes("products");
      }
    } catch { staff = false; }
  }
  const filter = staff ? {} : { status: { $in: ["Active", "Out of Stock"] } };
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (flashSale === "true") filter.flashSale = true;
  if (search) {
    const literal = escapeRegex(search);
    filter.$or = [
      { title: { $regex: literal, $options: "i" } },
      { tags: { $regex: literal, $options: "i" } },
      { category: { $regex: literal, $options: "i" } },
    ];
  }
  // Price filter and sort run on the EFFECTIVE price — what the customer
  // actually pays (salePrice when a sale is live, else basePrice). Filtering
  // on basePrice hid discounted products from their true price band (QA
  // 2026-11-08: a Rs 1,699-on-sale serum vanished under a Rs 2,000 max).
  // $expr needs the plain conditions split out first.
  const and = [];
  if (minPrice) and.push({ $expr: { $gte: [{ $cond: [{ $gt: ["$salePrice", 0] }, "$salePrice", "$basePrice"] }, Number(minPrice)] } });
  if (maxPrice) and.push({ $expr: { $lte: [{ $cond: [{ $gt: ["$salePrice", 0] }, "$salePrice", "$basePrice"] }, Number(maxPrice)] } });
  if (and.length) filter.$and = and;
  const effectiveAsc = { $addFields: { _eff: { $cond: [{ $gt: ["$salePrice", 0] }, "$salePrice", "$basePrice"] } } };
  const sortMap = { "price-asc": { _eff: 1 }, "price-desc": { _eff: -1 }, newest: { createdAt: -1 }, popular: { sold: -1 } };
  const total = await Product.countDocuments(filter);
  const byPrice = sort === "price-asc" || sort === "price-desc";
  const query = byPrice ? Product.aggregate([effectiveAsc, { $match: filter }]) : Product.find(filter).lean();
  const products = await (byPrice ? query.sort(sortMap[sort]) : query.sort(sortMap[sort] || { createdAt: -1 }))
    .skip((page - 1) * limit).limit(Number(limit));
  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ suggestions: [] });
  const literal = escapeRegex(q);
  const products = await Product.find({
    status: "Active",
    $or: [{ title: { $regex: literal, $options: "i" } }, { tags: { $regex: literal, $options: "i" } }],
  }).select("title slug category").limit(8);
  res.json({ suggestions: products });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  body.slug = body.slug || slugify(`${body.title}-${body.sku || ""}`);
  if (body.stock === 0) body.status = body.status || "Out of Stock";
  const product = await Product.create(body);
  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

// Inline price/stock edit from the admin product table
export const inlineUpdateProduct = asyncHandler(async (req, res) => {
  const allowed = {};
  for (const key of ["basePrice", "salePrice", "stock", "status"]) {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  }
  if (allowed.stock === 0 && !allowed.status) allowed.status = "Out of Stock";
  if (allowed.stock > 0) { const p = await Product.findById(req.params.id); if (p?.status === "Out of Stock") allowed.status = "Active"; }
  const product = await Product.findByIdAndUpdate(req.params.id, allowed, { new: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { status: "Archived" }, { new: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product archived", product });
});

// Only APPROVED reviews are public. The $nin also matches reviews created
// before moderation existed (those have no status field at all).
const PUBLIC_REVIEW_FILTER = { status: { $nin: ["pending", "rejected"] } };

// Recompute a product's public rating aggregates from its PUBLIC reviews
// only — pending/rejected reviews never move the stars.
export async function syncProductRating(productId) {
  const product = await Product.findById(productId);
  if (!product) return null;
  const all = await Review.find({ product: productId, ...PUBLIC_REVIEW_FILTER });
  product.ratingCount = all.length;
  product.ratingAvg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
  product.ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  all.forEach((r) => { product.ratingBreakdown[r.rating] += 1; });
  await product.save();
  return product;
}

export const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.id, ...PUBLIC_REVIEW_FILTER }).sort({ createdAt: -1 });
  res.json({ reviews });
});

export const createReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  // Verified purchase: this customer has a Delivered order containing the
  // product. Anyone logged in may still review (it stays pending for admin
  // approval either way), but only buyers get the badge.
  const bought = req.user?._id
    ? await Order.exists({
        user: req.user._id, status: "Delivered",
        "items.product": product._id,
      })
    : null;
  // Review images: only data URIs produced by POST /api/uploads/review-images
  // (max 3, ~1.4 MB each incl. base64 overhead). Arbitrary URLs are dropped
  // so a review can never hot-link or embed an external address.
  const reviewImages = (Array.isArray(req.body.images) ? req.body.images : [])
    .filter((s) => typeof s === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(s) && s.length < 1500000)
    .slice(0, 3);
  const review = await Review.create({
    product: product._id, user: req.user?._id,
    authorName: req.user?.name || req.body.authorName || "MALAC Customer",
    rating: req.body.rating, comment: req.body.comment || "", images: reviewImages,
    verifiedPurchase: !!bought,
    status: "pending",
  });
  // Public aggregates do NOT change yet — the review publishes only when
  // an admin approves it (adminController.setReviewStatus re-syncs).
  res.status(201).json({ review, product });
});

export const askQuestion = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  product.questions.push({ question: req.body.question, askedBy: req.user?.name || "Guest" });
  await product.save();
  res.status(201).json({ questions: product.questions });
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const q = product.questions.id(req.params.qid);
  if (!q) return res.status(404).json({ message: "Question not found" });
  q.answer = req.body.answer; q.answeredBy = req.user.name;
  await product.save();
  res.json({ questions: product.questions });
});
