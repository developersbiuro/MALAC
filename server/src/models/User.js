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
  // Staff-only password credential (scrypt hash, see utils/password.js).
  // Customers have no password — they use OTP / Google. An empty hash means
  // "no password set": staff set theirs through the approval-gated reset
  // flow (models/PasswordResetRequest.js), never through a public form.
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
