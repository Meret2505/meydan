"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

export function FeedOfflineGuard({ children }: { children: React.ReactNode }) {
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

  if (online) return <>{children}</>;

  const ru = locale !== "tm";

  return (
    <div className="flex flex-col items-center justify-center text-center px-9 py-14 gap-4">
      <div className="w-[76px] h-[76px] rounded-full bg-danger/10 border border-danger/25 text-danger flex items-center justify-center">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.5a10 10 0 015-2.6M2 8.8A15 15 0 0110 6M22 8.8a15 15 0 00-5.6-2.5" />
          <path d="M12 20h.01" />
        </svg>
      </div>
      <div>
        <div className="font-display font-extrabold text-[19px]">
          {ru ? "Нет соединения" : "Birikme ýok"}
        </div>
        <div className="text-text-muted text-[14px] mt-2 leading-relaxed max-w-[280px]">
          {ru
            ? "Показаны сохранённые игры. Проверь интернет и потяни, чтобы обновить."
            : "Saklanan oýunlar görkezilýär. Interneti barlap, täzelemek üçin aşak süýrüň."}
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-[46px] px-6 rounded-[13px] bg-primary text-primary-text font-display font-extrabold text-[14px]"
      >
        {ru ? "Повторить" : "Täzeden"}
      </button>
    </div>
  );
}
