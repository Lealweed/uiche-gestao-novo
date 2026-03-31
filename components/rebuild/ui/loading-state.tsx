import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type LoadingStateProps = {
  title?: string;
  message?: string;
};

export function LoadingState({
  title = "Carregando informacoes",
  message = "Estamos preparando os dados para voce.",
}: LoadingStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 bg-blue-50 rounded-full mb-4">
        <LoaderCircle className="w-8 h-8 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm">{message}</p>
    </Card>
  );
}
