import mongoose from "mongoose";
import { pathToFileURL } from "url";
import env from "../config/env.js";
import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import OtpToken from "../models/OtpToken.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Review from "../models/Review.js";
import Settings from "../models/Settings.js";
import { slugify } from "../utils/slugify.js";

// Run: npm --prefix server run seed
// SECURITY: the seed creates exactly ONE staff account — the store owner
// as Super Admin (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PHONE). There are NO
// demo staff accounts and NO known/shared passwords: the owner account
// starts as accountStatus "pending_setup" with an empty passwordHash, and
// the owner sets his password the first time via Admin Login ->
// "Forgot password" (verified email OTP to SUPER_ADMIN_EMAIL). Staff can
// also sign in with OTP. Vice-Admins are created later by the Super Admin
// inside Admin -> Roles & Users — never by the seed or any public form.
const categories = [
  { name: "Mobiles & Tablets", icon: "Smartphone", subCategories: ["Smartphones", "Tablets", "Mobile Accessories"] },
  { name: "Electronics", icon: "Tv", subCategories: ["LED TVs", "Audio", "Cameras"] },
  { name: "Fashion", icon: "Shirt", subCategories: ["Men", "Women", "Shoes"] },
  { name: "Home & Living", icon: "Sofa", subCategories: ["Furniture", "Kitchen", "Bedding"] },
  { name: "Beauty & Health", icon: "Sparkles", subCategories: ["Skincare", "Makeup", "Personal Care"] },
  { name: "Groceries", icon: "ShoppingBasket", subCategories: ["Staples", "Snacks", "Beverages"] },
  { name: "Sports & Fitness", icon: "Dumbbell", subCategories: ["Gym Equipment", "Cricket", "Outdoor"] },
  { name: "Toys & Baby", icon: "Baby", subCategories: ["Toys", "Diapers", "Feeding"] },
];

const img = (seed) => `https://picsum.photos/seed/${seed}/700/700`;

const products = [
  { title: "Infinix Note 40 Pro 5G (8GB, 256GB) - Titan Gold", sku: "MOB-INF-N40P", category: "Mobiles & Tablets", subCategory: "Smartphones", basePrice: 84999, salePrice: 74999, stock: 24, flashSale: true, tags: ["infinix", "smartphone", "5g"], desc: "6.78 inch AMOLED 120Hz display, 108MP OIS camera, 70W fast charging with MagCharge wireless support." },
  { title: "Samsung Galaxy A55 5G (8GB, 128GB) - Awesome Iceblue", sku: "MOB-SAM-A55", category: "Mobiles & Tablets", subCategory: "Smartphones", basePrice: 139999, salePrice: 124999, stock: 15, flashSale: true, tags: ["samsung", "galaxy", "smartphone"], desc: "Exynos 1480, 120Hz Super AMOLED, IP67 water resistance and a 50MP triple camera setup." },
  { title: "Xiaomi Redmi Buds 4 Active - Wireless Earbuds", sku: "AUD-XIA-BUDS4", category: "Electronics", subCategory: "Audio", basePrice: 5499, salePrice: 3799, stock: 120, flashSale: true, tags: ["earbuds", "xiaomi", "audio"], desc: "Bluetooth 5.3, up to 28 hours total playtime with case, ENC for clear calls." },
  { title: "Dawlance 1.5 Ton Inverter AC - Econo X Series", sku: "ELE-DAW-AC15", category: "Electronics", subCategory: "LED TVs", basePrice: 184999, salePrice: 164999, stock: 6, tags: ["dawlance", "ac", "inverter"], desc: "Heat and cool inverter AC with T3 compressor, gold-fin coating and up to 60 percent energy saving." },
  { title: "TCL 43 inch 4K UHD Smart TV - P755", sku: "ELE-TCL-43P755", category: "Electronics", subCategory: "LED TVs", basePrice: 124999, salePrice: 104999, stock: 9, flashSale: true, tags: ["tcl", "tv", "4k"], desc: "4K HDR10+, Dolby Vision and Atmos, Google TV with voice remote." },
  { title: "Men Premium Cotton Kurta Shalwar - Off White", sku: "FAS-MEN-KURTA1", category: "Fashion", subCategory: "Men", basePrice: 4999, salePrice: 3499, stock: 60, tags: ["kurta", "men", "eid"], desc: "Breathable premium cotton kurta shalwar, regular fit, available in S to XL.",
    variants: [{ name: "Size", value: "S", priceDelta: 0, stock: 15 }, { name: "Size", value: "M", priceDelta: 0, stock: 20 }, { name: "Size", value: "L", priceDelta: 200, stock: 15 }, { name: "Size", value: "XL", priceDelta: 200, stock: 10 }] },
  { title: "Women Embroidered 3-Piece Lawn Suit - Gulbahar", sku: "FAS-WOM-LAWN3", category: "Fashion", subCategory: "Women", basePrice: 8999, salePrice: 6299, stock: 35, flashSale: true, tags: ["lawn", "women", "3 piece"], desc: "Printed lawn shirt with embroidered neckline, chiffon dupatta and dyed cambric trouser." },
  { title: "Running Shoes for Men - Air Flex, Black", sku: "FAS-SHO-RUN01", category: "Fashion", subCategory: "Shoes", basePrice: 6999, salePrice: 4899, stock: 4, tags: ["shoes", "running", "men"], desc: "Lightweight mesh upper, cushioned EVA sole for daily runs and gym use.",
    variants: [{ name: "Size", value: "UK 8", priceDelta: 0, stock: 2 }, { name: "Size", value: "UK 9", priceDelta: 0, stock: 1 }, { name: "Size", value: "UK 10", priceDelta: 300, stock: 1 }] },
  { title: "Non-Stick Cookware Set 12 Pieces - Granite Coating", sku: "HOM-KIT-NS12", category: "Home & Living", subCategory: "Kitchen", basePrice: 12999, salePrice: 9499, stock: 28, tags: ["cookware", "kitchen", "non stick"], desc: "12-piece granite-coated non-stick set, metal-utensil safe, includes karahi, pots and fry pan." },
  { title: "King Size Bed Sheet Set with 2 Pillow Covers - Maroon", sku: "HOM-BED-KING1", category: "Home & Living", subCategory: "Bedding", basePrice: 3999, salePrice: 2799, stock: 45, tags: ["bed sheet", "cotton", "king"], desc: "144 TC cotton rich fabric, fade resistant, king size fitted look." },
  { title: "Vitamin C Face Serum 30ml - Brightening", sku: "BEA-SKN-VITC", category: "Beauty & Health", subCategory: "Skincare", basePrice: 2499, salePrice: 1699, stock: 80, flashSale: true, tags: ["serum", "vitamin c", "skincare"], desc: "15 percent vitamin C with hyaluronic acid for a brighter, even skin tone." },
  { title: "Basmati Rice Premium Quality - 5kg Bag", sku: "GRO-STP-RICE5", category: "Groceries", subCategory: "Staples", basePrice: 2899, salePrice: 2549, stock: 150, tags: ["rice", "basmati", "grocery"], desc: "Extra long grain aged basmati rice, perfect for biryani and pulao." },
  { title: "Adjustable Dumbbell Pair 2 x 10kg", sku: "SPO-GYM-DB10", category: "Sports & Fitness", subCategory: "Gym Equipment", basePrice: 11999, salePrice: 8999, stock: 12, tags: ["dumbbell", "gym", "fitness"], desc: "Cast iron plates with chrome handles, weight adjustable from 2kg to 10kg per hand." },
  { title: "English Willow Cricket Bat - Grade 1", sku: "SPO-CRK-BAT1", category: "Sports & Fitness", subCategory: "Cricket", basePrice: 24999, salePrice: 19999, stock: 3, tags: ["cricket", "bat", "willow"], desc: "Grade 1 English willow, knocked-in and ready to play, with premium rubber grip." },
  { title: "Baby Diapers Size 4 (9-14kg) - 50 Count", sku: "TOY-BAB-DIA4", category: "Toys & Baby", subCategory: "Diapers", basePrice: 3299, salePrice: 2899, stock: 90, tags: ["diapers", "baby"], desc: "12-hour absorbency, soft breathable material, leak guard protection." },
];

export async function runSeed({ clear = true } = {}) {
  if (clear) {
    console.log("[MALAC seed] Clearing demo collections...");
    await Promise.all([
      User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}),
      Coupon.deleteMany({}), Review.deleteMany({}),
      PasswordResetRequest.deleteMany({}), OtpToken.deleteMany({}),
    ]);
  }

  await User.create([
    // The ONLY staff account: the store owner as Super Admin. No password
    // is seeded (passwordHash stays empty, accountStatus "pending_setup") —
    // the owner sets it via the Forgot password flow (email OTP), or signs
    // in with an OTP. No other admin/vice-admin is ever seeded.
    { name: "Muhammad Abdullah (Store Owner)", email: env.superAdminEmail, phone: env.superAdminPhone, role: "admin", emailVerified: true, phoneVerified: true, accountStatus: "pending_setup", passwordHash: "" },
    { name: "Demo Customer", email: "customer@malac.pk", phone: "+923000000003", role: "customer", emailVerified: true, phoneVerified: true },
  ]);

  await Category.insertMany(categories.map((c, i) => ({
    name: c.name, slug: slugify(c.name), icon: c.icon, sortOrder: i,
    image: img(slugify(c.name)),
    subCategories: c.subCategories.map((s) => ({ name: s, slug: slugify(s) })),
  })));

  const created = [];
  for (const p of products) {
    const doc = await Product.create({
      title: p.title, slug: slugify(`${p.title}-${p.sku}`), description: p.desc,
      images: [img(p.sku.toLowerCase()), img(`${p.sku.toLowerCase()}-b`)],
      category: p.category, subCategory: p.subCategory,
      basePrice: p.basePrice, salePrice: p.salePrice, stock: p.stock, sku: p.sku,
      tags: p.tags, variants: p.variants || [], flashSale: !!p.flashSale,
      flashSaleEndsAt: p.flashSale ? new Date(Date.now() + 14 * 3600 * 1000) : undefined,
      sold: Math.floor(Math.random() * 200), shippingFee: 199, codAvailable: true,
      ratingAvg: 4.3, ratingCount: 12, ratingBreakdown: { 5: 7, 4: 3, 3: 1, 2: 1, 1: 0 },
    });
    created.push(doc);
    await Review.create([
      { product: doc._id, authorName: "Ahmed R.", rating: 5, comment: "Original product, fast delivery to Lahore. Recommended!", verifiedPurchase: true },
      { product: doc._id, authorName: "Fatima K.", rating: 4, comment: "Good quality for the price. Packaging could be better.", verifiedPurchase: true },
    ]);
  }

  await Coupon.create({
    code: "WELCOME10", type: "percentage", value: 10, minSpend: 0,
    maxDiscount: 2000, expiresAt: new Date(Date.now() + 90 * 86400000), active: true,
  });
  await Coupon.create({
    code: "MALAC500", type: "fixed", value: 500, minSpend: 5000,
    expiresAt: new Date(Date.now() + 60 * 86400000), active: true,
  });

  const settings = await Settings.getStore();
  settings.otpSenderEmail = env.otpSenderEmail;
  settings.otpSenderPhone = env.otpSenderPhone;
  settings.jazzcashAccountTitle = env.jazzcash.accountTitle;
  settings.jazzcashAccountNumber = env.jazzcash.accountNumber;
  settings.easypaisaAccountTitle = env.easypaisa.accountTitle;
  settings.easypaisaAccountNumber = env.easypaisa.accountNumber;
  await settings.save();

  console.log(`[MALAC seed] Done: ${categories.length} categories, ${created.length} products, 2 coupons, 2 users (1 Super Admin owner + 1 demo customer).`);
  console.log(`[MALAC seed] Super Admin (only staff account): ${env.superAdminEmail} / ${env.superAdminPhone} — pending password setup via Admin Login -> Forgot password (email OTP). No demo staff accounts exist.`);
  return { categories: categories.length, products: created.length, coupons: 2 };
}

// Script entry point only — importing this module (e.g. from the one-time
// seed route) must not run anything.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  (async () => {
    await mongoose.connect(env.mongoUri);
    console.log("[MALAC seed] Connected.");
    await runSeed({ clear: true });
    await mongoose.disconnect();
  })().catch((e) => { console.error(e); process.exit(1); });
}
