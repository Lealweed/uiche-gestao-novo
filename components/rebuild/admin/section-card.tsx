import type { ReactNode } from "react";
import { Badge } from "@/components/rebuild/ui/badge";

type SectionCardProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function SectionCard({ title, children, action }: SectionCardProps) {
  return (
    <div className="rb-panel">
      <div className="rb-panel-head">
        <p className="rb-panel-title">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "ATIVO" : "INATIVO"}</Badge>;
}
