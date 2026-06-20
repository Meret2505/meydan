import { cache } from "react";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
