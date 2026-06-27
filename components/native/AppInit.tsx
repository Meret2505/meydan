"use client";

import { useEffect } from "react";

/**
 * Capacitor-shell bootstrap. Runs once on mount. No-op on the web because
 * the dynamic import only resolves inside the WebView (the plugin's runtime
 * APIs need a native bridge).
 *
 * Today it initializes Google Sign-In with our web client id as the server
 * client id, so the native SDK requests ID tokens whose `aud` matches what
 * NextAuth verifies on the server.
 */
export function AppInit({ googleClientId }: { googleClientId?: string }) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.userAgent.includes("MeydanAndroid")) return;
    if (!googleClientId) return;
    (async () => {
      try {
        const { SocialLogin } = await import("@capgo/capacitor-social-login");
        await SocialLogin.initialize({
          google: { webClientId: googleClientId },
        });
      } catch {
        // Native plugin not available — running on web or older Android. Safe.
      }
    })();
  }, [googleClientId]);
  return null;
}
