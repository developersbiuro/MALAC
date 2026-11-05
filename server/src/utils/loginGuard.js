// Per-account failed-password-login guard: temporary lockout with
// escalating duration. In-memory (per server instance), like the rate
// limiter — see middleware/rateLimit.js for the multi-instance caveat.
//
// Policy: 5 consecutive failed password attempts lock the account's
// PASSWORD sign-in for 15 minutes; each further lockout within 24h
// doubles the duration (30, then capped at 60 minutes). A successful
// sign-in clears the record entirely. OTP sign-in is never locked — it
// stays available as the legitimate owner's escape hatch, which also
// bounds the damage of a targeted lockout (an attacker who knows an
// email can at most inconvenience its password login, never take over
// or fully lock out the account).

const MAX_FAILURES = 5;
const BASE_LOCK_MS = 15 * 60 * 1000;
const MAX_LOCK_MS = 60 * 60 * 1000;
const ESCALATION_MEMORY_MS = 24 * 60 * 60 * 1000;

const records = new Map(); // key -> { failures, lockCount, lockedUntil, lastLockAt }

export function loginLockStatus(key) {
  const rec = records.get(key);
  if (!rec || !rec.lockedUntil) return { locked: false };
  const remainingMs = rec.lockedUntil - Date.now();
  if (remainingMs <= 0) {
    rec.lockedUntil = 0;
    return { locked: false };
  }
  return { locked: true, retryAfterSec: Math.ceil(remainingMs / 1000) };
}

export function recordLoginFailure(key) {
  const now = Date.now();
  let rec = records.get(key);
  if (!rec) {
    rec = { failures: 0, lockCount: 0, lockedUntil: 0, lastLockAt: 0 };
    records.set(key, rec);
  }
  // Escalation memory fades after a quiet day.
  if (rec.lastLockAt && now - rec.lastLockAt > ESCALATION_MEMORY_MS) rec.lockCount = 0;
  rec.failures += 1;
  if (rec.failures >= MAX_FAILURES) {
    rec.lockCount += 1;
    const duration = Math.min(BASE_LOCK_MS * 2 ** (rec.lockCount - 1), MAX_LOCK_MS);
    rec.lockedUntil = now + duration;
    rec.lastLockAt = now;
    rec.failures = 0;
  }
  return loginLockStatus(key);
}

export function clearLoginFailures(key) {
  records.delete(key);
}
