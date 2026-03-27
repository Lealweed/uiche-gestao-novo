import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "rb-btn-primary",
  ghost: "rb-btn-ghost",
  danger: [
    "inline-flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer",
    "rounded-[var(--ds-radius-sm)] border px-3 py-2 min-h-[42px] text-sm",
    "bg-[var(--ds-danger-soft)] text-[#F87171] border-[rgba(239,68,68,0.25)]",
    "hover:bg-[rgba(239,68,68,0.22)] focus-visible:outline-2 focus-visible:outline-[#EF4444] focus-visible:outline-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs min-h-[32px]",
  md: "",
  lg: "px-5 py-3 text-base min-h-[48px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="rb-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
