import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  fullName: String,
  phone: String,
  // The email that belongs WITH this delivery address (owner's rule,
  // 2026-11-12, Daraz-style): the customer enters it once and it stays
  // saved with the address — checkout pre-fills it from here instead of
  // asking again on every order. It is the per-address contact email;
  // the order snapshot still copies it to order.address.email.
  email: String,
  // Province / territory picked from the national dataset (see
  // client/src/data/pakLocations.js). Optional so addresses saved
  // before the field existed keep loading untouched.
  province: String,
  city: String,
  area: String,
  street: String,
  postalCode: String,
  // Optional live-location pin captured from the customer's device GPS
  // (browser geolocation) so the rider can navigate straight to them.
  lat: Number,
  lng: Number,
  mapsUrl: String,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, required: true, unique: true, index: true },
  // admin = Super Admin, vice-admin = Vice-Admin, customer = Customer.
  // SECURITY: a role is NEVER taken from a sign-up request. Public sign-up
  // always creates "customer"; the single exception is the SUPER_ADMIN_EMAIL
  // allowlist (see authController.signupVerify — email-method sign-ups only).
  // Vice-Admin accounts are created only by the Super Admin inside the
  // admin panel.
  role: { type: String, enum: ["admin", "vice-admin", "customer"], default: "customer" },
  // Vice-Admin section access, chosen per-account by the Super Admin in
  // Roles & Users (keys: products, categories, orders, payments, coupons
  // — see utils/permissions.js). The Super Admin always has every
  // permission regardless of this field.
  permissions: { type: [String], default: [] },
  // Whether `permissions` holds an EXPLICIT choice saved by the Super
  // Admin (panel create form or Access editor). true = the stored array
  // is authoritative, even when empty (empty = NO sections granted).
  // false = the account predates an explicit choice, so an empty array
  // falls back to the legacy default (products + orders) and the
  // Vice-Admin keeps the access they have always had.
  permissionsSet: { type: Boolean, default: false },
  // Optional alternate phone for the SAME account (e.g. the owner's
  // second number). Stored normalized (+92…); every phone-identifier
  // login path matches it as well as the primary phone, and an OTP
  // requested with it is sent to it. "" = none set.
  secondaryPhone: { type: String, default: "" },
  // Password credential (scrypt hash, see utils/password.js; select:false
  // so it is never returned by the API). Customers choose a password at
  // sign-up; it is stored (hashed) only when the account is created, i.e.
  // after the ONE chosen sign-up OTP (email or WhatsApp) verifies — while
  // pending, only the hash rides on the OTP record. Staff never get a password
  // from a public form: theirs is set through the approval-gated reset flow
  // (models/PasswordResetRequest.js). An empty hash means "no password set"
  // (e.g. Google accounts, or staff still in pending_setup).
  passwordHash: { type: String, default: "", select: false },
  // "pending_setup" = staff account created (seed / Super Admin) whose
  // owner has not set a password yet; "active" = normal account.
  accountStatus: { type: String, enum: ["active", "pending_setup"], default: "active" },
  addresses: [addressSchema],
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  googleId: { type: String, index: true, sparse: true },
  avatar: String,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
