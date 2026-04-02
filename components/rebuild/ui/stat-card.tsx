import { ReactNode } from "react";
import { Card } from "@/components/rebuild/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label?: string;
  title?: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  trend?: { value: number; positive: boolean };
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, title, value, delta, deltaType = "neutral", trend, icon, className }: StatCardProps) {
  const deltaColors = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted",
  };

  const resolvedLabel = label ?? title ?? "";
  const resolvedDelta = delta ?? (trend ? `${trend.positive ? "+" : ""}${trend.value}` : undefined);
  const resolvedDeltaType = trend ? (trend.positive ? "positive" : "negative") : deltaType;

  return (
    <Card className={cn("p-5 bg-[hsl(var(--card-elevated))]", className)}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">{resolvedLabel}</p>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {resolvedDelta && (
        <p className={cn("mt-1 text-sm font-medium", deltaColors[resolvedDeltaType])}>
          {resolvedDelta}
        </p>
      )}
    </Card>
  );
}
