import { Router } from "express";

// REMOVED: the one-time production seed endpoint lived here. It completed
// its job (production database seeded and verified on 2026-11-03) and was
// then unmounted from app.js and gutted, so no seeding route exists in the
// running API anymore. This stub remains only because the snapshot-based
// GitHub workflow cannot delete files; it is not imported anywhere.
// To re-seed a fresh environment, run the seed script instead:
//   npm --prefix server run seed
const router = Router();
export default router;
