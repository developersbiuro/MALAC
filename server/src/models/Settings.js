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
  // Meezan Bank account (owner, 2026-11-09): direct bank transfers AND
  // transfers sent from NayaPay / SadaPay / FirstPay HBL all land here —
  // one account behind four checkout methods (see publicPayments).
  meezanAccountTitle: { type: String, default: "Muhammad Abdullah" },
  meezanAccountNumber: { type: String, default: "04820113003065" },
  // MALAC Assistant (chatbot) configuration — edited in Admin → Chatbot.
  // The widget reads ONLY the safe public subset (publicChatbot()).
  chatbotEnabled: { type: Boolean, default: true },
  chatbotName: { type: String, default: "MALAC Assistant" },
  chatbotWelcome: {
    type: String,
    default: "Welcome to MALAC! 👋 I'm your AI Shopping Assistant. How can I help you today? Product dhundhne, order track karne ya delivery/payment ki maloomat ke liye neeche se choose karein ya apna sawal likhein.",
  },
  chatbotInstructions: { type: String, default: "" }, // extra owner instructions for the AI
  chatbotFaqs: [{
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
    _id: false,
  }],
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
    meezan: wallet(this.meezanAccountTitle, this.meezanAccountNumber),
    // Sending apps share the Meezan receiving account (owner, 2026-11-09).
    nayapay: wallet(this.meezanAccountTitle, this.meezanAccountNumber),
    sadapay: wallet(this.meezanAccountTitle, this.meezanAccountNumber),
    firstpay: wallet(this.meezanAccountTitle, this.meezanAccountNumber),
  };
};

// The chatbot's public configuration: only what the storefront widget
// may see (enabled flag, display name, welcome text). Owner FAQs and
// custom AI instructions stay server-side.
settingsSchema.methods.publicChatbot = function () {
  return {
    enabled: this.chatbotEnabled !== false,
    name: this.chatbotName || "MALAC Assistant",
    welcome: this.chatbotWelcome || "",
  };
};

export default mongoose.model("Settings", settingsSchema);
