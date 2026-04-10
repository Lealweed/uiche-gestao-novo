"use client";

import { ArrowDownRight, Clock, RefreshCw, Users } from "lucide-react";

import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { DataTable } from "@/components/rebuild/ui/table";

type AttendanceRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  full_name: string;
};

type AdminAttendanceSectionProps = {
  attendanceRows: AttendanceRow[];
  isMounted: boolean;
  onRefresh: () => void | Promise<void>;
};

function formatTime(value: string | null, isMounted: boolean) {
  if (!value || !isMounted) return "--";

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(clockIn: string, clockOut: string | null) {
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  return `${h}h${String(m).padStart(2, "0")}m`;
}

export function AdminAttendanceSection({ attendanceRows, isMounted, onRefresh }: AdminAttendanceSectionProps) {
  const activeCount = attendanceRows.filter((row) => !row.clock_out).length;
  const completedCount = attendanceRows.filter((row) => row.clock_out).length;

  return (
    <div className="space-y-6">
      <SectionHeader title="Folha de Ponto" subtitle="Registro de presenca dos operadores — hoje" />

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm">
          {attendanceRows.length} registro{attendanceRows.length !== 1 ? "s" : ""} hoje
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => void onRefresh()}>
          <RefreshCw className="mr-1 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Card>
        {attendanceRows.length === 0 ? (
          <div className="py-12 text-center">
            <Clock size={48} className="mx-auto mb-3 text-muted opacity-50" />
            <p className="text-muted">Nenhum registro de ponto hoje.</p>
            <p className="mt-1 text-xs text-muted">Os registros aparecem automaticamente quando operadores fazem login.</p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => void onRefresh()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Carregar registros
            </Button>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "nome",
                header: "Operador",
                render: (row) => <span className="font-semibold text-foreground">{row.full_name}</span>,
              },
              {
                key: "entrada",
                header: "Entrada",
                render: (row) => <span className="font-mono text-sm text-emerald-400">{formatTime(row.clock_in, isMounted)}</span>,
              },
              {
                key: "saida",
                header: "Saida",
                render: (row) =>
                  row.clock_out ? (
                    <span className="font-mono text-sm text-rose-400">{formatTime(row.clock_out, isMounted)}</span>
                  ) : (
                    <Badge variant="success">Em atividade</Badge>
                  ),
              },
              {
                key: "duracao",
                header: "Duracao",
                render: (row) => <span className="font-mono text-sm text-muted">{formatDuration(row.clock_in, row.clock_out)}</span>,
              },
            ]}
            rows={attendanceRows}
            emptyMessage="Nenhum registro."
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Presentes Hoje"
          value={attendanceRows.length.toString()}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Em Atividade"
          value={activeCount.toString()}
          icon={<Clock className="h-5 w-5" />}
          delta={activeCount > 0 ? `+${activeCount}` : undefined}
          deltaType="positive"
        />
        <StatCard
          label="Ja Saiu"
          value={completedCount.toString()}
          icon={<ArrowDownRight className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
