"use client";

import { useRouter } from "next/navigation";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="back"
      className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center"
    >
      <span className="inline-block w-2.5 h-2.5 border-l-2 border-b-2 border-text rotate-45 ml-1" />
    </button>
  );
}
