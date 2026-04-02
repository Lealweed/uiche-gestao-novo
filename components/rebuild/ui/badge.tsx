import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info" | "secondary" | "primary";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  neutral: "bg-secondary text-muted border-border",
  info: "bg-info/15 text-info border-info/30",
  secondary: "bg-secondary text-foreground border-border",
  primary: "bg-primary/15 text-primary border-primary/30",
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
    credit: { variant: "info", label: "Credito" },
    debit: { variant: "info", label: "Debito" },
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
