import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type LoadingStateProps = {
  title?: string;
  message?: string;
};

export function LoadingState({
  title = "Carregando informações",
  message = "Estamos preparando os dados para você.",
}: LoadingStateProps) {
  return (
    <Card className="rb-state-card">
      <LoaderCircle className="rb-state-icon rb-spin" />
      <h3 className="rb-state-title">{title}</h3>
      <p className="rb-state-message">{message}</p>
    </Card>
  );
}
