import { Inbox } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type EmptyStateProps = {
  title?: string;
  message?: string;
};

export function EmptyState({
  title = "Nenhum dado disponível",
  message = "Quando houver movimentação, os registros aparecerão aqui.",
}: EmptyStateProps) {
  return (
    <Card className="rb-state-card">
      <Inbox className="rb-state-icon" />
      <h3 className="rb-state-title">{title}</h3>
      <p className="rb-state-message">{message}</p>
    </Card>
  );
}
