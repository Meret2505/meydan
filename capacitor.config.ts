import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.meydan.app",
  appName: "MEÝDAN",
  webDir: "public", // unused at runtime (we load the live URL) but required by the CLI
  android: {
    backgroundColor: "#0B0E0D",
    allowMixedContent: false,
    // Marker the login UI looks for, so it can hide the Google button (Google
    // blocks OAuth in embedded WebViews). Phone login works fully in-shell.
    appendUserAgent: "MeydanAndroid",
  },
  server: {
    // The shell loads the deployed PWA. Content updates ship by deploying the
    // website; the native shell only changes when we rev a release.
    url: "https://meydan-chi.vercel.app",
    androidScheme: "https",
    cleartext: false,
    // Lets the WebView follow Google OAuth round-trips back to our origin.
    // Google OAuth itself opens in a Chrome Custom Tab (see auth flow) since
    // Google blocks OAuth in embedded WebViews.
    // Keep this tight: a broad wildcard (e.g. "*.vercel.app") would let the
    // in-app WebView navigate to any Vercel-hosted site. Only our own origin.
    allowNavigation: ["meydan-chi.vercel.app"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#0B0E0D",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
    // Only Google Sign-In is used in the app — excluding the other three keeps
    // their SDKs out of the DEX, shrinking the APK by several MB.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
