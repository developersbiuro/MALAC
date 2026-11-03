import { Router } from "express";
import env from "../config/env.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import { runSeed } from "../seed/seed.js";

const router = Router();

// ONE-TIME production seeding for serverless deployments where the seed
// script cannot be run from a shell. Triple-guarded: (1) the SEED_TOKEN
// env var must be set AND matched, (2) the database must be completely
// empty of catalog/user data or the request is refused (so this path can
// never wipe or duplicate a live store), (3) seeding here only inserts —
// it never clears. Remove this route and the SEED_TOKEN env var right
// after the production database has been seeded.
router.get("/seed-once", async (req, res) => {
  if (!env.seedToken || req.query.token !== env.seedToken) {
    return res.status(404).json({ message: "Not found" });
  }
  try {
    const [products, categories, users] = await Promise.all([
      Product.countDocuments(), Category.countDocuments(), User.countDocuments(),
    ]);
    if (products > 0 || categories > 0 || users > 0) {
      return res.status(409).json({
        message: "Database is not empty; seeding refused",
        products, categories, users,
      });
    }
    const result = await runSeed({ clear: false });
    return res.json({ seeded: true, ...result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
