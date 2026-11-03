import Category from "../models/Category.js";
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
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ message: "Category deleted" });
});
