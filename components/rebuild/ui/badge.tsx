import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pix: { variant: "success", label: "PIX" },
    credit: { variant: "info", label: "Crédito" },
    debit: { variant: "info", label: "Débito" },
    cash: { variant: "warning", label: "Dinheiro" },
  };
  const item = map[method] ?? { variant: "neutral" as BadgeVariant, label: method };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function ShiftStatusBadge({ status }: { status: "open" | "closed" }) {
  return status === "open" ? (
    <Badge variant="success">Aberto</Badge>
  ) : (
    <Badge variant="neutral">Fechado</Badge>
  );
}
