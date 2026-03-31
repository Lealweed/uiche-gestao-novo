import { Card } from "@/components/rebuild/ui/card";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import type { Punch } from "@/lib/rebuild/data/operator";

type TimeClockSectionProps = {
  punches: Punch[];
  operatorBlocked: boolean;
  onRegisterPunch: (type: Punch["punch_type"]) => void;
};

export function TimeClockSection({ punches, operatorBlocked, onRegisterPunch }: TimeClockSectionProps) {
  return (
    <Card className="p-0">
      <SectionHeader title="Ponto digital" />
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(["entrada", "pausa_inicio", "pausa_fim", "saida"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={type === "entrada" ? "primary" : "ghost"}
              size="sm"
              disabled={operatorBlocked}
              onClick={() => onRegisterPunch(type)}
              className="flex-1 min-w-[120px]"
            >
              {type === "entrada" ? "Entrada" : type === "pausa_inicio" ? "Inicio pausa" : type === "pausa_fim" ? "Fim pausa" : "Saida"}
            </Button>
          ))}
        </div>

        <DataTable
          columns={[
            { key: "ponto", header: "Ponto", render: (punch) => punch.note ?? punch.punch_type },
            { key: "hora", header: "Hora", render: (punch) => <span className="text-muted-foreground">{new Date(punch.punched_at).toLocaleString("pt-BR")}</span> },
          ]}
          rows={punches.slice(0, 20)}
          emptyMessage="Nenhum registro de ponto."
          className="mt-2"
        />
      </div>
    </Card>
  );
}
