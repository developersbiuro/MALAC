import { OAuth2Client } from "google-auth-library";
import env from "../config/env.js";

// When GOOGLE_CLIENT_ID is configured, ONLY a real Google ID token
// (credential) is accepted and verified — a plain profile object is
// rejected, so nobody can sign in by fabricating an email/name.
// DEMO MODE: only when GOOGLE_CLIENT_ID is NOT configured, a plain profile
// object sent by the client ({ email, name, sub }) is accepted so the
// button/flow can be tested. Never use demo mode in production.
export async function verifyGoogleCredential({ credential, profile }) {
  if (env.google.clientId) {
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
      demo: false,
    };
  }
  if (profile?.email) {
    return {
      googleId: profile.sub || `demo-${profile.email}`,
      email: profile.email, name: profile.name || profile.email,
      avatar: profile.picture || "", demo: true,
    };
  }
  throw new Error("Google sign-in requires a credential token or (demo mode) a profile");
}
export default verifyGoogleCredential;
