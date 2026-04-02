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

  return (
    <div className="space-y-6">
      <Card>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          <Button type="submit">Filtrar</Button>
          <Button variant="ghost" type="button" onClick={() => void onClearFilters()}>
            Limpar
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Suprimento" value={formatCurrency(cashMovementTotals.suprimento)} icon={<ArrowUpRight className="h-5 w-5" />} deltaType="positive" />
        <StatCard label="Sangria" value={formatCurrency(cashMovementTotals.sangria)} icon={<ArrowDownRight className="h-5 w-5" />} deltaType="negative" />
        <StatCard label="Ajuste" value={formatCurrency(cashMovementTotals.ajuste)} icon={<RefreshCw className="h-5 w-5" />} />
        <StatCard label="Saldo Caixa" value={formatCurrency(cashMovementTotals.saldo)} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Esperado (caixa)" value={formatCurrency(cashClosingTotals.expected)} />
        <StatCard label="Declarado" value={formatCurrency(cashClosingTotals.declared)} />
        <StatCard
          label="Diferenca"
          value={formatCurrency(cashClosingTotals.difference)}
          deltaType={cashClosingTotals.difference === 0 ? "positive" : "negative"}
        />
      </div>

      <Card>
        <SectionHeader title="Movimentos de Caixa" className="mb-4" />
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
            { key: "tipo", header: "Tipo", render: (row) => <Badge variant="neutral">{row.movement_type}</Badge> },
            { key: "valor", header: "Valor", render: (row) => <span className="font-semibold">{formatCurrency(Number(row.amount))}</span> },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "-" },
          ]}
          rows={cashMovementRows.slice(0, 100)}
          emptyMessage="Nenhum movimento de caixa."
        />
      </Card>

      <Card>
        <SectionHeader title="Fechamento de Caixa por Turno" className="mb-4" />
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
                return <span className={diff === 0 ? "text-emerald-600" : "font-semibold text-amber-600"}>{formatCurrency(diff)}</span>;
              },
            },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "-" },
          ]}
          rows={shiftCashClosingRows.slice(0, 100)}
          emptyMessage="Nenhum fechamento de caixa."
        />
      </Card>
    </div>
  );
}
