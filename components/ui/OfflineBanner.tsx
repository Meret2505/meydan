"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

export function OfflineBanner() {
  const locale = useLocale();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  const ru = locale !== "tm";
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="mt-2 pointer-events-auto px-4 py-2 rounded-full bg-danger/90 text-white backdrop-blur flex items-center gap-2 shadow-lg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.5a10 10 0 015-2.6M2 8.8A15 15 0 0110 6M22 8.8a15 15 0 00-5.6-2.5" />
          <path d="M12 20h.01" />
        </svg>
        <span className="font-display font-bold text-[13px]">
          {ru ? "Нет соединения" : "Birikme ýok"}
        </span>
      </div>
    </div>
  );
}
