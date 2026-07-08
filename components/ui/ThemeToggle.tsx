"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

const STORAGE_KEY = "meydan.theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage might be unavailable (private mode) — swallow silently;
    // the class is still applied for the current session.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current =
      (document.documentElement.classList.contains("light") ? "light" : "dark") as Theme;
    setTheme(current);
  }, []);

  function switchTo(target: Theme) {
    if (target === theme) return;
    setTheme(target);
    applyTheme(target);
  }

  return (
    <div className="flex rounded-full p-[3px] font-display font-bold text-[12px]" style={{ background: "var(--overlay)", border: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={() => switchTo("dark")}
        aria-label="Dark theme"
        className={cn(
          "px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5",
          theme === "dark" ? "bg-primary text-primary-text" : "text-text-muted",
        )}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => switchTo("light")}
        aria-label="Light theme"
        className={cn(
          "px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5",
          theme === "light" ? "bg-primary text-primary-text" : "text-text-muted",
        )}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </div>
  );
}
