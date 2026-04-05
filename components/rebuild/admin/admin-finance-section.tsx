"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, RefreshCw, Wallet } from "lucide-react";

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
  booth_id?: string | null;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type ShiftCashClosingRow = {
  id: string;
  booth_id?: string | null;
  expected_cash: number;
  declared_cash: number;
  difference: number;
  note: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type FinanceByBoothRow = {
  boothId: string;
  boothLabel: string;
  cashSales: number;
  suprimento: number;
  sangria: number;
  ajuste: number;
  saldo: number;
  expected: number;
  declared: number;
  difference: number;
  movementCount: number;
  closingCount: number;
};

type AdminFinanceSectionProps = {
  dateFrom: string;
  dateTo: string;
  cashMovementTotals: CashMovementTotals;
  cashClosingTotals: CashClosingTotals;
  financeByBooth: FinanceByBoothRow[];
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
  financeByBooth,
  cashMovementRows,
  shiftCashClosingRows,
  onDateFromChange,
  onDateToChange,
  onApplyFilters,
  onClearFilters,
}: AdminFinanceSectionProps) {
  const [selectedBoothId, setSelectedBoothId] = useState("all");

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

  const boothOptions = useMemo(
    () => financeByBooth.filter((row) => row.boothId !== "sem-guiche"),
    [financeByBooth]
  );

  const visibleFinanceByBooth = useMemo(
    () => selectedBoothId === "all" ? financeByBooth : financeByBooth.filter((row) => row.boothId === selectedBoothId),
    [financeByBooth, selectedBoothId]
  );

  const selectedBoothSummary = useMemo(
    () => selectedBoothId === "all" ? null : financeByBooth.find((row) => row.boothId === selectedBoothId) ?? null,
    [financeByBooth, selectedBoothId]
  );

  const filteredCashMovementRows = useMemo(
    () => selectedBoothId === "all" ? cashMovementRows : cashMovementRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [cashMovementRows, selectedBoothId]
  );

  const filteredShiftCashClosingRows = useMemo(
    () => selectedBoothId === "all" ? shiftCashClosingRows : shiftCashClosingRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [selectedBoothId, shiftCashClosingRows]
  );

  const boothDetailLabel = selectedBoothSummary?.boothLabel ?? "Todos os guiches";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financeiro Operacional"
        subtitle="Acompanhe a visao geral do caixa e detalhe a operacao separada por guiche sem perder os calculos atuais."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />

          <div className="min-w-[220px]">
            <label className="mb-1 block text-sm text-foreground">Detalhar por guiche</label>
            <select
              value={selectedBoothId}
              onChange={(e) => setSelectedBoothId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todos os guiches</option>
              {boothOptions.map((row) => (
                <option key={row.boothId} value={row.boothId}>
                  {row.boothLabel}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit">Aplicar filtros</Button>
          <Button variant="ghost" type="button" onClick={() => void onClearFilters()}>
            Limpar
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
          <Badge variant="secondary">{selectedBoothId === "all" ? "Visao geral" : `Guiche: ${boothDetailLabel}`}</Badge>
          <Badge variant="secondary">{filteredCashMovementRows.length} movimento(s)</Badge>
          <Badge variant="secondary">{filteredShiftCashClosingRows.length} fechamento(s)</Badge>
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

      {selectedBoothSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Dinheiro · ${selectedBoothSummary.boothLabel}`}
            value={formatCurrency(selectedBoothSummary.cashSales)}
            icon={<Wallet className="h-5 w-5" />}
            delta={`${selectedBoothSummary.movementCount} movimento(s) de caixa`}
            deltaType="neutral"
          />
          <StatCard
            label="Caixa estimado do guiche"
            value={formatCurrency(selectedBoothSummary.saldo)}
            icon={<Building2 className="h-5 w-5" />}
            delta={`${selectedBoothSummary.closingCount} fechamento(s)`}
            deltaType={selectedBoothSummary.saldo >= 0 ? "positive" : "negative"}
          />
          <StatCard label="Esperado do guiche" value={formatCurrency(selectedBoothSummary.expected)} />
          <StatCard
            label="Diferenca do guiche"
            value={formatCurrency(selectedBoothSummary.difference)}
            delta={selectedBoothSummary.difference === 0 ? "Conferido" : selectedBoothSummary.difference > 0 ? "Sobra" : "Falta"}
            deltaType={selectedBoothSummary.difference === 0 ? "positive" : selectedBoothSummary.difference > 0 ? "neutral" : "negative"}
          />
        </div>
      )}

      <Card>
        <SectionHeader
          title="Resumo Financeiro por Guiche"
          subtitle={selectedBoothId === "all" ? "Consolidado por operacao de cada guiche no periodo selecionado." : `Detalhamento financeiro de ${boothDetailLabel}.`}
          className="mb-4"
        />
        <DataTable
          columns={[
            { key: "guiche", header: "Guiche", render: (row) => <span className="font-semibold">{row.boothLabel}</span> },
            { key: "dinheiro", header: "Dinheiro", render: (row) => formatCurrency(row.cashSales) },
            { key: "suprimento", header: "Suprimento", render: (row) => formatCurrency(row.suprimento) },
            { key: "sangria", header: "Sangria", render: (row) => formatCurrency(row.sangria) },
            { key: "ajuste", header: "Ajuste", render: (row) => formatCurrency(row.ajuste) },
            { key: "saldo", header: "Caixa estimado", render: (row) => <span className="font-semibold">{formatCurrency(row.saldo)}</span> },
            { key: "esperado", header: "Esperado", render: (row) => formatCurrency(row.expected) },
            { key: "declarado", header: "Declarado", render: (row) => formatCurrency(row.declared) },
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
            { key: "movimentos", header: "Mov. caixa", render: (row) => row.movementCount },
            { key: "fechamentos", header: "Fechamentos", render: (row) => row.closingCount },
          ]}
          rows={visibleFinanceByBooth}
          emptyMessage="Nenhum guiche com dados financeiros no periodo informado."
        />
      </Card>

      <Card>
        <SectionHeader title="Movimentos de Caixa" subtitle={`${filteredCashMovementRows.length} registro(s) em ${boothDetailLabel}`} className="mb-4" />
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
          rows={filteredCashMovementRows}
          emptyMessage="Nenhum movimento de caixa no periodo informado para o guiche selecionado."
        />
      </Card>

      <Card>
        <SectionHeader title="Fechamento de Caixa por Turno" subtitle={`${filteredShiftCashClosingRows.length} fechamento(s) em ${boothDetailLabel}`} className="mb-4" />
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
          rows={filteredShiftCashClosingRows}
          emptyMessage="Nenhum fechamento de caixa no periodo informado para o guiche selecionado."
        />
      </Card>
    </div>
  );
}
