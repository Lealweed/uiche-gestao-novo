import { ReactNode } from "react";
import { Card } from "@/components/rebuild/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, delta, icon }: StatCardProps) {
  return (
    <Card className="rb-stat-card">
      <div className="rb-stat-row">
        <p className="rb-stat-label">{label}</p>
        {icon ? <div className="rb-stat-icon">{icon}</div> : null}
      </div>
      <p className="rb-stat-value">{value}</p>
      {delta ? <p className="rb-stat-delta">{delta}</p> : null}
    </Card>
  );
}
