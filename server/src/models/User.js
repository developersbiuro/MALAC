import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  fullName: String,
  phone: String,
  city: String,
  area: String,
  street: String,
  postalCode: String,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, required: true, unique: true, index: true },
  // admin = Super Admin, vice-admin = Vice-Admin, customer = Customer.
  // SECURITY: a role is NEVER taken from a sign-up request. Public sign-up
  // always creates "customer"; the single exception is the SUPER_ADMIN_EMAIL
  // allowlist (see authController.signupVerifyPhone). Vice-Admin accounts
  // are created only by the Super Admin inside the admin panel.
  role: { type: String, enum: ["admin", "vice-admin", "customer"], default: "customer" },
  // Password credential (scrypt hash, see utils/password.js; select:false
  // so it is never returned by the API). Customers choose a password at
  // sign-up; it is stored (hashed) only when the account is created, i.e.
  // after BOTH email and phone OTP verification. Staff never get a password
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
