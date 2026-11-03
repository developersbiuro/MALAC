import { OAuth2Client } from "google-auth-library";
import env from "../config/env.js";

// Google sign-in accepts ONLY a real Google ID token (credential),
// verified against GOOGLE_CLIENT_ID with google-auth-library. A plain
// profile object is ALWAYS rejected — nobody can sign in by fabricating
// an email/name. When GOOGLE_CLIENT_ID is not configured, sign-in is
// simply unavailable and this throws a clear not-configured error.
export async function verifyGoogleCredential({ credential } = {}) {
  if (!env.google.clientId) {
    const err = new Error("Google sign-in is not configured");
    err.code = "GOOGLE_NOT_CONFIGURED";
    throw err;
  }
  if (!credential) {
    throw new Error("Google sign-in requires a credential token");
  }
  const client = new OAuth2Client(env.google.clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential, audience: env.google.clientId,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub, email: payload.email,
    name: payload.name || payload.email, avatar: payload.picture || "",
  };
}
export default verifyGoogleCredential;
