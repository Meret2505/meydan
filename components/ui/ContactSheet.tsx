"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function pretty(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("993")) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }
  return phone;
}

export function ContactSheet({
  open,
  name,
  phone,
  seed,
  onClose,
}: {
  open: boolean;
  name: string;
  phone: string;
  seed: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const waNumber = phone.replace(/\D/g, "");

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(5,7,6,.6)" }}
      />
      <div
        className="relative px-6 pb-9 pt-2.5 rounded-t-[26px] border-t border-white/[0.08]"
        style={{ background: "#14191A" }}
      >
        <div className="w-10 h-1 rounded mx-auto bg-white/20 mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-display font-extrabold text-[16px] text-[#06210F]"
            style={{
              background: `linear-gradient(140deg, hsl(${hue(seed)} 70% 55%), hsl(${
                (hue(seed) + 30) % 360
              } 70% 40%))`,
            }}
          >
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[16px] truncate">{name}</div>
            <div className="text-text-muted text-[13px] font-semibold mt-0.5">
              {pretty(phone)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <a
            href={`tel:${phone}`}
            className="w-full h-14 rounded-[15px] bg-primary text-primary-text font-display font-extrabold text-[16px] flex items-center justify-center gap-2.5"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A14 14 0 013 6a2 2 0 012-2z" />
            </svg>
            Позвонить
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="w-full h-14 rounded-[15px] flex items-center justify-center gap-2.5 font-display font-extrabold text-[16px]"
            style={{
              background: "rgba(37,211,102,.1)",
              border: "1.5px solid rgba(37,211,102,.45)",
              color: "#25D366",
            }}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 20.5l1.5-5.5A8.5 8.5 0 1121 11.5z" />
              <path d="M8.5 9.5c0 3.5 2.5 6 6 6 .8 0 1.3-.6 1.3-1.2 0-.4-1.6-1.1-2-1.1-.5 0-.7.7-1.1.7-.8 0-2.5-1.7-2.5-2.5 0-.4.7-.6.7-1.1 0-.4-.7-2-1.1-2-.6 0-1.2.5-1.2 1.3z" />
            </svg>
            Написать в WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-[14px] bg-transparent text-text-muted font-sans font-semibold text-[15px]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
