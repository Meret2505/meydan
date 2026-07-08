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
  // Prefer a real history-back so the previous screen — and its scroll position —
  // is restored from the client Router Cache. A forward `router.push(href)` always
  // lands at the top of the target and breaks the back stack. The `href` push is
  // kept only as a fallback for when there's no in-app history to return to (e.g. a
  // detail page opened cold from a deep link / push notification).
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };
  return (
    <button
      type="button"
      onClick={goBack}
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
