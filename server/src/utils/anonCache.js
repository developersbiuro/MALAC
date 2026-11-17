// Short in-memory cache for ANONYMOUS public catalogue reads
// (Abdullah, 2026-11-17: product lists took 1–2 s per call from
// Pakistan on slow mobile data, so pages sat on "Loading products…").
// Vercel's edge did not cache these function responses (it rewrites
// the Cache-Control header and reports MISS), so the cache lives in
// the function itself: a warm instance answers repeat catalogue reads
// from memory in milliseconds instead of re-querying Atlas.
//
// Safety rules:
// - Requests with an Authorization header NEVER touch this cache —
//   staff see different data through the same endpoints (Archived
//   products), and they must always get a fresh, personal answer.
// - Only 200 responses are stored, keyed by the full URL + query.
// - Entries expire after the TTL; order placement re-prices and
//   re-checks stock server-side, so a briefly stale list can never
//   sell anything at a wrong price.
const store = new Map();
const MAX_ENTRIES = 200;

export const anonCache = (ttlMs) => (req, res, next) => {
  if (req.headers.authorization) return next();
  const key = req.originalUrl || req.url;
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    res.status(hit.status);
    return res.json(hit.body);
  }
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      store.set(key, { at: Date.now(), status: 200, body });
      if (store.size > MAX_ENTRIES) {
        store.delete(store.keys().next().value);
      }
    }
    return originalJson(body);
  };
  return next();
};
