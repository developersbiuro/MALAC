import app from "./app.js";
import env from "./config/env.js";
import { connectDB } from "./config/db.js";

// Listen first, then connect: a slow or failing database must never take
// the whole API process down with it (on Vercel a top-level awaited connect
// that throws crashes every function invocation, including /api/health).
// DB-backed routes surface their own errors until the connection is up, and
// the connect failure is logged with its real reason.
app.listen(env.port, () => {
  console.log(`[MALAC] API running on http://localhost:${env.port}`);
  console.log(`[MALAC] Email sender: ${env.otpSenderEmail} | Phone/WhatsApp sender: ${env.otpSenderPhone}`);
});
connectDB().catch((err) => {
  console.error(`[MALAC] MongoDB connection failed: ${err.message}`);
});
