import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--yellow)] text-black border-2 border-[var(--line)] hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
  secondary:
    "bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--line)] hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
  outline:
    "bg-transparent border-2 border-current text-current hover:bg-black/5 dark:hover:bg-white/5",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5",
  danger:
    "bg-[var(--red)] text-white border-2 border-[var(--line)] hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-[family-name:var(--font-mono)] font-bold uppercase tracking-wide transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
