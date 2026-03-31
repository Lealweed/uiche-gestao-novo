import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type ErrorStateProps = {
  title?: string;
  message?: string;
};

export function ErrorState({
  title = "Falha ao carregar",
  message = "Nao foi possivel carregar os dados no momento. Tente novamente em instantes.",
}: ErrorStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center border-red-200 bg-red-50">
      <div className="p-3 bg-red-100 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-sm text-red-700 max-w-sm">{message}</p>
    </Card>
  );
}
