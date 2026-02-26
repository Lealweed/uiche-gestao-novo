import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type ErrorStateProps = {
  title?: string;
  message?: string;
};

export function ErrorState({
  title = "Falha ao carregar",
  message = "Não foi possível carregar os dados no momento. Tente novamente em instantes.",
}: ErrorStateProps) {
  return (
    <Card className="rb-state-card rb-state-card-error">
      <AlertTriangle className="rb-state-icon" />
      <h3 className="rb-state-title">{title}</h3>
      <p className="rb-state-message">{message}</p>
    </Card>
  );
}
