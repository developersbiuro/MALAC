import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  icon: { type: String, default: "Package" },
}, { _id: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true },
  icon: { type: String, default: "ShoppingBag" }, // lucide icon name (client maps it)
  image: String,
  sortOrder: { type: Number, default: 0 },
  subCategories: [subCategorySchema],
}, { timestamps: true });

export default mongoose.model("Category", categorySchema);
