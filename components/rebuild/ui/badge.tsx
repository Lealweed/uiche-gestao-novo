import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantMap: Record<BadgeVariant, string> = {
  success: "rb-badge rb-badge-success",
  warning: "rb-badge rb-badge-warning",
  danger:  "rb-badge rb-badge-danger",
  neutral: "rb-badge rb-badge-neutral",
  info:    "rb-badge rb-badge-info",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span className={cn(variantMap[variant], className)}>
      {children}
    </span>
  );
}

export function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, { className: string; label: string }> = {
    pix:    { className: "rb-payment-badge rb-payment-pix",    label: "PIX" },
    credit: { className: "rb-payment-badge rb-payment-credit", label: "Crédito" },
    debit:  { className: "rb-payment-badge rb-payment-debit",  label: "Débito" },
    cash:   { className: "rb-payment-badge rb-payment-cash",   label: "Dinheiro" },
  };
  const item = map[method] ?? { className: "rb-badge rb-badge-neutral", label: method };
  return <span className={item.className}>{item.label}</span>;
}

export function ShiftStatusBadge({ status }: { status: "open" | "closed" }) {
  return status === "open" ? (
    <span className="rb-badge rb-badge-success">Aberto</span>
  ) : (
    <span className="rb-badge rb-badge-neutral">Fechado</span>
  );
}
