"use client";

import { useRouter } from "next/navigation";

/**
 * Back navigation control.
 *
 * 44×44 tap area (Apple HIG / Material 48 dp both satisfied) with a proper
 * 22 px stroked chevron so the glyph reads clearly instead of the previous
 * CSS-corner hairline. Colour inherits from the button — pages that place
 * the button on the pitch-green header wrap it in `text-white` for legible
 * contrast in both themes.
 */
export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="Back"
      className="w-11 h-11 rounded-xl bg-[var(--overlay)] border border-border flex items-center justify-center active:scale-95 transition-transform"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
