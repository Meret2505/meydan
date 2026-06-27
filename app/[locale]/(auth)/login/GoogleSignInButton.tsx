"use client";

import { useLocale } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { googleSignIn } from "@/app/actions/auth";

export function GoogleSignInButton({ label }: { label: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  // The Capacitor Android shell injects "MeydanAndroid" into the UA. Inside
  // the shell we use the native Google Sign-In SDK (no embedded-WebView OAuth)
  // and post the resulting ID token to the "google-id-token" Credentials
  // provider. On web we use the standard NextAuth Google OAuth redirect.
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    setIsNative(navigator.userAgent.includes("MeydanAndroid"));
  }, []);

  async function handleClick() {
    if (!isNative) {
      startTransition(() => googleSignIn(locale));
      return;
    }
    try {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      // Default Google scopes (email + profile) are already included by the
      // native SDK. Passing custom scopes would require modifying the host
      // Android Activity, which we don't need.
      const res = await SocialLogin.login({
        provider: "google",
        options: {},
      });
      const idToken =
        (res as { result?: { idToken?: string } }).result?.idToken ?? null;
      if (!idToken) {
        alert("Не удалось получить токен Google");
        return;
      }
      // Hand the ID token to NextAuth — Credentials provider does the verify
      // + upsert and sets the session cookie. We use the standard callback
      // endpoint so the rest of the auth flow is identical to web.
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("idToken", idToken);
      form.set("callbackUrl", `/${locale}`);
      const cb = await fetch("/api/auth/callback/google-id-token", {
        method: "POST",
        body: form,
        redirect: "follow",
      });
      if (cb.ok || cb.redirected) {
        window.location.href = `/${locale}`;
      } else {
        alert("Не удалось войти через Google");
      }
    } catch (e) {
      const msg =
        (e as { message?: string }).message ?? "Не удалось войти через Google";
      // Cancellation by the user is normal — silently ignore.
      if (!/cancel|aborted/i.test(msg)) alert(msg);
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="h-[58px] rounded-lg bg-[#F2F5F3] text-[#0B0E0D] font-sans font-bold text-[16.5px] flex items-center justify-center gap-3 disabled:opacity-60"
    >
      <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-display font-black text-[15px] text-[#4285F4] border border-[#e3e6e3]">
        G
      </span>
      {label}
    </button>
  );
}
