import { cache } from "react";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";

// Reusable Google ID-token verifier (Capacitor Android shell calls this via
// the "google-id-token" Credentials provider below). The native Google SDK
// is configured with serverClientId = GOOGLE_CLIENT_ID, so the ID token's
// audience is the same web client id we use for the OAuth web flow.
const googleVerifier = new OAuth2Client();

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboardingComplete: boolean;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  // Mobile Chrome can drop the default SameSite=Lax PKCE/state cookies during
  // the Google round-trip on the OAuth redirect, which surfaces as
  // "InvalidCheck: pkceCodeVerifier value could not be parsed" on the
  // callback. SameSite=None (with Secure=true, which __Secure- already
  // requires) is the standard fix for this.
  cookies: {
    pkceCodeVerifier: {
      name: "__Secure-authjs.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    state: {
      name: "__Secure-authjs.state",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    nonce: {
      name: "__Secure-authjs.nonce",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Mobile Chrome drops the PKCE cookie on the Google round-trip even
      // with SameSite=None. PKCE is only required for *public* clients (no
      // secret); ours is a confidential web client so omitting it is safe.
      // `state` + `nonce` still verify the callback hasn't been tampered with.
      checks: ["state", "nonce"],
    }),
    Credentials({
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!phone || !password) return null;
        const user = await prisma.user.findFirst({ where: { phone } });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email ?? undefined };
      },
    }),
    Credentials({
      // Used by the Android (Capacitor) shell. The native Google Sign-In SDK
      // produces an ID token; we verify it server-side, then upsert the user
      // and return the same shape Phone/Google providers do.
      id: "google-id-token",
      name: "Google",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken as string | undefined;
        const audience = process.env.GOOGLE_CLIENT_ID;
        if (!idToken || !audience) return null;
        const ticket = await googleVerifier.verifyIdToken({
          idToken,
          audience,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified || !payload.sub) return null;
        const email = payload.email ?? undefined;
        const name = payload.name ?? email ?? "Google user";
        const avatar = payload.picture ?? undefined;
        // Find by email or create. (Account-table linking happens through the
        // standard Google OAuth provider on web — for the native shell we just
        // need the User row so the phone-based join paths work.)
        let user = email
          ? await prisma.user.findFirst({ where: { email } })
          : null;
        if (!user) {
          user = await prisma.user.create({
            data: { name, email, avatar, locale: "ru" },
          });
        }
        return { id: user.id, name: user.name, email: user.email ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) (token as Record<string, unknown>).userId = user.id;
      const t = token as Record<string, unknown>;
      const userId = t.userId as string | undefined;
      // Resolve onboardingComplete lazily and cache it in the token.
      // Onboarding is one-way (once a phone is set it stays), so once this is
      // true we never need to hit the DB again on subsequent requests.
      // `trigger === "update"` forces a re-check (used right after onboarding).
      if (userId && (t.onboardingComplete !== true || trigger === "update")) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true },
        });
        t.onboardingComplete = !!dbUser?.phone;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      const userId = t.userId as string | undefined;
      if (userId && session.user) {
        session.user.id = userId;
        session.user.onboardingComplete = t.onboardingComplete === true;
      }
      return session;
    },
  },
});

/**
 * Request-deduped session accessor. Multiple calls within a single server
 * render (e.g. the layout and the page) share one resolution instead of each
 * paying a fresh round-trip.
 */
export const getSession = cache(auth);
