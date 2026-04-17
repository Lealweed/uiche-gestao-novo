"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Eye, Printer, TrendingUp, Wallet } from "lucide-react";

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

type DailyCashClosingRow = {
  id: string;
  office_id?: string | null;
  user_id?: string | null;
  date: string;
  company: string;
  total_sold: number;
  amount_pix: number;
  amount_card: number;
  amount_cash: number;
  ceia_base: number;
  ceia_pix: number;
  ceia_debito: number;
  ceia_credito: number;
  ceia_link_estadual: number;
  ceia_link_interestadual: number;
  ceia_dinheiro: number;
  ceia_total_lancado: number;
  ceia_faltante: number;
  cash_net: number;
  status: "open" | "closed";
  notes: string | null;
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

type ReportTxRow = {
  id: string;
  booth_id?: string | null;
  amount: number;
  sold_at?: string;
  payment_method?: string | null;
  boarding_tax_state?: number | null;
  boarding_tax_federal?: number | null;
  profiles?: { full_name: string } | { full_name: string }[] | null;
  booths?: { code: string; name: string } | { code: string; name: string }[] | null;
  companies?: { name: string } | { name: string }[] | null;
};

type GroupedFinanceByBoothRow = FinanceByBoothRow & {
  operatorLabel: string;
};

type ConsolidatedFinanceRow = {
  id: string;
  createdAt: string;
  recordType: string;
  boothLabel: string;
  operatorName: string;
  detail: string;
  amountValue: number;
  cashImpactValue: number;
  statusLabel: string;
  statusVariant: "success" | "warning" | "danger" | "neutral" | "info" | "secondary" | "primary";
  note: string;
};

type AdminFinanceSectionProps = {
  dateFrom: string;
  dateTo: string;
  cashMovementTotals: CashMovementTotals;
  cashClosingTotals: CashClosingTotals;
  financeByBooth: FinanceByBoothRow[];
  reportTxs: ReportTxRow[];
  cashMovementRows: CashMovementRow[];
  shiftCashClosingRows: ShiftCashClosingRow[];
  dailyCashClosingRows: DailyCashClosingRow[];
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

function getCeiaDifferenceStatus(diff: number) {
  if (Math.abs(diff) < 0.01) {
    return {
      key: "conferido" as const,
      label: "Conferido",
      variant: "success" as const,
      textClass: "text-emerald-600",
    };
  }

  if (diff > 0) {
    return {
      key: "faltando" as const,
      label: "Faltando",
      variant: "warning" as const,
      textClass: "text-amber-600",
    };
  }

  return {
    key: "excedido" as const,
    label: "Excedido",
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
  reportTxs,
  cashMovementRows,
  shiftCashClosingRows,
  dailyCashClosingRows,
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
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [conferenceFilter, setConferenceFilter] = useState<"all" | "conferido" | "faltando" | "excedido">("all");

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

  const groupedFinanceByBooth = useMemo<GroupedFinanceByBoothRow[]>(() => {
    const summaryMap = new Map<
      string,
      GroupedFinanceByBoothRow & {
        operatorSet: Set<string>;
      }
    >();

    const ensureSummary = (
      boothId?: string | null,
      boothValue?: { code: string; name: string } | { code: string; name: string }[] | null,
    ) => {
      const normalizedBoothId = boothId ?? "sem-guiche";
      if (!summaryMap.has(normalizedBoothId)) {
        const booth = boothOf(boothValue ?? null);
        const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";

        summaryMap.set(normalizedBoothId, {
          boothId: normalizedBoothId,
          boothLabel,
          operatorLabel: "Operacao do periodo",
          operatorSet: new Set<string>(),
          grossSales: 0,
          txCount: 0,
          pixSales: 0,
          creditSales: 0,
          debitSales: 0,
          cashSales: 0,
          suprimento: 0,
          sangria: 0,
          ajuste: 0,
          saldo: 0,
          expected: 0,
          declared: 0,
          difference: 0,
          stateTaxCount: 0,
          stateTaxValue: 0,
          federalTaxCount: 0,
          federalTaxValue: 0,
          movementCount: 0,
          closingCount: 0,
        });
      }

      return summaryMap.get(normalizedBoothId)!;
    };

    for (const tx of reportTxs) {
      const row = ensureSummary(tx.booth_id, tx.booths ?? null);
      const amount = Number(tx.amount || 0);
      const paymentMethod = (tx.payment_method ?? "").toLowerCase();
      const operatorName = nameOf(tx.profiles ?? null);

      row.grossSales += amount;
      row.txCount += 1;
      if (paymentMethod === "pix") row.pixSales += amount;
      else if (paymentMethod === "credit") row.creditSales += amount;
      else if (paymentMethod === "debit") row.debitSales += amount;
      else if (paymentMethod === "cash") row.cashSales += amount;

      const stateTax = Number(tx.boarding_tax_state || 0);
      const federalTax = Number(tx.boarding_tax_federal || 0);
      if (stateTax > 0) {
        row.stateTaxCount += 1;
        row.stateTaxValue += stateTax;
      }
      if (federalTax > 0) {
        row.federalTaxCount += 1;
        row.federalTaxValue += federalTax;
      }
      if (operatorName && operatorName !== "-") row.operatorSet.add(operatorName);
    }

    for (const movement of cashMovementRows) {
      const row = ensureSummary(movement.booth_id, movement.booths ?? null);
      const amount = Number(movement.amount || 0);
      const operatorName = nameOf(movement.profiles ?? null);

      if (movement.movement_type === "suprimento") row.suprimento += amount;
      else if (movement.movement_type === "sangria") row.sangria += amount;
      else row.ajuste += amount;

      row.movementCount += 1;
      if (operatorName && operatorName !== "-") row.operatorSet.add(operatorName);
    }

    for (const closing of shiftCashClosingRows) {
      const row = ensureSummary(closing.booth_id, closing.booths ?? null);
      const operatorName = nameOf(closing.profiles ?? null);
      row.expected += Number(closing.expected_cash || 0);
      row.declared += Number(closing.declared_cash || 0);
      row.difference += Number(closing.difference || 0);
      row.closingCount += 1;
      if (operatorName && operatorName !== "-") row.operatorSet.add(operatorName);
    }

    return Array.from(summaryMap.values())
      .map(({ operatorSet, ...row }) => ({
        ...row,
        operatorLabel: Array.from(operatorSet).slice(0, 2).join(" • ") || "Operacao do periodo",
        saldo: row.cashSales + row.suprimento - row.sangria + row.ajuste,
      }))
      .sort((a, b) => Number(b.grossSales || 0) - Number(a.grossSales || 0));
  }, [cashMovementRows, reportTxs, shiftCashClosingRows]);

  const normalizedFinanceByBooth = useMemo<GroupedFinanceByBoothRow[]>(
    () => (groupedFinanceByBooth.length ? groupedFinanceByBooth : financeByBooth.map((row) => ({ ...row, operatorLabel: "Operacao do periodo" }))),
    [financeByBooth, groupedFinanceByBooth]
  );

  const boothOptions = useMemo(
    () => normalizedFinanceByBooth.filter((row) => row.boothId !== "sem-guiche"),
    [normalizedFinanceByBooth]
  );

  const visibleFinanceByBooth = useMemo(
    () => selectedBoothId === "all" ? normalizedFinanceByBooth : normalizedFinanceByBooth.filter((row) => row.boothId === selectedBoothId),
    [normalizedFinanceByBooth, selectedBoothId]
  );

  const selectedBoothSummary = useMemo(
    () => selectedBoothId === "all" ? null : normalizedFinanceByBooth.find((row) => row.boothId === selectedBoothId) ?? null,
    [normalizedFinanceByBooth, selectedBoothId]
  );

  const filteredReportTxs = useMemo(
    () => selectedBoothId === "all" ? reportTxs : reportTxs.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [reportTxs, selectedBoothId]
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


  const filteredCashMovementRows = useMemo(
    () => selectedBoothId === "all" ? cashMovementRows : cashMovementRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [cashMovementRows, selectedBoothId]
  );

  const filteredShiftCashClosingRows = useMemo(
    () => selectedBoothId === "all" ? shiftCashClosingRows : shiftCashClosingRows.filter((row) => (row.booth_id ?? "sem-guiche") === selectedBoothId),
    [selectedBoothId, shiftCashClosingRows]
  );

  const dailyClosingCompanyOptions = useMemo(
    () => Array.from(new Set(dailyCashClosingRows.map((row) => row.company).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dailyCashClosingRows]
  );

  const dailyClosingOperatorOptions = useMemo(
    () => Array.from(new Set(dailyCashClosingRows.map((row) => nameOf(row.profiles ?? null)).filter((value): value is string => Boolean(value && value !== "-")))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dailyCashClosingRows]
  );

  const filteredDailyCashClosingRows = useMemo(
    () => dailyCashClosingRows.filter((row) => {
      const boothMatch = selectedBoothId === "all" || (row.office_id ?? "sem-guiche") === selectedBoothId;
      const companyMatch = selectedCompany === "all" || row.company === selectedCompany;
      const operatorName = nameOf(row.profiles ?? null) ?? "-";
      const operatorMatch = selectedOperator === "all" || operatorName === selectedOperator;
      const conferenceMatch = conferenceFilter === "all" || getCeiaDifferenceStatus(Number(row.ceia_faltante || 0)).key === conferenceFilter;

      return boothMatch && companyMatch && operatorMatch && conferenceMatch;
    }),
    [conferenceFilter, dailyCashClosingRows, selectedBoothId, selectedCompany, selectedOperator]
  );

  const ceiaSummary = useMemo(
    () => filteredDailyCashClosingRows.reduce(
      (acc, row) => {
        const ceiaBase = Number(row.ceia_base || 0);
        const ceiaLancado = Number(row.ceia_total_lancado || 0);
        const ceiaFaltante = Number(row.ceia_faltante || 0);

        acc.base += ceiaBase;
        acc.lancado += ceiaLancado;
        acc.diferenca += ceiaFaltante;
        acc.cashNet += Number(row.cash_net || 0);
        if (Math.abs(ceiaFaltante) < 0.01) acc.conferidos += 1;
        else acc.comDiferenca += 1;
        return acc;
      },
      { base: 0, lancado: 0, diferenca: 0, cashNet: 0, conferidos: 0, comDiferenca: 0 }
    ),
    [filteredDailyCashClosingRows]
  );

  const topCompaniesByCeia = useMemo(() => {
    const grouped = new Map<string, { company: string; base: number; lancado: number; diferenca: number; count: number }>();

    for (const row of filteredDailyCashClosingRows) {
      const current = grouped.get(row.company) ?? { company: row.company, base: 0, lancado: 0, diferenca: 0, count: 0 };
      current.base += Number(row.ceia_base || 0);
      current.lancado += Number(row.ceia_total_lancado || 0);
      current.diferenca += Number(row.ceia_faltante || 0);
      current.count += 1;
      grouped.set(row.company, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.base - a.base).slice(0, 5);
  }, [filteredDailyCashClosingRows]);

  const topOperatorsByDivergence = useMemo(() => {
    const grouped = new Map<string, { operator: string; divergence: number; records: number; net: number }>();

    for (const row of filteredDailyCashClosingRows) {
      const operator = nameOf(row.profiles ?? null) ?? "-";
      const current = grouped.get(operator) ?? { operator, divergence: 0, records: 0, net: 0 };
      current.divergence += Math.abs(Number(row.ceia_faltante || 0));
      current.records += 1;
      current.net += Number(row.ceia_faltante || 0);
      grouped.set(operator, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.divergence - a.divergence).slice(0, 5);
  }, [filteredDailyCashClosingRows]);

  const consolidatedFinanceRows = useMemo<ConsolidatedFinanceRow[]>(() => {
    const txRows = filteredReportTxs.map((tx) => {
      const booth = boothOf(tx.booths ?? null);
      const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
      const operatorName = nameOf(tx.profiles ?? null) ?? "-";
      const paymentMethod = (tx.payment_method ?? "-").toLowerCase();
      const paymentLabel = paymentMethod === "cash"
        ? "Dinheiro"
        : paymentMethod === "pix"
          ? "PIX"
          : paymentMethod === "credit"
            ? "Credito"
            : paymentMethod === "debit"
              ? "Debito"
              : "Venda";
      const statusVariant: ConsolidatedFinanceRow["statusVariant"] = paymentMethod === "cash"
        ? "success"
        : paymentMethod === "pix"
          ? "primary"
          : "secondary";
      const companyName = tx.companies && !Array.isArray(tx.companies) ? tx.companies.name : "Venda consolidada";
      const amountValue = Number(tx.amount || 0);

      return {
        id: `tx-${tx.id}`,
        createdAt: tx.sold_at ?? new Date().toISOString(),
        recordType: "Venda",
        boothLabel,
        operatorName,
        detail: `${companyName} · ${paymentLabel}`,
        amountValue,
        cashImpactValue: paymentMethod === "cash" ? amountValue : 0,
        statusLabel: paymentLabel,
        statusVariant,
        note: `Taxas: ${formatCurrency(Number(tx.boarding_tax_state || 0) + Number(tx.boarding_tax_federal || 0))}`,
      };
    });

    const movementRows = filteredCashMovementRows.map((row) => {
      const booth = boothOf(row.booths ?? null);
      const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
      const operatorName = nameOf(row.profiles ?? null) ?? "-";
      const amountValue = Number(row.amount || 0);
      const isWithdrawal = row.movement_type === "sangria";
      const statusVariant: ConsolidatedFinanceRow["statusVariant"] = row.movement_type === "suprimento" ? "success" : row.movement_type === "sangria" ? "warning" : "info";
      const statusLabel = row.movement_type === "suprimento" ? "Suprimento" : row.movement_type === "sangria" ? "Sangria" : "Ajuste";

      return {
        id: `cash-${row.id}`,
        createdAt: row.created_at,
        recordType: statusLabel,
        boothLabel,
        operatorName,
        detail: row.note ?? "Movimento operacional do caixa",
        amountValue,
        cashImpactValue: isWithdrawal ? -amountValue : amountValue,
        statusLabel,
        statusVariant,
        note: row.note ?? "Sem observacao",
      };
    });

    const closingRows = filteredShiftCashClosingRows.map((row) => {
      const booth = boothOf(row.booths ?? null);
      const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
      const operatorName = nameOf(row.profiles ?? null) ?? "-";
      const difference = Number(row.difference || 0);
      const diffStatus = getDifferenceStatus(difference);

      return {
        id: `closing-${row.id}`,
        createdAt: row.created_at,
        recordType: "Fechamento",
        boothLabel,
        operatorName,
        detail: `Esperado ${formatCurrency(Number(row.expected_cash || 0))} · Declarado ${formatCurrency(Number(row.declared_cash || 0))}`,
        amountValue: Number(row.declared_cash || 0),
        cashImpactValue: difference,
        statusLabel: diffStatus.label,
        statusVariant: diffStatus.variant,
        note: row.note ?? "Sem observacao",
      };
    });

    return [...txRows, ...movementRows, ...closingRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filteredCashMovementRows, filteredReportTxs, filteredShiftCashClosingRows]);

  const boothDetailLabel = selectedBoothSummary?.boothLabel ?? "Todos os guiches";
  const reportGeneratedAt = new Date().toLocaleString("pt-BR");
  const reportReference = selectedBoothId === "all" ? `FIN-GERAL-${visibleFinanceByBooth.length}` : `FIN-${selectedBoothId.slice(0, 8).toUpperCase()}`;
  const signatureDateLabel = formatPeriodDate(dataAssinatura) ?? "Nao informada";
  const reportSummaryText = `${boothDetailLabel} registrou ${financeSnapshot.txCount} venda(s), faturamento bruto de ${formatCurrency(financeSnapshot.grossSales)} e ${overallDifferenceStatus.label.toLowerCase()} de caixa no periodo analisado.`;

  function handleViewAll() {
    setSelectedBoothId("all");
    setSelectedCompany("all");
    setSelectedOperator("all");
    setConferenceFilter("all");
  }

  function handlePrintReport() {
    if (typeof window === "undefined") return;

    const cleanup = () => {
      document.body.classList.remove("printing-report");
      window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add("printing-report");
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
        ceia_base_total: ceiaSummary.base,
        ceia_total_lancado: ceiaSummary.lancado,
        ceia_diferenca_acumulada: ceiaSummary.diferenca,
        ceia_conferidos: ceiaSummary.conferidos,
        ceia_com_diferenca: ceiaSummary.comDiferenca,
      },
      ...rankedFinanceByBooth.map((row) => ({
        tipo_registro: "resumo_guiche",
        guiche: row.boothLabel,
        data: "",
        operador: row.operatorLabel,
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
      ...filteredReportTxs.map((tx) => ({
        tipo_registro: "transacao",
        guiche: (() => {
          const booth = boothOf(tx.booths ?? null);
          return booth ? `${booth.code} - ${booth.name}` : "-";
        })(),
        data: tx.sold_at ? new Date(tx.sold_at).toLocaleString("pt-BR") : "-",
        operador: nameOf(tx.profiles ?? null) ?? "-",
        vendas: 1,
        faturamento_bruto: Number(tx.amount || 0),
        pix: (tx.payment_method ?? "").toLowerCase() === "pix" ? Number(tx.amount || 0) : "",
        credito: (tx.payment_method ?? "").toLowerCase() === "credit" ? Number(tx.amount || 0) : "",
        debito: (tx.payment_method ?? "").toLowerCase() === "debit" ? Number(tx.amount || 0) : "",
        dinheiro: (tx.payment_method ?? "").toLowerCase() === "cash" ? Number(tx.amount || 0) : "",
        suprimento: "",
        sangria: "",
        ajuste: "",
        taxa_estadual_qtd: Number(tx.boarding_tax_state || 0) > 0 ? 1 : "",
        taxa_estadual_valor: Number(tx.boarding_tax_state || 0) || "",
        taxa_federal_qtd: Number(tx.boarding_tax_federal || 0) > 0 ? 1 : "",
        taxa_federal_valor: Number(tx.boarding_tax_federal || 0) || "",
        taxas_totais: Number(tx.boarding_tax_state || 0) + Number(tx.boarding_tax_federal || 0),
        ticket_medio: Number(tx.amount || 0),
        participacao_percentual: "",
        caixa_estimado: (tx.payment_method ?? "").toLowerCase() === "cash" ? Number(tx.amount || 0) : "",
        esperado: "",
        declarado: "",
        diferenca: "",
        conferencia: (tx.payment_method ?? "").toUpperCase() || "VENDA",
        total_movimentos: "",
        total_fechamentos: "",
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
        observacao: tx.companies && !Array.isArray(tx.companies) ? tx.companies.name : "Venda consolidada",
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
      ...filteredDailyCashClosingRows.map((row) => ({
        tipo_registro: "fechamento_ceia",
        guiche: (() => {
          const booth = boothOf(row.booths);
          return booth ? `${booth.code} - ${booth.name}` : "-";
        })(),
        data: new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR"),
        operador: nameOf(row.profiles ?? null) ?? "-",
        empresa: row.company,
        vendas: "",
        faturamento_bruto: Number(row.total_sold || 0),
        pix: Number(row.ceia_pix || 0),
        credito: Number(row.ceia_credito || 0),
        debito: Number(row.ceia_debito || 0),
        dinheiro: Number(row.ceia_dinheiro || 0),
        suprimento: "",
        sangria: "",
        ajuste: "",
        taxa_estadual_qtd: "",
        taxa_estadual_valor: Number(row.ceia_link_estadual || 0),
        taxa_federal_qtd: "",
        taxa_federal_valor: Number(row.ceia_link_interestadual || 0),
        taxas_totais: Number(row.ceia_link_estadual || 0) + Number(row.ceia_link_interestadual || 0),
        ticket_medio: "",
        participacao_percentual: "",
        caixa_estimado: Number(row.cash_net || 0),
        esperado: Number(row.ceia_base || 0),
        declarado: Number(row.ceia_total_lancado || 0),
        diferenca: Number(row.ceia_faltante || 0),
        conferencia: getCeiaDifferenceStatus(Number(row.ceia_faltante || 0)).label,
        total_movimentos: "",
        total_fechamentos: 1,
        responsavel_conferencia: responsavelConferencia,
        data_assinatura: signatureDateLabel,
        observacoes_finais: observacoesFinais,
        observacao: row.notes ?? "",
        ceia_base_total: Number(row.ceia_base || 0),
        ceia_total_lancado: Number(row.ceia_total_lancado || 0),
        ceia_diferenca_acumulada: Number(row.ceia_faltante || 0),
        ceia_conferidos: Math.abs(Number(row.ceia_faltante || 0)) < 0.01 ? 1 : 0,
        ceia_com_diferenca: Math.abs(Number(row.ceia_faltante || 0)) < 0.01 ? 0 : 1,
      })),
    ];

    exportToCSV(
      selectedBoothId === "all" ? "relatorio-financeiro-ceia-geral" : `relatorio-ceia-${selectedBoothId}`,
      rows,
      [
        { key: "tipo_registro", label: "Tipo de registro" },
        { key: "guiche", label: "Guiche" },
        { key: "data", label: "Data" },
        { key: "operador", label: "Operador" },
        { key: "empresa", label: "Empresa" },
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
        { key: "ceia_base_total", label: "CEIA base" },
        { key: "ceia_total_lancado", label: "CEIA lancado" },
        { key: "ceia_diferenca_acumulada", label: "CEIA diferenca" },
        { key: "ceia_conferidos", label: "CEIA conferidos" },
        { key: "ceia_com_diferenca", label: "CEIA com diferenca" },
      ]
    );
  }

  return (
    <div className="report-print-scope space-y-6 print:space-y-4">
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

          <div className="min-w-[220px]">
            <label className="mb-1 block text-sm text-foreground">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todas as empresas</option>
              {dailyClosingCompanyOptions.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[220px]">
            <label className="mb-1 block text-sm text-foreground">Operador</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todos os operadores</option>
              {dailyClosingOperatorOptions.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[220px]">
            <label className="mb-1 block text-sm text-foreground">Status da conferencia</label>
            <select
              value={conferenceFilter}
              onChange={(e) => setConferenceFilter(e.target.value as "all" | "conferido" | "faltando" | "excedido")}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todos os status</option>
              <option value="conferido">Conferido</option>
              <option value="faltando">Faltando</option>
              <option value="excedido">Excedido</option>
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
            Exportar CSV
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
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total geral do periodo"
          value={formatCurrency(financeSnapshot.grossSales)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta={`${financeSnapshot.txCount} venda(s)`}
          deltaType="positive"
        />
        <StatCard
          label="Caixa estimado (gaveta)"
          value={formatCurrency(cashMovementTotals.saldo)}
          icon={<Wallet className="h-5 w-5" />}
          delta={`Supr. ${formatCurrency(cashMovementTotals.suprimento)} · Sangr. ${formatCurrency(cashMovementTotals.sangria)}`}
          deltaType={cashMovementTotals.saldo >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Diferenca (fechamento)"
          value={formatCurrency(cashClosingTotals.difference)}
          delta={closingDifferenceDelta}
          deltaType={cashClosingTotals.difference === 0 ? "positive" : cashClosingTotals.difference < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Ticket medio"
          value={formatCurrency(averageTicket)}
          delta={`${filteredReportTxs.length} transacao(oes)`}
          deltaType="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CEIA base"
          value={formatCurrency(ceiaSummary.base)}
          icon={<Wallet className="h-5 w-5" />}
          delta={`${filteredDailyCashClosingRows.length} fechamento(s)`}
          deltaType="neutral"
        />
        <StatCard
          label="Total lancado"
          value={formatCurrency(ceiaSummary.lancado)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta={ceiaSummary.lancado >= ceiaSummary.base ? "Lancamento completo ou acima" : "Ainda existem diferencas"}
          deltaType={ceiaSummary.lancado >= ceiaSummary.base ? "positive" : "neutral"}
        />
        <StatCard
          label="Diferenca acumulada"
          value={formatCurrency(ceiaSummary.diferenca)}
          icon={<Wallet className="h-5 w-5" />}
          delta={Math.abs(ceiaSummary.diferenca) < 0.01 ? "Periodo conferido" : ceiaSummary.diferenca > 0 ? "Saldo faltando no periodo" : "Periodo com excedente"}
          deltaType={Math.abs(ceiaSummary.diferenca) < 0.01 ? "positive" : ceiaSummary.diferenca > 0 ? "neutral" : "negative"}
        />
        <StatCard
          label="Conferencia CEIA"
          value={`${ceiaSummary.conferidos} x ${ceiaSummary.comDiferenca}`}
          icon={<Eye className="h-5 w-5" />}
          delta="Conferidos x com diferenca"
          deltaType={ceiaSummary.comDiferenca === 0 ? "positive" : "neutral"}
        />
      </div>

      <Card>
        <SectionHeader
          title="Gestao consolidada CEIA"
          subtitle="Acompanhe o volume por empresa, divergencia por operador e o historico filtrado do fechamento por resumo."
          className="mb-4"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card-elevated))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Top empresas por volume</h3>
              <Badge variant="secondary">{topCompaniesByCeia.length}</Badge>
            </div>
            <div className="space-y-2">
              {topCompaniesByCeia.length === 0 ? (
                <p className="text-sm text-muted">Nenhum fechamento encontrado com os filtros atuais.</p>
              ) : topCompaniesByCeia.map((row, index) => (
                <div key={`${row.company}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{index + 1}. {row.company}</p>
                    <p className="text-xs text-muted">{row.count} fechamento(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(row.base)}</p>
                    <p className={`text-xs ${Math.abs(row.diferenca) < 0.01 ? "text-emerald-600" : row.diferenca > 0 ? "text-amber-600" : "text-red-600"}`}>Dif. {formatCurrency(row.diferenca)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card-elevated))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Top operadores por divergencia</h3>
              <Badge variant="secondary">{topOperatorsByDivergence.length}</Badge>
            </div>
            <div className="space-y-2">
              {topOperatorsByDivergence.length === 0 ? (
                <p className="text-sm text-muted">Sem divergencias registradas no periodo filtrado.</p>
              ) : topOperatorsByDivergence.map((row, index) => (
                <div key={`${row.operator}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{index + 1}. {row.operator}</p>
                    <p className="text-xs text-muted">{row.records} fechamento(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(row.divergence)}</p>
                    <p className={`text-xs ${Math.abs(row.net) < 0.01 ? "text-emerald-600" : row.net > 0 ? "text-amber-600" : "text-red-600"}`}>Liq. {formatCurrency(row.net)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <DataTable
            columns={[
              { key: "data", header: "Data", render: (row) => new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") },
              { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
              { key: "operador", header: "Operador", render: (row) => nameOf(row.profiles ?? null) ?? "-" },
              { key: "guiche", header: "Guiche", render: (row) => {
                const booth = boothOf(row.booths ?? null);
                return booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
              } },
              { key: "base", header: "CEIA base", render: (row) => formatCurrency(Number(row.ceia_base || 0)) },
              { key: "lancado", header: "Lancado", render: (row) => formatCurrency(Number(row.ceia_total_lancado || 0)) },
              { key: "diferenca", header: "Faltante / excedente", render: (row) => {
                const status = getCeiaDifferenceStatus(Number(row.ceia_faltante || 0));
                return <span className={`font-semibold ${status.textClass}`}>{formatCurrency(Number(row.ceia_faltante || 0))}</span>;
              } },
              { key: "status_ceia", header: "Conferencia", render: (row) => {
                const status = getCeiaDifferenceStatus(Number(row.ceia_faltante || 0));
                return <Badge variant={status.variant}>{status.label}</Badge>;
              } },
              { key: "cash_net", header: "Cash net", render: (row) => <span className={`font-semibold ${Number(row.cash_net || 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(Number(row.cash_net || 0))}</span> },
              { key: "turno", header: "Turno", render: (row) => <Badge variant={row.status === "closed" ? "success" : "warning"}>{row.status === "closed" ? "Fechado" : "Aberto"}</Badge> },
            ]}
            rows={filteredDailyCashClosingRows}
            keyExtractor={(row) => row.id}
            emptyMessage="Nenhum fechamento CEIA encontrado para os filtros aplicados."
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={selectedBoothId === "all" ? "Resumo por guiche" : `Guiche · ${boothDetailLabel}`}
          subtitle="Consolidacao de vendas, caixa e conferencia por guiche."
          className="mb-4"
        />

        {visibleFinanceByBooth.length === 0 ? (
          <p className="text-sm text-muted">Nenhum guiche com movimentacao no periodo informado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleFinanceByBooth.map((row) => {
              const boothStatus = getDifferenceStatus(Number(row.difference || 0));

              return (
                <div key={row.boothId} className="rounded-xl border border-border/70 bg-[hsl(var(--card-elevated))] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{row.boothLabel}</h3>
                      <p className="text-xs text-muted">{row.operatorLabel}</p>
                    </div>
                    <Badge variant={boothStatus.variant}>{boothStatus.label}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-muted">Vendas</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(row.grossSales)}</p>
                      <p className="text-[10px] text-muted">{row.txCount} un.</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Dinheiro</p>
                      <p className="text-sm font-semibold text-emerald-400">{formatCurrency(row.cashSales)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Caixa est.</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(row.saldo)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
                    <span className="text-muted">Dif. {formatCurrency(Number(row.difference || 0))}</span>
                    <span className="text-muted">Esp. {formatCurrency(row.expected)} · Dec. {formatCurrency(row.declared)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
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
          title="Tabela consolidada do periodo"
          subtitle={selectedBoothId === "all" ? "Transacoes, movimentos de caixa e fechamentos reunidos." : `Fluxo consolidado de ${boothDetailLabel}.`}
          className="mb-4"
        />

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {paymentBreakdown.map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">{item.label}</p>
                <p className="text-xs text-muted">{formatPercent(item.percent)}</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
              <div className="mt-1 h-1 rounded-full bg-muted">
                <div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(Math.max(item.percent, 0), 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <DataTable
            columns={[
              {
                key: "data",
                header: "Data / hora",
                render: (row) => new Date(row.createdAt).toLocaleString("pt-BR"),
              },
              {
                key: "tipo",
                header: "Tipo",
                render: (row) => <Badge variant={row.statusVariant}>{row.recordType}</Badge>,
              },
              {
                key: "guiche",
                header: "Guiche / operador",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-foreground">{row.boothLabel}</p>
                    <p className="text-xs text-muted">{row.operatorName}</p>
                  </div>
                ),
              },
              {
                key: "detalhe",
                header: "Detalhamento",
                render: (row) => (
                  <div>
                    <p className="font-medium text-foreground">{row.detail}</p>
                    <p className="text-xs text-muted">{row.note}</p>
                  </div>
                ),
              },
              {
                key: "valor",
                header: "Valor",
                render: (row) => <span className="font-semibold text-foreground">{formatCurrency(row.amountValue)}</span>,
              },
              {
                key: "caixa",
                header: "Impacto no caixa",
                render: (row) => (
                  <div>
                    <p className={`font-semibold ${row.cashImpactValue === 0 ? "text-foreground" : row.cashImpactValue > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {formatCurrency(row.cashImpactValue)}
                    </p>
                    <p className="text-xs text-muted">{row.statusLabel}</p>
                  </div>
                ),
              },
            ]}
            rows={consolidatedFinanceRows}
            emptyMessage="Nenhum registro financeiro consolidado no periodo informado."
          />
        </div>
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
