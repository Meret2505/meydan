"use client";

import { useState } from "react";
import { ContactSheet } from "@/components/ui/ContactSheet";

export function ContactSheetTrigger({
  name,
  phone,
  seed,
}: {
  name: string;
  phone: string;
  seed: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-[52px] mt-1 rounded-[15px] bg-transparent text-text font-sans font-bold text-[15px] flex items-center justify-center gap-2.5"
        style={{ border: "1.5px solid rgba(255,255,255,.16)" }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A14 14 0 013 6a2 2 0 012-2z" />
        </svg>
        Показать контакт организатора
      </button>
      <ContactSheet
        open={open}
        name={name}
        phone={phone}
        seed={seed}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
