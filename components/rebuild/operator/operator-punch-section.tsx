"use client";

import { Clock } from "lucide-react";

import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";

type Punch = {
  id: string;
  punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim";
  punched_at: string;
  note: string | null;
};

type OperatorPunchSectionProps = {
  punches: Punch[];
  operatorBlocked: boolean;
  isMounted: boolean;
  onRegisterPunch: (type: Punch["punch_type"]) => void | Promise<void>;
};

export function OperatorPunchSection({
  punches,
  operatorBlocked,
  isMounted,
  onRegisterPunch,
}: OperatorPunchSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ponto Digital</h1>
        <p className="text-sm text-muted">Registre sua entrada, saida e pausas</p>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["entrada", "pausa_inicio", "pausa_fim", "saida"] as const).map((type) => (
            <Button
              key={type}
              variant={type === "entrada" ? "success" : type === "saida" ? "danger" : "secondary"}
              disabled={operatorBlocked}
              onClick={() => void onRegisterPunch(type)}
              className="py-6"
            >
              <Clock size={20} className="mr-2" />
              {type === "entrada"
                ? "Entrada"
                : type === "pausa_inicio"
                  ? "Inicio Pausa"
                  : type === "pausa_fim"
                    ? "Fim Pausa"
                    : "Saida"}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-foreground">Registros de Ponto</h3>
        <DataTable
          columns={[
            {
              key: "tipo",
              header: "Tipo",
              render: (punch) => (
                <Badge variant={punch.punch_type === "entrada" ? "success" : punch.punch_type === "saida" ? "warning" : "secondary"}>
                  {punch.punch_type.toUpperCase().replace("_", " ")}
                </Badge>
              ),
            },
            {
              key: "hora",
              header: "Data/Hora",
              render: (punch) => (isMounted ? new Date(punch.punched_at).toLocaleString("pt-BR") : "--"),
            },
            { key: "obs", header: "Observacao", render: (punch) => punch.note || "-" },
          ]}
          rows={punches}
          emptyMessage="Nenhum registro de ponto."
        />
      </Card>
    </div>
  );
}
