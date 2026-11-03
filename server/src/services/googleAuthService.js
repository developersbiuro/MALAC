import { OAuth2Client } from "google-auth-library";
import env from "../config/env.js";

// Verifies a Google ID token when GOOGLE_CLIENT_ID is configured.
// DEMO MODE: when it is not configured, a plain profile object sent by the
// client ({ email, name, sub }) is accepted so the button/flow can be tested.
// Never use demo mode in production.
export async function verifyGoogleCredential({ credential, profile }) {
  if (env.google.clientId && credential) {
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
