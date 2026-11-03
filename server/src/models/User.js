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
  // admin = Super Admin, vice-admin = Vice-Admin, customer = Customer
  role: { type: String, enum: ["admin", "vice-admin", "customer"], default: "customer" },
  addresses: [addressSchema],
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  googleId: { type: String, index: true, sparse: true },
  avatar: String,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
