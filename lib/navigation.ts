import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// next-intl 4 replaced createSharedPathnamesNavigation with createNavigation,
// which derives everything from the shared routing config.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
