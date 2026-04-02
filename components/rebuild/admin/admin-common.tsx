import type { ReactNode } from "react";

import { Badge } from "@/components/rebuild/ui/badge";
import { Card } from "@/components/rebuild/ui/card";

export function SectionCard({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "ATIVO" : "INATIVO"}</Badge>;
}
