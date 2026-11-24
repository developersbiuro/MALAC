import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const subCategories = (req.body.subCategories || []).map((s) =>
    typeof s === "string" ? { name: s, slug: slugify(s) } : { ...s, slug: s.slug || slugify(s.name) });
  const category = await Category.create({
    ...req.body, slug: req.body.slug || slugify(req.body.name), subCategories,
  });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  // Never orphan products (audit L10, 2026-11-24): products carry the
  // category NAME as a string, so deleting the category while products
  // still use it would silently drop them from every category page.
  const inUse = await Product.countDocuments({ category: category.name });
  if (inUse > 0) {
    return res.status(400).json({
      message: `Cannot delete "${category.name}" — ${inUse} product(s) still use this category. Move or archive them first.`,
    });
  }
  await category.deleteOne();
  res.json({ message: "Category deleted" });
});
