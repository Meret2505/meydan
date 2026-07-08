import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "@/i18n";

// Single source of truth for next-intl 4 routing. Consumed by the middleware
// and the navigation helpers so locale prefixing stays consistent.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
