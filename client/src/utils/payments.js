// Manual-transfer payment methods: the customer sends money to a store
// account and uploads the screenshot + transaction details for staff
// verification. Meezan Bank = direct bank transfer; NayaPay, SadaPay and
// FirstPay — HBL Microfinance Bank pay the owner's wallet number 03036253428 (owner, 2026-11-09).
// Keep in sync with MANUAL_PAYMENT_METHODS in server/src/models/Order.js.
export const MANUAL_METHODS = ["JazzCash", "Easypaisa", "Meezan Bank", "NayaPay", "SadaPay", "FirstPay — HBL Microfinance Bank"];
export const isManualMethod = (m) => MANUAL_METHODS.includes(m);
// Checkout wallet lookup key in GET /settings/public payments.
export const WALLET_KEY = {
  JazzCash: "jazzcash",
  Easypaisa: "easypaisa",
  "Meezan Bank": "meezan",
  NayaPay: "nayapay",
  SadaPay: "sadapay",
  "FirstPay — HBL Microfinance Bank": "firstpay",
};
