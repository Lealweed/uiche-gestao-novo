"use client";

import { FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Wallet } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Input } from "@/components/rebuild/ui/input";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

type CashMovementTotals = {
  suprimento: number;
  sangria: number;
  ajuste: number;
  cashSales: number;
  saldo: number;
};

type CashClosingTotals = {
  expected: number;
  declared: number;
  difference: number;
};

type CashMovementRow = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type ShiftCashClosingRow = {
  id: string;
  expected_cash: number;
  declared_cash: number;
  difference: number;
  note: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type AdminFinanceSectionProps = {
  dateFrom: string;
  dateTo: string;
  cashMovementTotals: CashMovementTotals;
  cashClosingTotals: CashClosingTotals;
  cashMovementRows: CashMovementRow[];
  shiftCashClosingRows: ShiftCashClosingRow[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApplyFilters: () => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
};

function formatPeriodDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function AdminFinanceSection({
  dateFrom,
  dateTo,
  cashMovementTotals,
  cashClosingTotals,
  cashMovementRows,
  shiftCashClosingRows,
  onDateFromChange,
  onDateToChange,
  onApplyFilters,
  onClearFilters,
}: AdminFinanceSectionProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onApplyFilters();
  }

  const periodLabel = dateFrom || dateTo
    ? `Periodo: ${formatPeriodDate(dateFrom) ?? "inicio"} ate ${formatPeriodDate(dateTo) ?? "hoje"}`
    : "Sem filtro de data: exibindo todo o periodo carregado.";

  const closingDifferenceDelta = cashClosingTotals.difference === 0
    ? "Sem divergencia no periodo"
    : cashClosingTotals.difference > 0
      ? "Declarado acima do esperado"
      : "Declarado abaixo do esperado";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financeiro Operacional"
        subtitle="Audite movimentos de caixa, fechamentos por turno e consistencia dos valores exibidos."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          <Button type="submit">Aplicar filtros</Button>
          <Button variant="ghost" type="button" onClick={() => void onClearFilters()}>
            Limpar
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
          <Badge variant="secondary">{cashMovementRows.length} movimento(s)</Badge>
          <Badge variant="secondary">{shiftCashClosingRows.length} fechamento(s)</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Vendas em dinheiro"
          value={formatCurrency(cashMovementTotals.cashSales)}
          icon={<Wallet className="h-5 w-5" />}
          delta="Base dos turnos no periodo"
          deltaType="neutral"
        />
        <StatCard label="Suprimento" value={formatCurrency(cashMovementTotals.suprimento)} icon={<ArrowUpRight className="h-5 w-5" />} deltaType="positive" />
        <StatCard label="Sangria" value={formatCurrency(cashMovementTotals.sangria)} icon={<ArrowDownRight className="h-5 w-5" />} deltaType="negative" />
        <StatCard label="Ajuste" value={formatCurrency(cashMovementTotals.ajuste)} icon={<RefreshCw className="h-5 w-5" />} />
        <StatCard
          label="Caixa estimado"
          value={formatCurrency(cashMovementTotals.saldo)}
          icon={<Wallet className="h-5 w-5" />}
          delta="Dinheiro + suprimentos - sangrias +/- ajustes"
          deltaType={cashMovementTotals.saldo >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Esperado (fechamentos)" value={formatCurrency(cashClosingTotals.expected)} />
        <StatCard label="Declarado" value={formatCurrency(cashClosingTotals.declared)} />
        <StatCard
          label="Diferenca"
          value={formatCurrency(cashClosingTotals.difference)}
          delta={closingDifferenceDelta}
          deltaType={cashClosingTotals.difference === 0 ? "positive" : cashClosingTotals.difference < 0 ? "negative" : "neutral"}
        />
      </div>

      <Card>
        <SectionHeader title="Movimentos de Caixa" subtitle={`${cashMovementRows.length} registro(s) no periodo selecionado`} className="mb-4" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
            { key: "operador", header: "Operador", render: (row) => nameOf(row.profiles) ?? "-" },
            {
              key: "guiche",
              header: "Guiche",
              render: (row) => {
                const booth = boothOf(row.booths);
                return booth ? `${booth.code} - ${booth.name}` : "-";
              },
            },
            {
              key: "tipo",
              header: "Tipo",
              render: (row) => {
                const tone = row.movement_type === "suprimento" ? "success" : row.movement_type === "sangria" ? "warning" : "info";
                const label = row.movement_type === "suprimento" ? "Suprimento" : row.movement_type === "sangria" ? "Sangria" : "Ajuste";
                return <Badge variant={tone}>{label}</Badge>;
              },
            },
            { key: "valor", header: "Valor", render: (row) => <span className="font-semibold">{formatCurrency(Number(row.amount))}</span> },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "-" },
          ]}
          rows={cashMovementRows}
          emptyMessage="Nenhum movimento de caixa no periodo informado."
        />
      </Card>

      <Card>
        <SectionHeader title="Fechamento de Caixa por Turno" subtitle={`${shiftCashClosingRows.length} fechamento(s) no periodo selecionado`} className="mb-4" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
            { key: "operador", header: "Operador", render: (row) => nameOf(row.profiles) ?? "-" },
            {
              key: "guiche",
              header: "Guiche",
              render: (row) => {
                const booth = boothOf(row.booths);
                return booth ? `${booth.code} - ${booth.name}` : "-";
              },
            },
            { key: "esperado", header: "Esperado", render: (row) => formatCurrency(Number(row.expected_cash)) },
            { key: "declarado", header: "Declarado", render: (row) => formatCurrency(Number(row.declared_cash)) },
            {
              key: "diferenca",
              header: "Diferenca",
              render: (row) => {
                const diff = Number(row.difference);
                return (
                  <span className={diff === 0 ? "text-emerald-600" : diff > 0 ? "font-semibold text-amber-600" : "font-semibold text-red-600"}>
                    {formatCurrency(diff)}
                  </span>
                );
              },
            },
            {
              key: "conferencia",
              header: "Conferencia",
              render: (row) => {
                const diff = Number(row.difference);
                return diff === 0 ? (
                  <Badge variant="success">Conferido</Badge>
                ) : diff > 0 ? (
                  <Badge variant="warning">Sobra</Badge>
                ) : (
                  <Badge variant="danger">Falta</Badge>
                );
              },
            },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "-" },
          ]}
          rows={shiftCashClosingRows}
          emptyMessage="Nenhum fechamento de caixa no periodo informado."
        />
      </Card>
    </div>
  );
}
