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
  // Staff sessions (Super Admin / Vice-Admin) are deliberately shorter
  // than customer sessions: a leaked staff token is far more damaging
  // than a leaked customer token, so staff re-authenticate daily.
  staffJwtExpiresIn: process.env.JWT_STAFF_EXPIRES_IN || "12h",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Super Admin allowlist: the ONLY email/phone that may ever hold the
  // "admin" (Super Admin) role. Public sign-up can never grant staff roles;
  // a fully verified sign-up with exactly this email is the owner account.
  // There is no public admin registration anywhere in the app.
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || "developersbiuro@gmail.com").toLowerCase(),
  superAdminPhone: process.env.SUPER_ADMIN_PHONE || "+923236016684",
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
    // Approved Meta AUTHENTICATION template used for OTP delivery.
    // Template messages are required: plain text only reaches users
    // inside a 24-hour service window opened by the user messaging first.
    otpTemplate: process.env.WHATSAPP_OTP_TEMPLATE || "malac_otp",
    otpTemplateLang: process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en",
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
  // Meta app credentials — used ONLY by the one-off Embedded Signup
  // endpoint (POST /api/whatsapp/embedded-signup) that connects the
  // owner's WhatsApp Business app number to the Cloud API. The app
  // secret is a real secret: it lives in the deployment environment
  // only, is never sent to the client, and never appears in responses.
  meta: {
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
  },
  // Google Gemini (free tier) — powers the MALAC Assistant's AI answers.
  // The key lives ONLY in the deployment environment; when it is absent
  // the assistant endpoint answers 503 and the client silently falls
  // back to the built-in rule-based replies, so the chat never breaks.
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    // gemini-3.8-flash: current free-tier Flash model (Nov 2026);
    // gemini-2.5-flash was retired for new users.
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
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
// Fail LOUD (not silent) if production is running on the built-in
// fallback JWT secret — tokens signed with a publicly known secret can
// be forged by anyone. Set JWT_SECRET in the deployment environment.
if (env.nodeEnv === "production" && env.jwtSecret === "dev-only-secret-change-me") {
  console.error("[MALAC] CRITICAL: JWT_SECRET is not set — using the built-in development fallback. Set JWT_SECRET in the production environment immediately.");
}

export default env;
