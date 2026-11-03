import mongoose from "mongoose";
import env from "../config/env.js";

// Single-document store settings. Super Admin only via the admin API;
// a safe public subset (payment account details) is exposed for checkout.
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: "store", unique: true },
  storeName: { type: String, default: "MALAC" },
  otpSenderEmail: { type: String, default: env.otpSenderEmail },
  otpSenderPhone: { type: String, default: env.otpSenderPhone },
  whatsappSenderNumber: { type: String, default: env.whatsapp.senderNumber },
  defaultShippingFee: { type: Number, default: 199 },
  expressShippingFee: { type: Number, default: 399 },
  freeShippingThreshold: { type: Number, default: 5000 },
  codEnabled: { type: Boolean, default: true },
  cardPaymentsEnabled: { type: Boolean, default: true }, // simulated in demo
  // JazzCash / Easypaisa manual payment accounts. Defaults come from
  // JAZZCASH_* / EASYPAISA_* env vars (owner-provided shared account);
  // the owner can change them any time in Admin -> Settings.
  jazzcashAccountTitle: { type: String, default: env.jazzcash.accountTitle },
  jazzcashAccountNumber: { type: String, default: env.jazzcash.accountNumber },
  easypaisaAccountTitle: { type: String, default: env.easypaisa.accountTitle },
  easypaisaAccountNumber: { type: String, default: env.easypaisa.accountNumber },
}, { timestamps: true });

settingsSchema.statics.getStore = async function () {
  let doc = await this.findOne({ key: "store" });
  if (!doc) doc = await this.create({ key: "store" });
  return doc;
};

// What checkout may see: wallet details only when actually configured.
settingsSchema.methods.publicPayments = function () {
  const wallet = (title, number) =>
    number ? { configured: true, accountTitle: title, accountNumber: number }
           : { configured: false, accountTitle: "", accountNumber: "" };
  return {
    storeName: this.storeName,
    codEnabled: this.codEnabled,
    cardPaymentsEnabled: this.cardPaymentsEnabled,
    defaultShippingFee: this.defaultShippingFee,
    expressShippingFee: this.expressShippingFee,
    freeShippingThreshold: this.freeShippingThreshold,
    jazzcash: wallet(this.jazzcashAccountTitle, this.jazzcashAccountNumber),
    easypaisa: wallet(this.easypaisaAccountTitle, this.easypaisaAccountNumber),
  };
};

export default mongoose.model("Settings", settingsSchema);
