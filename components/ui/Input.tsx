import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  prefix?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, prefix, containerClassName, className, ...rest },
  ref,
) {
  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      {label && (
        <span className="text-[13px] font-semibold text-[#8A938E]">{label}</span>
      )}
      <div className="flex items-center gap-2.5 h-14 rounded-[15px] bg-[#13181A] border border-white/10 px-4 focus-within:border-primary">
        {prefix && (
          <>
            <span className="font-display font-bold text-[15px] text-[#C7CEC9]">
              {prefix}
            </span>
            <div className="w-px h-5 bg-white/10" />
          </>
        )}
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-transparent outline-none text-text font-sans font-semibold text-[16px] placeholder:text-text-muted",
            className,
          )}
          {...rest}
        />
      </div>
    </div>
  );
});
