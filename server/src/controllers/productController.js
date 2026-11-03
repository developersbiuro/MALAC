import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, subCategory, minPrice, maxPrice, flashSale, page = 1, limit = 20, sort } = req.query;
  const filter = { status: { $in: ["Active", "Out of Stock"] } };
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (flashSale === "true") filter.flashSale = true;
  if (search) filter.$or = [
    { title: { $regex: search, $options: "i" } },
    { tags: { $regex: search, $options: "i" } },
    { category: { $regex: search, $options: "i" } },
  ];
  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = Number(minPrice);
    if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
  }
  const sortMap = { "price-asc": { salePrice: 1 }, "price-desc": { salePrice: -1 }, newest: { createdAt: -1 }, popular: { sold: -1 } };
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .sort(sortMap[sort] || { createdAt: -1 })
    .skip((page - 1) * limit).limit(Number(limit));
  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ suggestions: [] });
  const products = await Product.find({
    status: "Active",
    $or: [{ title: { $regex: q, $options: "i" } }, { tags: { $regex: q, $options: "i" } }],
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

export const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.id }).sort({ createdAt: -1 });
  res.json({ reviews });
});

export const createReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const review = await Review.create({
    product: product._id, user: req.user?._id,
    authorName: req.user?.name || req.body.authorName || "MALAC Customer",
    rating: req.body.rating, comment: req.body.comment || "", images: req.body.images || [],
  });
  const all = await Review.find({ product: product._id });
  product.ratingCount = all.length;
  product.ratingAvg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1);
  product.ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  all.forEach((r) => { product.ratingBreakdown[r.rating] += 1; });
  await product.save();
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
