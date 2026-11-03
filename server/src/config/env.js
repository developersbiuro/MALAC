import dotenv from "dotenv";
dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });
dotenv.config(); // also allow server/.env

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/malac",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  seedToken: process.env.SEED_TOKEN || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Super Admin allowlist: the ONLY email/phone that may ever hold the
  // "admin" (Super Admin) role. Public sign-up can never grant staff roles;
  // a fully verified sign-up with exactly this email is the owner account.
  // There is no public admin registration anywhere in the app.
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || "developersbiuro@gmail.com").toLowerCase(),
  superAdminPhone: process.env.SUPER_ADMIN_PHONE || "+923236016684",
  otpDemoMode: process.env.OTP_DEMO_MODE !== "false",
  otpSenderEmail: process.env.OTP_SENDER_EMAIL || "developersbiuro@gmail.com",
  otpSenderPhone: process.env.OTP_SENDER_PHONE || "+923236016684",
  otpSenderName: process.env.OTP_SENDER_NAME || "MALAC",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    senderNumber: process.env.WHATSAPP_SENDER_NUMBER || "+923236016684",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    fromNumber: process.env.TWILIO_FROM_NUMBER || "+923236016684",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  // Manual mobile-wallet payments. Defaults below are the store accounts
  // provided by the owner (the SAME account for JazzCash and Easypaisa).
  // They stay configurable via .env or Admin -> Settings — never hard-code
  // them in UI/business logic, and never reuse the OTP sender number here.
  jazzcash: {
    accountTitle: process.env.JAZZCASH_ACCOUNT_TITLE || "Muhammad Abdullah",
    accountNumber: process.env.JAZZCASH_ACCOUNT_NUMBER || "+923036253428",
  },
  easypaisa: {
    accountTitle: process.env.EASYPAISA_ACCOUNT_TITLE || "Muhammad Abdullah",
    accountNumber: process.env.EASYPAISA_ACCOUNT_NUMBER || "+923036253428",
  },
};
export default env;
