import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  /**
   * Shows an inline spinner and blocks further clicks. Use for submit buttons
   * tied to a server action (e.g. onboarding "Continue") so the tap gives
   * immediate feedback instead of a dead button while the request is in flight.
   */
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-text font-display font-extrabold border border-transparent active:scale-[0.99]",
  secondary:
    "bg-transparent border border-border-strong text-text font-sans font-semibold",
  ghost: "bg-transparent text-text-muted font-sans font-semibold",
  light:
    "bg-[#F2F5F3] text-[#0B0E0D] font-sans font-bold border border-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = true, loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "h-[58px] rounded-lg px-5 text-[17px] inline-flex items-center justify-center gap-2",
        fullWidth && "w-full",
        styles[variant],
        (disabled || loading) && "opacity-50",
        className,
      )}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin shrink-0"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.6" strokeOpacity="0.3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});
