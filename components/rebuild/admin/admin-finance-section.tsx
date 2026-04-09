"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, Download, Eye, FileText, Printer, RefreshCw, TrendingUp, Wallet } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { exportToCSV } from "@/lib/csv-export";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Input, Textarea } from "@/components/rebuild/ui/input";
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
  responsavelConferencia: string;
  dataAssinatura: string;
  observacoesFinais: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onResponsavelConferenciaChange: (value: string) => void;
  onDataAssinaturaChange: (value: string) => void;
  onObservacoesFinaisChange: (value: string) => void;
  onApplyFilters: () => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
};

function formatPeriodDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function getDifferenceStatus(diff: number) {
  if (Math.abs(diff) < 0.01) {
    return {
      label: "Conferido",
      variant: "success" as const,
      textClass: "text-emerald-600",
    };
  }

  if (diff > 0) {
    return {
      label: "Sobra",
      variant: "warning" as const,
      textClass: "text-amber-600",
    };
  }

  return {
    label: "Falta",
    variant: "danger" as const,
    textClass: "text-red-600",
  };
}

export function AdminFinanceSection({
  dateFrom,
  dateTo,
  cashMovementTotals,
  cashClosingTotals,
  financeByBooth,
  cashMovementRows,
  shiftCashClosingRows,
  responsavelConferencia,
  dataAssinatura,
  observacoesFinais,
  onDateFromChange,
  onDateToChange,
  onResponsavelConferenciaChange,
  onDataAssinaturaChange,
  onObservacoesFinaisChange,
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

  const totalTaxValue = Number(financeSnapshot.stateTaxValue || 0) + Number(financeSnapshot.federalTaxValue || 0);
  const averageTicket = financeSnapshot.txCount > 0 ? financeSnapshot.grossSales / financeSnapshot.txCount : 0;
  const overallDifferenceStatus = getDifferenceStatus(Number(financeSnapshot.difference || 0));

  const paymentBreakdown = useMemo(() => {
    const total = Number(financeSnapshot.grossSales || 0);

    return [
      { label: "PIX", value: Number(financeSnapshot.pixSales || 0), percent: total > 0 ? (Number(financeSnapshot.pixSales || 0) / total) * 100 : 0 },
      { label: "Credito", value: Number(financeSnapshot.creditSales || 0), percent: total > 0 ? (Number(financeSnapshot.creditSales || 0) / total) * 100 : 0 },
      { label: "Debito", value: Number(financeSnapshot.debitSales || 0), percent: total > 0 ? (Number(financeSnapshot.debitSales || 0) / total) * 100 : 0 },
      { label: "Dinheiro", value: Number(financeSnapshot.cashSales || 0), percent: total > 0 ? (Number(financeSnapshot.cashSales || 0) / total) * 100 : 0 },
    ];
  }, [financeSnapshot]);

  const rankedFinanceByBooth = useMemo(
    () =>
      [...visibleFinanceByBooth]
        .sort((a, b) => Number(b.grossSales || 0) - Number(a.grossSales || 0))
        .map((row, index) => {
          const grossSales = Number(row.grossSales || 0);
          const txCount = Number(row.txCount || 0);
          const totalTaxes = Number(row.stateTaxValue || 0) + Number(row.federalTaxValue || 0);
          const share = Number(financeSnapshot.grossSales || 0) > 0 ? (grossSales / Number(financeSnapshot.grossSales || 0)) * 100 : 0;
          const avgTicket = txCount > 0 ? grossSales / txCount : 0;

          return {
            ...row,
            rank: index + 1,
            totalTaxes,
            share,
            avgTicket,
            conference: getDifferenceStatus(Number(row.difference || 0)),
          };
        }),
    [financeSnapshot.grossSales, visibleFinanceByBooth]
  );

  const bestBooth = rankedFinanceByBooth[0] ?? null;

  const filteredCashMovementRows = useMemo(
    () => selectedBoothId === "all" ? cashMovementRows : cashMovementRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [cashMovementRows, selectedBoothId]
  );

  const filteredShiftCashClosingRows = useMemo(
    () => selectedBoothId === "all" ? shiftCashClosingRows : shiftCashClosingRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [selectedBoothId, shiftCashClosingRows]
  );

  const boothDetailLabel = selectedBoothSummary?.boothLabel ?? "Todos os guiches";
  const reportGeneratedAt = new Date().toLocaleString("pt-BR");
  const reportReference = selectedBoothId === "all" ? `FIN-GERAL-${visibleFinanceByBooth.length}` : `FIN-${selectedBoothId.slice(0, 8).toUpperCase()}`;
  const signatureDateLabel = formatPeriodDate(dataAssinatura) ?? "Nao informada";
  const reportSummaryText = `${boothDetailLabel} registrou ${financeSnapshot.txCount} venda(s), faturamento bruto de ${formatCurrency(financeSnapshot.grossSales)} e ${overallDifferenceStatus.label.toLowerCase()} de caixa no periodo analisado.`;

  function handleViewAll() {
    setSelectedBoothId("all");
  }

  function handlePrintReport() {
    if (typeof window === "undefined") return;

    const cleanup = () => {
      document.body.classList.remove("printing-finance-report");
      window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add("printing-finance-report");
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  function handleExportFinanceReport() {
    const generatedAt = new Date().toLocaleString("pt-BR");
    const rows = [
      {
        tipo_registro: "resumo_executivo",
        guiche: selectedBoothId === "all" ? "Todos os guiches" : boothDetailLabel,
        data: generatedAt,
        operador: "",
        vendas: financeSnapshot.txCount,
        faturamento_bruto: financeSnapshot.grossSales,
        pix: financeSnapshot.pixSales,
        credito: financeSnapshot.creditSales,
        debito: financeSnapshot.debitSales,
        dinheiro: financeSnapshot.cashSales,
        suprimento: cashMovementTotals.suprimento,
        sangria: cashMovementTotals.sangria,
        ajuste: cashMovementTotals.ajuste,
        taxa_estadual_qtd: financeSnapshot.stateTaxCount,
        taxa_estadual_valor: financeSnapshot.stateTaxValue,
        taxa_federal_qtd: financeSnapshot.federalTaxCount,
        taxa_federal_valor: financeSnapshot.federalTaxValue,
        taxas_totais: totalTaxValue,
        ticket_medio: averageTicket,
        participacao_percentual: formatPercent(100),
        caixa_estimado: cashMovementTotals.saldo,
        esperado: cashClosingTotals.expected,
        declarado: cashClosingTotals.declared,
        diferenca: financeSnapshot.difference,
        conferencia: overallDifferenceStatus.label,
        total_movimentos: filteredCashMovementRows.length,
        total_fechamentos: filteredShiftCashClosingRows.length,
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
        observacao: periodLabel,
      },
      ...rankedFinanceByBooth.map((row) => ({
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
        taxas_totais: row.totalTaxes,
        ticket_medio: row.avgTicket,
        participacao_percentual: formatPercent(row.share),
        caixa_estimado: row.saldo,
        esperado: row.expected,
        declarado: row.declared,
        diferenca: row.difference,
        conferencia: row.conference.label,
        total_movimentos: row.movementCount,
        total_fechamentos: row.closingCount,
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
        observacao: `Ranking ${row.rank}`,
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
        taxas_totais: "",
        ticket_medio: "",
        participacao_percentual: "",
        caixa_estimado: "",
        esperado: "",
        declarado: "",
        diferenca: "",
        conferencia: row.movement_type === "suprimento" ? "Suprimento" : row.movement_type === "sangria" ? "Sangria" : "Ajuste",
        total_movimentos: "",
        total_fechamentos: "",
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
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
        taxas_totais: "",
        ticket_medio: "",
        participacao_percentual: "",
        caixa_estimado: "",
        esperado: Number(row.expected_cash),
        declarado: Number(row.declared_cash),
        diferenca: Number(row.difference),
        conferencia: getDifferenceStatus(Number(row.difference)).label,
        total_movimentos: "",
        total_fechamentos: "",
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
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
        { key: "taxas_totais", label: "Taxas totais" },
        { key: "ticket_medio", label: "Ticket medio" },
        { key: "participacao_percentual", label: "Participacao" },
        { key: "caixa_estimado", label: "Caixa estimado" },
        { key: "esperado", label: "Esperado" },
        { key: "declarado", label: "Declarado" },
        { key: "diferenca", label: "Diferenca" },
        { key: "conferencia", label: "Conferencia" },
        { key: "total_movimentos", label: "Movimentos" },
        { key: "total_fechamentos", label: "Fechamentos" },
        { key: "responsavel_conferencia", label: "Responsavel pela conferencia" },
        { key: "data_assinatura", label: "Data da assinatura" },
        { key: "observacoes_finais", label: "Observacoes finais" },
        { key: "observacao", label: "Observacao" },
      ]
    );
  }

  return (
    <div className="finance-report-print-scope space-y-6 print:space-y-4">
      <div className="print:hidden space-y-6">
        <SectionHeader
          title="Financeiro Operacional"
          subtitle="Consolide o periodo, refine por guiche e emita um relatorio financeiro mais organizado para o administrativo."
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
            Baixar relatorio detalhado
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={handlePrintReport}
            disabled={!visibleFinanceByBooth.length}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir relatorio
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
      </div>

      <Card className="hidden print:block print:border-slate-300 print:bg-white print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Central Viagens</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">Relatorio Financeiro Gerencial</h2>
            <p className="mt-2 text-sm text-muted">Documento preparado para conferencia administrativa e emissao detalhada.</p>
          </div>
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Referencia</p>
            <p className="font-semibold text-foreground">{reportReference}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Emitido em</p>
            <p className="font-semibold text-foreground">{reportGeneratedAt}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Escopo</p>
            <p className="font-semibold text-foreground">{boothDetailLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Status</p>
            <p className="font-semibold text-foreground">{overallDifferenceStatus.label}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/10 p-3 text-sm text-foreground">
          {reportSummaryText}
        </div>
      </Card>

      <Card className="print:border-slate-300 print:bg-white print:shadow-none">
        <SectionHeader
          title="Relatorio detalhado pronto para emissao"
          subtitle={selectedBoothId === "all" ? "Consolidado mais limpo para auditoria, conferencia e exportacao por guiche." : `Emissao financeira completa de ${boothDetailLabel}, com leitura executiva e operacional.`}
          className="mb-4"
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{selectedBoothId === "all" ? "Consolidado geral" : "Guiche selecionado"}</Badge>
              <Badge variant={overallDifferenceStatus.variant}>{overallDifferenceStatus.label}</Badge>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedBoothId === "all" ? "Relatorio executivo do periodo" : `Relatorio executivo · ${boothDetailLabel}`}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Estrutura ajustada para o administrativo validar faturamento, mix de pagamentos, taxas e conferencia de caixa com mais rapidez.
                </p>
                <p className="mt-2 text-sm text-foreground print:text-black">{reportSummaryText}</p>
              </div>
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs text-muted">Periodo analisado</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{periodLabel}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs text-muted">Ticket medio</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(averageTicket)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs text-muted">Total de taxas</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(totalTaxValue)}</p>
                <p className="text-xs text-muted">{financeSnapshot.stateTaxCount + financeSnapshot.federalTaxCount} gerada(s)</p>
              </div>
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs text-muted">Conferencia operacional</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{filteredShiftCashClosingRows.length} fechamento(s)</p>
                <p className="text-xs text-muted">{filteredCashMovementRows.length} movimento(s) no caixa</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {paymentBreakdown.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(Math.max(item.percent, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{formatPercent(item.percent)} do faturamento do recorte</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted">Maior faturamento do recorte</p>
            <p className="mt-1 text-base font-semibold text-foreground">{bestBooth?.boothLabel ?? boothDetailLabel}</p>
            <p className="text-sm text-muted">{formatCurrency(bestBooth?.grossSales ?? financeSnapshot.grossSales)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted">Participacao da lideranca</p>
            <p className="mt-1 text-base font-semibold text-foreground">{bestBooth ? formatPercent(bestBooth.share) : "0,0%"}</p>
            <p className="text-sm text-muted">{bestBooth ? `${bestBooth.txCount} venda(s)` : "Sem vendas no periodo"}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted">Status do caixa</p>
            <div className="mt-1">
              <Badge variant={overallDifferenceStatus.variant}>{overallDifferenceStatus.label}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{closingDifferenceDelta}</p>
          </div>
        </div>

        <div className="mt-4">
          <DataTable
            columns={[
              { key: "rank", header: "#", render: (row) => <span className="font-semibold">{row.rank}</span> },
              {
                key: "guiche",
                header: "Guiche",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">{row.boothLabel}</p>
                    <p className="text-xs text-muted">{row.txCount} venda(s)</p>
                  </div>
                ),
              },
              {
                key: "participacao",
                header: "Participacao",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">{formatPercent(row.share)}</p>
                    <p className="text-xs text-muted">do bruto do periodo</p>
                  </div>
                ),
              },
              {
                key: "faturamento",
                header: "Faturamento e ticket",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">{formatCurrency(row.grossSales)}</p>
                    <p className="text-xs text-muted">Ticket medio {formatCurrency(row.avgTicket)}</p>
                  </div>
                ),
              },
              {
                key: "pagamentos",
                header: "Pagamentos",
                render: (row) => (
                  <div className="space-y-1 text-xs text-muted">
                    <p>PIX {formatCurrency(row.pixSales)}</p>
                    <p>Credito {formatCurrency(row.creditSales)}</p>
                    <p>Debito {formatCurrency(row.debitSales)}</p>
                    <p>Dinheiro {formatCurrency(row.cashSales)}</p>
                  </div>
                ),
              },
              {
                key: "taxas",
                header: "Taxas geradas",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">{formatCurrency(row.totalTaxes)}</p>
                    <p className="text-xs text-muted">Est. {row.stateTaxCount} / Fed. {row.federalTaxCount}</p>
                  </div>
                ),
              },
              {
                key: "caixa",
                header: "Caixa e fechamento",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">Saldo {formatCurrency(row.saldo)}</p>
                    <p className="text-xs text-muted">Esp. {formatCurrency(row.expected)} / Dec. {formatCurrency(row.declared)}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <div className="space-y-1">
                    <Badge variant={row.conference.variant}>{row.conference.label}</Badge>
                    <p className={`text-xs ${row.conference.textClass}`}>{formatCurrency(Number(row.difference || 0))}</p>
                  </div>
                ),
              },
              {
                key: "operacao",
                header: "Operacao",
                render: (row) => (
                  <div className="text-xs text-muted">
                    <p>{row.movementCount} mov.</p>
                    <p>{row.closingCount} fechamento(s)</p>
                  </div>
                ),
              },
            ]}
            rows={rankedFinanceByBooth}
            emptyMessage="Nenhum guiche com dados financeiros no periodo informado."
          />
        </div>
      </Card>

      <Card className="print:border-slate-300 print:bg-white print:shadow-none">
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

      <Card className="print:border-slate-300 print:bg-white print:shadow-none">
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

      <Card className="print:break-inside-avoid print:border-slate-300 print:bg-white print:shadow-none">
        <SectionHeader
          title="Conferencia e responsavel"
          subtitle="Espaco para validacao final do relatorio pelo administrativo."
          className="mb-4"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="print:hidden">
              <Input
                label="Responsavel pela conferencia"
                value={responsavelConferencia}
                onChange={(e) => onResponsavelConferenciaChange(e.target.value)}
                placeholder="Digite o nome do responsavel"
              />
            </div>
            <div className="hidden print:block">
              <p className="text-xs text-muted">Responsavel pela conferencia</p>
              <p className="mt-6 text-sm font-semibold text-foreground">{responsavelConferencia || "________________________________"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="print:hidden">
              <Input
                type="date"
                label="Data / assinatura"
                value={dataAssinatura}
                onChange={(e) => onDataAssinaturaChange(e.target.value)}
              />
            </div>
            <div className="hidden print:block">
              <p className="text-xs text-muted">Data / assinatura</p>
              <p className="mt-6 text-sm font-semibold text-foreground">{signatureDateLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border p-4">
          <div className="print:hidden">
            <Textarea
              label="Observacoes finais"
              value={observacoesFinais}
              onChange={(e) => onObservacoesFinaisChange(e.target.value)}
              placeholder="Digite observacoes importantes para a conferencia ou emissao do relatorio"
              className="min-h-[120px]"
            />
          </div>
          <div className="hidden print:block">
            <p className="text-xs text-muted">Observacoes finais</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{observacoesFinais || "Sem observacoes adicionais."}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
