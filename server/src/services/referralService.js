import crypto from "crypto";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { sendPushToUser } from "./pushService.js";

// Invite-a-Friend (owner, 2026-11-15): the inviter earns a Rs. 100
// discount coupon when the invited friend's FIRST order is Delivered;
// the friend gets free shipping on their first order. The reward rides
// on a real delivered order only, so fake sign-ups earn nothing.

const REWARD_VALUE = 100; // Rs. off for the inviter
const REWARD_MIN_SPEND = 500; // the reward coupon needs a Rs. 500+ cart
const REWARD_VALID_DAYS = 90;

const randomCode = (n) => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no look-alike chars
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

export async function generateReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return randomCode(10);
}

// The account behind an invite link's ?ref= code, or null. Staff
// accounts never earn referral rewards, so they cannot be referrers.
export async function resolveReferrer(code) {
  const clean = String(code || "").trim().toUpperCase().slice(0, 16);
  if (!clean) return null;
  const referrer = await User.findOne({ referralCode: clean, role: "customer" });
  return referrer || null;
}

// Existing accounts predate referral codes — mint one on first use.
export async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  user.referralCode = await generateReferralCode();
  await user.save();
  return user.referralCode;
}

// Free shipping on the FIRST order for customers who arrived through an
// invite link: they were referred and have no earlier order (cancelled
// orders do not count — a cancelled first try must not eat the benefit).
export async function hasFreeFirstShipping(userId) {
  const user = await User.findById(userId).select("referredBy");
  if (!user?.referredBy) return false;
  const prior = await Order.countDocuments({ user: userId, status: { $ne: "Cancelled" } });
  return prior === 0;
}

// Called when an order reaches Delivered. If the buyer arrived through
// an invite link and the inviter has not been rewarded for them yet,
// issue the inviter a single-use Rs. 100 coupon and push-notify them.
// Best-effort: any failure is swallowed so a status update never blocks.
export async function issueReferralReward(buyerId) {
  try {
    const buyer = await User.findById(buyerId);
    if (!buyer?.referredBy || buyer.referralRewardedAt) return;
    const referrer = await User.findById(buyer.referredBy);
    // Stamp even when the referrer is gone/staff, so this never retries.
    buyer.referralRewardedAt = new Date();
    await buyer.save();
    if (!referrer || referrer.role !== "customer") return;
    let code = "";
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = "REF-" + randomCode(6);
      if (!(await Coupon.exists({ code: candidate }))) code = candidate;
    }
    if (!code) return;
    await Coupon.create({
      code, type: "fixed", value: REWARD_VALUE, minSpend: REWARD_MIN_SPEND,
      expiresAt: new Date(Date.now() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000),
      active: true, usageLimit: 1, usedCount: 0,
      issuedTo: referrer._id, source: "referral",
    });
    await sendPushToUser(referrer._id, {
      title: "🎉 Aap ko Rs. 100 discount mila!",
      body: `${buyer.name?.split(" ")[0] || "Aap k dost"} ka pehla order deliver ho gaya. Aap ka Rs. 100 coupon code: ${code} — My Account → Invite a Friend me dekhein.`,
      data: { type: "referral_reward", code },
    }).catch(() => {});
  } catch { /* best-effort: a reward failure never blocks an order update */ }
}
