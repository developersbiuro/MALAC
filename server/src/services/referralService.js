import crypto from "crypto";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { sendPushToUser } from "./pushService.js";

// Invite-a-Friend (owner, 2026-11-15; reward stages set by the owner
// the same day): the inviter earns a Rs. 100 discount coupon the moment
// the invited friend CREATES AN ACCOUNT, and a Rs. 300 coupon when the
// friend places their FIRST ORDER. The friend gets free shipping on
// their first order. Each stage fires exactly once per referred friend
// (stamp fields on the friend's account).

const SIGNUP_REWARD = 100; // Rs. off for the inviter at friend sign-up
const SIGNUP_MIN_SPEND = 500;
const ORDER_REWARD = 300; // Rs. off for the inviter at friend's 1st order
const ORDER_MIN_SPEND = 2000; // owner, 2026-11-15
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

async function mintRewardCoupon(referrerId, value, minSpend, referralFor = null) {
  let code = "";
  for (let i = 0; i < 5 && !code; i++) {
    const candidate = "REF-" + randomCode(6);
    if (!(await Coupon.exists({ code: candidate }))) code = candidate;
  }
  if (!code) return "";
  await Coupon.create({
    code, type: "fixed", value, minSpend,
    expiresAt: new Date(Date.now() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000),
    active: true, usageLimit: 1, usedCount: 0,
    issuedTo: referrerId, source: "referral", referralFor,
  });
  return code;
}

// One reward stage, shared shape: stamp the friend's account first (so
// the stage can never fire twice), then mint + push. Best-effort — a
// reward failure never blocks a sign-up or an order.
async function issueStage(friendId, stampField, value, minSpend, pushTitle, pushBody, linkFriend = false) {
  try {
    const friend = await User.findById(friendId);
    if (!friend?.referredBy || friend[stampField]) return;
    friend[stampField] = new Date();
    await friend.save();
    const referrer = await User.findById(friend.referredBy);
    if (!referrer || referrer.role !== "customer") return;
    const code = await mintRewardCoupon(referrer._id, value, minSpend, linkFriend ? friend._id : null);
    if (!code) return;
    await sendPushToUser(referrer._id, {
      title: pushTitle,
      body: pushBody(friend, code),
      data: { type: "referral_reward", code },
    }).catch(() => {});
  } catch { /* best-effort */ }
}

// Stage 1 — the friend just created their account: inviter gets Rs. 100.
export async function issueSignupReward(newUserId) {
  await issueStage(newUserId, "referralSignupRewardedAt", SIGNUP_REWARD, SIGNUP_MIN_SPEND,
    "🎉 Dost ne account bana lia — Rs. 100 discount mila!",
    (friend, code) => `${friend.name?.split(" ")[0] || "Aap k dost"} MALAC par aa gaya. Aap ka Rs. 100 coupon code: ${code} — My Account → Invite a Friend me dekhein.`);
}

// Stage 2 — the friend just placed their FIRST order: inviter gets
// Rs. 300. Called from createOrder after the order exists; the order
// count check makes sure it really is the first (cancelled tries do
// not count, matching the free-shipping rule).
export async function issueFirstOrderReward(buyerId) {
  try {
    const buyer = await User.findById(buyerId).select("referredBy referralFirstOrderRewardedAt");
    if (!buyer?.referredBy || buyer.referralFirstOrderRewardedAt) return;
    const orders = await Order.countDocuments({ user: buyerId, status: { $ne: "Cancelled" } });
    if (orders > 1) return;
  } catch { return; }
  await issueStage(buyerId, "referralFirstOrderRewardedAt", ORDER_REWARD, ORDER_MIN_SPEND,
    "🎉 Dost ne pehla order kar dia — Rs. 300 discount mila!",
    (friend, code) => `${friend.name?.split(" ")[0] || "Aap k dost"} ne apna pehla order kar dia. Aap ka Rs. 300 coupon code: ${code} — My Account → Invite a Friend me dekhein.`,
    true);
}

// Owner's rule (2026-11-15): if the friend's first order is cancelled
// or returned, the Rs. 300 coupon it earned is cancelled too. Called
// from both cancellation paths. If the coupon was already spent on a
// real order it stays (the reward was consumed by a genuine purchase
// and the stage does not re-open); if it is still unused it is
// deactivated and the stage re-opens, so a fresh first order can earn
// it again — the cancelled try must not eat the benefit.
export async function revokeFirstOrderReward(buyerId) {
  try {
    const buyer = await User.findById(buyerId).select("referredBy referralFirstOrderRewardedAt");
    if (!buyer?.referredBy || !buyer.referralFirstOrderRewardedAt) return;
    const coupon = await Coupon.findOne({
      issuedTo: buyer.referredBy, source: "referral", referralFor: buyerId, value: ORDER_REWARD,
    });
    if (coupon && coupon.usedCount > 0) return; // already spent — consumed
    if (coupon?.active) {
      coupon.active = false;
      await coupon.save();
    }
    buyer.referralFirstOrderRewardedAt = null;
    await buyer.save();
  } catch { /* best-effort */ }
}
