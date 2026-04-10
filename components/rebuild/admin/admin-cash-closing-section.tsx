"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Wallet,
  XCircle,
} from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { exportToCSV } from "@/lib/csv-export";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

type ShiftCashClosingRow = {
  id: string;
  booth_id?: string | null;
  expected_cash: number;
  declared_cash: number;
  difference: number;
  note: string | null;
  created_at: string;
  user_id?: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type ShiftRow = {
  shift_id: string;
  booth_id?: string | null;
  operator_id?: string | null;
  opened_at?: string;
  closed_at?: string | null;
  status: string;
  booth_name?: string;
  operator_name?: string;
};

type AdminCashClosingSectionProps = {
  shiftCashClosingRows: ShiftCashClosingRow[];
  shiftRows: ShiftRow[];
  isMounted: boolean;
};

type StatusFilter = "all" | "ok" | "sobra" | "falta";

function getDifferenceStatus(diff: number) {
  if (Math.abs(diff) < 0.01) return { label: "Conferido", variant: "success" as const, icon: CheckCircle2 };
  if (diff > 0) return { label: "Sobra", variant: "warning" as const, icon: ArrowUpRight };
  return { label: "Falta", variant: "danger" as const, icon: ArrowDownRight };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function AdminCashClosingSection({
  shiftCashClosingRows,
  shiftRows,
  isMounted,
}: AdminCashClosingSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [boothFilter, setBoothFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "biggest-diff">("recent");

  // Turnos abertos SEM fechamento ainda
  const openShiftsWithoutClosing = useMemo(() => {
    const closedShiftIds = new Set(shiftCashClosingRows.map((c) => {
      // shift_cash_closings has shift_id but it's not directly in our type — match by booth+user
      return c.id;
    }));

    return shiftRows.filter((s) => s.status === "open");
  }, [shiftRows, shiftCashClosingRows]);

  // Booths disponíveis para filtro
  const boothOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of shiftCashClosingRows) {
      const booth = boothOf(row.booths ?? null);
      if (booth && row.booth_id) {
        map.set(row.booth_id, `${booth.code} - ${booth.name}`);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [shiftCashClosingRows]);

  // Linhas filtradas e ordenadas
  const filteredRows = useMemo(() => {
    let result = [...shiftCashClosingRows];

    // Filtro por booth
    if (boothFilter !== "all") {
      result = result.filter((r) => r.booth_id === boothFilter);
    }

    // Filtro por status
    if (statusFilter !== "all") {
      result = result.filter((r) => {
        const diff = Number(r.difference || 0);
        if (statusFilter === "ok") return Math.abs(diff) < 0.01;
        if (statusFilter === "sobra") return diff > 0.01;
        if (statusFilter === "falta") return diff < -0.01;
        return true;
      });
    }

    // Ordenação
    if (sortBy === "biggest-diff") {
      result.sort((a, b) => Math.abs(Number(b.difference || 0)) - Math.abs(Number(a.difference || 0)));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [shiftCashClosingRows, boothFilter, statusFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = shiftCashClosingRows.length;
    const conferidos = shiftCashClosingRows.filter((r) => Math.abs(Number(r.difference || 0)) < 0.01).length;
    const comSobra = shiftCashClosingRows.filter((r) => Number(r.difference || 0) > 0.01).length;
    const comFalta = shiftCashClosingRows.filter((r) => Number(r.difference || 0) < -0.01).length;

    const totalExpected = shiftCashClosingRows.reduce((acc, r) => acc + Number(r.expected_cash || 0), 0);
    const totalDeclared = shiftCashClosingRows.reduce((acc, r) => acc + Number(r.declared_cash || 0), 0);
    const totalDifference = shiftCashClosingRows.reduce((acc, r) => acc + Number(r.difference || 0), 0);

    const biggestFalta = shiftCashClosingRows.reduce((min, r) => {
      const diff = Number(r.difference || 0);
      return diff < min ? diff : min;
    }, 0);

    const biggestSobra = shiftCashClosingRows.reduce((max, r) => {
      const diff = Number(r.difference || 0);
      return diff > max ? diff : max;
    }, 0);

    return {
      total,
      conferidos,
      comSobra,
      comFalta,
      totalExpected,
      totalDeclared,
      totalDifference,
      biggestFalta,
      biggestSobra,
      percentConferido: total > 0 ? ((conferidos / total) * 100).toFixed(0) : "0",
    };
  }, [shiftCashClosingRows]);

  function handleExportCSV() {
    const rows = filteredRows.map((row) => {
      const booth = boothOf(row.booths ?? null);
      const operator = nameOf(row.profiles ?? null);
      const status = getDifferenceStatus(Number(row.difference || 0));

      return {
        data: formatDate(row.created_at),
        guiche: booth ? `${booth.code} - ${booth.name}` : "-",
        operador: operator ?? "-",
        esperado: Number(row.expected_cash || 0),
        declarado: Number(row.declared_cash || 0),
        diferenca: Number(row.difference || 0),
        status: status.label,
        observacao: row.note ?? "",
      };
    });

    exportToCSV("fechamento-caixa", rows, [
      { key: "data", label: "Data/hora" },
      { key: "guiche", label: "Guiche" },
      { key: "operador", label: "Operador" },
      { key: "esperado", label: "Esperado (R$)" },
      { key: "declarado", label: "Declarado (R$)" },
      { key: "diferenca", label: "Diferença (R$)" },
      { key: "status", label: "Status" },
      { key: "observacao", label: "Observação" },
    ]);
  }

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Fechamento de Caixa"
        subtitle="Acompanhe todos os fechamentos realizados pelos operadores, divergências e turnos pendentes."
      />

      {/* Alerta de turnos abertos */}
      {openShiftsWithoutClosing.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {openShiftsWithoutClosing.length} turno(s) aberto(s) aguardando fechamento
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {openShiftsWithoutClosing.slice(0, 6).map((s) => {
                  return (
                    <Badge key={s.shift_id} variant="warning">
                      {s.booth_name ?? "?"} · {s.operator_name ?? "Operador"} · {s.opened_at ? formatShortDate(s.opened_at) : "-"}
                    </Badge>
                  );
                })}
                {openShiftsWithoutClosing.length > 6 && (
                  <Badge variant="neutral">+{openShiftsWithoutClosing.length - 6} mais</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total de fechamentos"
          value={String(stats.total)}
          icon={<Wallet className="h-5 w-5" />}
          delta={`${stats.percentConferido}% conferidos sem divergencia`}
          deltaType="neutral"
        />
        <StatCard
          label="Conferidos"
          value={String(stats.conferidos)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          delta="Diferença zero"
          deltaType="positive"
        />
        <StatCard
          label="Com sobra"
          value={String(stats.comSobra)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          delta={stats.biggestSobra > 0 ? `Maior: ${formatCurrency(stats.biggestSobra)}` : "Nenhuma"}
          deltaType={stats.comSobra > 0 ? "neutral" : "positive"}
        />
        <StatCard
          label="Com falta"
          value={String(stats.comFalta)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          delta={stats.biggestFalta < 0 ? `Maior: ${formatCurrency(Math.abs(stats.biggestFalta))}` : "Nenhuma"}
          deltaType={stats.comFalta > 0 ? "negative" : "positive"}
        />
        <StatCard
          label="Diferença acumulada"
          value={formatCurrency(stats.totalDifference)}
          icon={stats.totalDifference >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          delta={`Esperado: ${formatCurrency(stats.totalExpected)} · Declarado: ${formatCurrency(stats.totalDeclared)}`}
          deltaType={Math.abs(stats.totalDifference) < 0.01 ? "positive" : stats.totalDifference < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted" />

          <div className="min-w-[180px]">
            <select
              value={boothFilter}
              onChange={(e) => setBoothFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todos os guichês</option>
              {boothOptions.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5">
            {([
              { key: "all", label: "Todos" },
              { key: "ok", label: "Conferidos" },
              { key: "sobra", label: "Com sobra" },
              { key: "falta", label: "Com falta" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  statusFilter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted border-border hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "biggest-diff")}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="recent">Mais recentes</option>
              <option value="biggest-diff">Maior divergência</option>
            </select>
          </div>

          <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={filteredRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>

          <Badge variant="secondary">{filteredRows.length} registro(s)</Badge>
        </div>
      </Card>

      {/* Tabela de fechamentos */}
      {filteredRows.length === 0 ? (
        <EmptyState
          title="Nenhum fechamento encontrado"
          message="Quando os operadores realizarem o fechamento de caixa, os registros aparecerão aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((row) => {
            const booth = boothOf(row.booths ?? null);
            const operator = nameOf(row.profiles ?? null);
            const diff = Number(row.difference || 0);
            const status = getDifferenceStatus(diff);
            const StatusIcon = status.icon;

            return (
              <Card key={row.id} className="p-4 border border-border/70 bg-[hsl(var(--card-elevated))]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        status.variant === "success"
                          ? "bg-success/10 text-success"
                          : status.variant === "warning"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {booth ? `${booth.code} - ${booth.name}` : "Sem guichê"}
                      </p>
                      <p className="text-xs text-muted">{operator ?? "Operador"}</p>
                    </div>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-background/60 border border-border p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Esperado</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {formatCurrency(Number(row.expected_cash || 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Declarado</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {formatCurrency(Number(row.declared_cash || 0))}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border p-2.5 text-center ${
                      status.variant === "success"
                        ? "bg-success/5 border-success/30"
                        : status.variant === "warning"
                          ? "bg-warning/5 border-warning/30"
                          : "bg-destructive/5 border-destructive/30"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-muted">Diferença</p>
                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        status.variant === "success"
                          ? "text-success"
                          : status.variant === "warning"
                            ? "text-warning"
                            : "text-destructive"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {formatCurrency(diff)}
                    </p>
                  </div>
                </div>

                {row.note && (
                  <p className="mt-3 text-xs text-muted italic border-t border-border/50 pt-2">
                    {row.note}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-muted/70">
                  {formatDate(row.created_at)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
