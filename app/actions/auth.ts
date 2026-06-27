"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `+993${digits}`;
  if (digits.length === 11 && digits.startsWith("993")) return `+${digits}`;
  return null;
}

export async function phoneLoginOrSignup(formData: FormData) {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  const phone = normalizePhone(rawPhone);
  if (!phone || password.length < 6) {
    return { error: "invalid_input" as const };
  }
  let user = await prisma.user.findFirst({ where: { phone } });

  if (!user) {
    const hashed = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        name: phone,
        phone,
        password: hashed,
        locale,
      },
    });
  } else {
    if (!user.password) return { error: "wrong_password" as const };
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return { error: "wrong_password" as const };
  }

  try {
    await signIn("credentials", {
      phone,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "auth_failed" as const };
    throw e;
  }

  redirect(`/${locale}/onboarding/name`);
}

export async function googleSignIn(locale: string) {
  // Land on the feed; the (main) layout guard sends users with incomplete
  // onboarding to /onboarding/name and lets returning users straight in.
  await signIn("google", { redirectTo: `/${locale}` });
}

/**
 * Server action called from the Capacitor Android shell after the native
 * Google Sign-In SDK returns an ID token. Verifies the token via our
 * "google-id-token" Credentials provider (lib/auth.ts), sets the session
 * cookie, and redirects into the app.
 */
export async function googleIdTokenSignIn(idToken: string, locale: string) {
  if (!idToken) return { error: "missing_token" as const };
  try {
    await signIn("google-id-token", {
      idToken,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "auth_failed" as const };
    throw e;
  }
  redirect(`/${locale}`);
}
