import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-text font-display font-extrabold border border-transparent active:scale-[0.99]",
  secondary:
    "bg-transparent border border-white/15 text-text font-sans font-semibold",
  ghost: "bg-transparent text-text-muted font-sans font-semibold",
  light:
    "bg-[#F2F5F3] text-[#0B0E0D] font-sans font-bold border border-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = true, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "h-[58px] rounded-lg px-5 text-[17px] inline-flex items-center justify-center gap-2",
        fullWidth && "w-full",
        styles[variant],
        rest.disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
