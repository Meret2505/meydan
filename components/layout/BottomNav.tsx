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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7l4.2 3.1-1.6 5h-5.2L7.8 10z" />
      </svg>
    ),
  },
  {
    key: "teams",
    href: "/teams",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 00-3-3.87" />
        <path d="M17 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    key: "fields",
    href: "/fields",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "tournaments",
    href: "/tournaments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M6 9a6 6 0 0012 0V3H6v6z" />
        <path d="M9 21h6M12 17v4M5 5H3v3a3 3 0 003 3M19 5h2v3a3 3 0 01-3 3" />
      </svg>
    ),
  },
  {
    key: "profile",
    href: "/profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-bg/90 backdrop-blur border-t border-border z-40">
      <div className="max-w-md mx-auto flex pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {TABS.map((tab) => {
          const href = `/${locale}${tab.href}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1 text-[11px] font-display font-bold",
                active ? "text-primary" : "text-text-muted",
              )}
            >
              {tab.icon}
              <span>{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
