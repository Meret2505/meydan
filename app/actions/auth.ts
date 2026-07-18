"use server";

import { signIn } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { phoneLoginOrSignup as phoneAuth } from "@/lib/services/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

/**
 * Web entry point for phone login/signup.
 *
 * The credential logic — normalization, rate limits, timing-uniform compare,
 * the signup-only password floor, and the unique-phone race — lives in
 * lib/services/auth.ts so the mobile API shares it exactly. What stays here is
 * the part that is genuinely Next-specific: reading FormData, establishing the
 * cookie session, and redirecting.
 */
export async function phoneLoginOrSignup(formData: FormData) {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ru");

  const result = await phoneAuth({
    phone: rawPhone,
    password,
    locale,
    ip: await clientIp(),
  });
  if (!result.ok) return { error: result.error };

  try {
    await signIn("credentials", {
      phone: result.phone,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "auth_failed" as const };
    throw e;
  }

  // New signups pick a display name / district / position; returning users skip
  // straight to the feed.
  redirect(result.isNewSignup ? `/${locale}/onboarding/name` : `/${locale}`);
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
