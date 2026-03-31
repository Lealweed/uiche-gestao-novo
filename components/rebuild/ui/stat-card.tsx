import { ReactNode } from "react";
import { Card } from "@/components/rebuild/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, delta, deltaType = "neutral", icon, className }: StatCardProps) {
  const deltaColors = {
    positive: "text-emerald-600",
    negative: "text-red-600",
    neutral: "text-muted",
  };

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {delta && (
        <p className={cn("mt-1 text-sm font-medium", deltaColors[deltaType])}>
          {delta}
        </p>
      )}
    </Card>
  );
}
