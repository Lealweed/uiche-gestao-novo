"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, Download, Eye, RefreshCw, Wallet } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { exportToCSV } from "@/lib/csv-export";
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
  grossSales: number;
  txCount: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  cashSales: number;
  suprimento: number;
  sangria: number;
  ajuste: number;
  saldo: number;
  expected: number;
  declared: number;
  difference: number;
  stateTaxCount: number;
  stateTaxValue: number;
  federalTaxCount: number;
  federalTaxValue: number;
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

  const financeSnapshot = useMemo(
    () => visibleFinanceByBooth.reduce(
      (acc, row) => ({
        grossSales: acc.grossSales + Number(row.grossSales || 0),
        txCount: acc.txCount + Number(row.txCount || 0),
        pixSales: acc.pixSales + Number(row.pixSales || 0),
        creditSales: acc.creditSales + Number(row.creditSales || 0),
        debitSales: acc.debitSales + Number(row.debitSales || 0),
        cashSales: acc.cashSales + Number(row.cashSales || 0),
        stateTaxCount: acc.stateTaxCount + Number(row.stateTaxCount || 0),
        stateTaxValue: acc.stateTaxValue + Number(row.stateTaxValue || 0),
        federalTaxCount: acc.federalTaxCount + Number(row.federalTaxCount || 0),
        federalTaxValue: acc.federalTaxValue + Number(row.federalTaxValue || 0),
        difference: acc.difference + Number(row.difference || 0),
      }),
      {
        grossSales: 0,
        txCount: 0,
        pixSales: 0,
        creditSales: 0,
        debitSales: 0,
        cashSales: 0,
        stateTaxCount: 0,
        stateTaxValue: 0,
        federalTaxCount: 0,
        federalTaxValue: 0,
        difference: 0,
      }
    ),
    [visibleFinanceByBooth]
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

  function handleViewAll() {
    setSelectedBoothId("all");
  }

  function handleExportFinanceReport() {
    const rows = [
      ...visibleFinanceByBooth.map((row) => ({
        tipo_registro: "resumo_guiche",
        guiche: row.boothLabel,
        data: "",
        operador: "",
        vendas: row.txCount,
        faturamento_bruto: row.grossSales,
        pix: row.pixSales,
        credito: row.creditSales,
        debito: row.debitSales,
        dinheiro: row.cashSales,
        suprimento: row.suprimento,
        sangria: row.sangria,
        ajuste: row.ajuste,
        taxa_estadual_qtd: row.stateTaxCount,
        taxa_estadual_valor: row.stateTaxValue,
        taxa_federal_qtd: row.federalTaxCount,
        taxa_federal_valor: row.federalTaxValue,
        caixa_estimado: row.saldo,
        esperado: row.expected,
        declarado: row.declared,
        diferenca: row.difference,
        conferencia: row.difference === 0 ? "Conferido" : row.difference > 0 ? "Sobra" : "Falta",
        observacao: "",
      })),
      ...filteredCashMovementRows.map((row) => ({
        tipo_registro: "movimento_caixa",
        guiche: (() => {
          const booth = boothOf(row.booths);
          return booth ? `${booth.code} - ${booth.name}` : "-";
        })(),
        data: new Date(row.created_at).toLocaleString("pt-BR"),
        operador: nameOf(row.profiles) ?? "-",
        vendas: "",
        faturamento_bruto: "",
        pix: "",
        credito: "",
        debito: "",
        dinheiro: "",
        suprimento: row.movement_type === "suprimento" ? Number(row.amount) : "",
        sangria: row.movement_type === "sangria" ? Number(row.amount) : "",
        ajuste: row.movement_type === "ajuste" ? Number(row.amount) : "",
        taxa_estadual_qtd: "",
        taxa_estadual_valor: "",
        taxa_federal_qtd: "",
        taxa_federal_valor: "",
        caixa_estimado: "",
        esperado: "",
        declarado: "",
        diferenca: "",
        conferencia: row.movement_type === "suprimento" ? "Suprimento" : row.movement_type === "sangria" ? "Sangria" : "Ajuste",
        observacao: row.note ?? "",
      })),
      ...filteredShiftCashClosingRows.map((row) => ({
        tipo_registro: "fechamento_caixa",
        guiche: (() => {
          const booth = boothOf(row.booths);
          return booth ? `${booth.code} - ${booth.name}` : "-";
        })(),
        data: new Date(row.created_at).toLocaleString("pt-BR"),
        operador: nameOf(row.profiles) ?? "-",
        vendas: "",
        faturamento_bruto: "",
        pix: "",
        credito: "",
        debito: "",
        dinheiro: "",
        suprimento: "",
        sangria: "",
        ajuste: "",
        taxa_estadual_qtd: "",
        taxa_estadual_valor: "",
        taxa_federal_qtd: "",
        taxa_federal_valor: "",
        caixa_estimado: "",
        esperado: Number(row.expected_cash),
        declarado: Number(row.declared_cash),
        diferenca: Number(row.difference),
        conferencia: Number(row.difference) === 0 ? "Conferido" : Number(row.difference) > 0 ? "Sobra" : "Falta",
        observacao: row.note ?? "",
      })),
    ];

    exportToCSV(
      selectedBoothId === "all" ? "relatorio-financeiro-geral" : `relatorio-${selectedBoothId}`,
      rows,
      [
        { key: "tipo_registro", label: "Tipo de registro" },
        { key: "guiche", label: "Guiche" },
        { key: "data", label: "Data" },
        { key: "operador", label: "Operador" },
        { key: "vendas", label: "Qtd. vendas" },
        { key: "faturamento_bruto", label: "Faturamento bruto" },
        { key: "pix", label: "PIX" },
        { key: "credito", label: "Credito" },
        { key: "debito", label: "Debito" },
        { key: "dinheiro", label: "Dinheiro" },
        { key: "suprimento", label: "Suprimento" },
        { key: "sangria", label: "Sangria" },
        { key: "ajuste", label: "Ajuste" },
        { key: "taxa_estadual_qtd", label: "Qtd taxa estadual" },
        { key: "taxa_estadual_valor", label: "Valor taxa estadual" },
        { key: "taxa_federal_qtd", label: "Qtd taxa federal" },
        { key: "taxa_federal_valor", label: "Valor taxa federal" },
        { key: "caixa_estimado", label: "Caixa estimado" },
        { key: "esperado", label: "Esperado" },
        { key: "declarado", label: "Declarado" },
        { key: "diferenca", label: "Diferenca" },
        { key: "conferencia", label: "Conferencia" },
        { key: "observacao", label: "Observacao" },
      ]
    );
  }

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
          <Button variant="ghost" type="button" onClick={handleViewAll}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar geral
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={handleExportFinanceReport}
            disabled={!visibleFinanceByBooth.length && !filteredCashMovementRows.length && !filteredShiftCashClosingRows.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar relatorio
          </Button>
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

      <Card>
        <SectionHeader
          title={selectedBoothId === "all" ? "Resumo Completo por Guiche" : `Resumo Completo · ${boothDetailLabel}`}
          subtitle="Visualize faturamento bruto, formas de pagamento e taxas de embarque geradas no periodo selecionado."
          className="mb-4"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Faturamento bruto"
            value={formatCurrency(financeSnapshot.grossSales)}
            icon={<Wallet className="h-5 w-5" />}
            delta={`${financeSnapshot.txCount} venda(s)`}
            deltaType="neutral"
          />
          <StatCard
            label="Taxas estaduais"
            value={formatCurrency(financeSnapshot.stateTaxValue)}
            delta={`${financeSnapshot.stateTaxCount} gerada(s)`}
            deltaType="neutral"
          />
          <StatCard
            label="Taxas federais"
            value={formatCurrency(financeSnapshot.federalTaxValue)}
            delta={`${financeSnapshot.federalTaxCount} gerada(s)`}
            deltaType="neutral"
          />
          <StatCard
            label="Divergencia de caixa"
            value={formatCurrency(financeSnapshot.difference)}
            delta={financeSnapshot.difference === 0 ? "Conferido" : financeSnapshot.difference > 0 ? "Sobra" : "Falta"}
            deltaType={financeSnapshot.difference === 0 ? "positive" : financeSnapshot.difference > 0 ? "neutral" : "negative"}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted">PIX</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(financeSnapshot.pixSales)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted">Credito</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(financeSnapshot.creditSales)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted">Debito</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(financeSnapshot.debitSales)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted">Dinheiro</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(financeSnapshot.cashSales)}</p>
          </div>
        </div>
      </Card>

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
          title="Relatorio Detalhado por Guiche"
          subtitle={selectedBoothId === "all" ? "Resumo completo de cada guiche com vendas, formas de pagamento, fechamento e taxas geradas." : `Detalhamento financeiro completo de ${boothDetailLabel}.`}
          className="mb-4"
        />
        <DataTable
          columns={[
            { key: "guiche", header: "Guiche", render: (row) => <span className="font-semibold">{row.boothLabel}</span> },
            { key: "vendas", header: "Vendas", render: (row) => row.txCount },
            { key: "bruto", header: "Faturamento", render: (row) => <span className="font-semibold">{formatCurrency(row.grossSales)}</span> },
            { key: "pix", header: "PIX", render: (row) => formatCurrency(row.pixSales) },
            { key: "credito", header: "Credito", render: (row) => formatCurrency(row.creditSales) },
            { key: "debito", header: "Debito", render: (row) => formatCurrency(row.debitSales) },
            { key: "dinheiro", header: "Dinheiro", render: (row) => formatCurrency(row.cashSales) },
            { key: "suprimento", header: "Suprimento", render: (row) => formatCurrency(row.suprimento) },
            { key: "sangria", header: "Sangria", render: (row) => formatCurrency(row.sangria) },
            { key: "ajuste", header: "Ajuste", render: (row) => formatCurrency(row.ajuste) },
            {
              key: "taxaEstadual",
              header: "Taxa Estadual",
              render: (row) => (
                <div>
                  <p className="font-semibold">{formatCurrency(row.stateTaxValue)}</p>
                  <p className="text-xs text-muted">{row.stateTaxCount} gerada(s)</p>
                </div>
              ),
            },
            {
              key: "taxaFederal",
              header: "Taxa Federal",
              render: (row) => (
                <div>
                  <p className="font-semibold">{formatCurrency(row.federalTaxValue)}</p>
                  <p className="text-xs text-muted">{row.federalTaxCount} gerada(s)</p>
                </div>
              ),
            },
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
