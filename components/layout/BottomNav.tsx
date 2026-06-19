"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Tab {
  key: "games" | "teams" | "fields" | "tournaments" | "profile";
  href: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    key: "games",
    href: "/games",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7l4.2 3.1-1.6 5h-5.2L7.8 10z" />
        <path d="M12 7V3.2M16.2 10.1l3.6-1.2M14.6 15.1l2.3 3M9.4 15.1l-2.3 3M7.8 10.1L4.2 8.9" />
      </svg>
    ),
  },
  {
    key: "teams",
    href: "/teams",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" />
        <path d="M16 5.2a3 3 0 010 5.6" />
        <path d="M17 14.2c2 .6 3.5 2.2 3.5 4.8" />
      </svg>
    ),
  },
  {
    key: "fields",
    href: "/fields",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M12 21.5s7-6.7 7-11.5a7 7 0 10-14 0c0 4.8 7 11.5 7 11.5z" />
        <circle cx="12" cy="10" r="2.6" />
      </svg>
    ),
  },
  {
    key: "tournaments",
    href: "/tournaments",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M7 4h10v4.5a5 5 0 01-10 0z" />
        <path d="M7 5.5H4v2A3 3 0 007 11M17 5.5h3v2a3 3 0 01-3 3.5" />
        <path d="M9.5 17.5h5M12 13.5v4" />
      </svg>
    ),
  },
  {
    key: "profile",
    href: "/profile",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06]"
      style={{ background: "#0E1312" }}
    >
      <div className="max-w-md mx-auto flex pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        {TABS.map((tab) => {
          const href = `/${locale}${tab.href}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 transition-colors",
                active ? "text-primary" : "text-[#4f5450]",
              )}
            >
              {tab.icon}
              <span
                className={cn(
                  "text-[11px]",
                  active ? "font-bold" : "font-semibold",
                )}
              >
                {t(tab.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
