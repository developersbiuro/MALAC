// Vice-Admin section permissions — the Super Admin chooses how much
// access each Vice-Admin gets (Admin Panel -> Roles & Users). These keys
// gate BOTH the API routes (middleware requirePermission) and the admin
// sidebar/pages, via the effective list sent in the auth payload.
//
// Effective permissions:
//  - Super Admin (role "admin"): ALL keys, always — the stored array is
//    irrelevant for the owner account.
//  - Vice-Admin whose permissions were explicitly saved by the Super
//    Admin (permissionsSet === true): exactly the stored array — EVEN
//    when empty, because the Super Admin deliberately granted nothing.
//  - Vice-Admin with permissionsSet === false (account predates an
//    explicit choice): a non-empty stored array wins; an EMPTY array
//    falls back to the legacy default ["products", "orders"] so those
//    accounts keep the access they have always had.
//  - Customers: none.
export const PERMISSION_KEYS = ["products", "categories", "orders", "payments", "coupons"];

export const LEGACY_VICE_ADMIN_PERMISSIONS = ["products", "orders"];

export function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === "admin") return [...PERMISSION_KEYS];
  if (user.role === "vice-admin") {
    const stored = Array.isArray(user.permissions)
      ? user.permissions.filter((k) => PERMISSION_KEYS.includes(k))
      : [];
    // An explicitly saved choice is authoritative — even when it is the
    // empty array (the Super Admin granted no sections on purpose).
    if (user.permissionsSet === true) return stored;
    return stored.length ? stored : [...LEGACY_VICE_ADMIN_PERMISSIONS];
  }
  return [];
}

// Validates an incoming permissions value from the panel. Returns a
// de-duplicated array of valid keys, or null when the value is not an
// array of known keys (caller answers 400).
export function sanitizePermissions(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const key of input) {
    if (!PERMISSION_KEYS.includes(key)) return null;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

export default effectivePermissions;
