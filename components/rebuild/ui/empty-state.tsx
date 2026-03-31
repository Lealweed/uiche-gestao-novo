import { Inbox } from "lucide-react";
import { Card } from "@/components/rebuild/ui/card";

type EmptyStateProps = {
  title?: string;
  message?: string;
};

export function EmptyState({
  title = "Nenhum dado disponivel",
  message = "Quando houver movimentacao, os registros aparecerao aqui.",
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 bg-slate-100 rounded-full mb-4">
        <Inbox className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm">{message}</p>
    </Card>
  );
}
