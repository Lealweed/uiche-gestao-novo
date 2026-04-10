"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { exportToCSV } from "@/lib/csv-export";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { DataTable } from "@/components/rebuild/ui/table";

type AuditLogRow = {
  id: string;
  action: string;
  entity: string | null;
  details: Record<string, unknown>;
  created_at: string;
  created_by?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type ReportTxRow = {
  id: string;
  amount: number;
  sold_at?: string;
  payment_method?: string;
  booth_id?: string;
  profiles?: { full_name: string } | { full_name: string }[] | null;
  booths?: { name: string; code: string } | { name: string; code: string }[] | null;
  companies?: { name: string } | { name: string }[] | null;
  transaction_categories?: { name: string } | { name: string }[] | null;
  transaction_subcategories?: { name: string } | { name: string }[] | null;
};

type BoothSummaryRow = {
  boothId: string;
  boothLabel: string;
  launches: number;
  totalAmount: number;
  cashAmount: number;
  digitalAmount: number;
  averageTicket: number;
};

type AdminReportsSectionProps = {
  auditLogs: AuditLogRow[];
  reportTxs: ReportTxRow[];
  dateFrom: string;
  dateTo: string;
};

function formatPeriodDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getObjectName(value: { name: string } | { name: string }[] | null | undefined) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

function paymentLabel(method?: string) {
  const normalized = (method ?? "").toLowerCase();
  if (normalized === "cash") return { label: "Dinheiro", variant: "success" as const };
  if (normalized === "pix") return { label: "PIX", variant: "info" as const };
  if (normalized === "credit") return { label: "Credito", variant: "warning" as const };
  if (normalized === "debit") return { label: "Debito", variant: "secondary" as const };
  return { label: method ?? "-", variant: "secondary" as const };
}

export function AdminReportsSection({ auditLogs, reportTxs, dateFrom, dateTo }: AdminReportsSectionProps) {
  const [selectedBoothId, setSelectedBoothId] = useState("all");

  const periodLabel = dateFrom || dateTo
    ? `Periodo: ${formatPeriodDate(dateFrom) ?? "inicio"} ate ${formatPeriodDate(dateTo) ?? "hoje"}`
    : "Periodo carregado completo (sem filtro adicional).";

  const boothOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const tx of reportTxs) {
      const booth = boothOf(tx.booths ?? null);
      const boothId = tx.booth_id ?? "sem-guiche";
      const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
      if (!map.has(boothId)) map.set(boothId, boothLabel);
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [reportTxs]);

  const filteredTxs = useMemo(
    () => selectedBoothId === "all" ? reportTxs : reportTxs.filter((tx) => (tx.booth_id ?? "sem-guiche") === selectedBoothId),
    [reportTxs, selectedBoothId]
  );

  const reportSummary = useMemo(() => {
    const totalAmount = filteredTxs.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const cashAmount = filteredTxs
      .filter((tx) => (tx.payment_method ?? "").toLowerCase() === "cash")
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const digitalAmount = totalAmount - cashAmount;
    const launches = filteredTxs.length;
    const averageTicket = launches ? totalAmount / launches : 0;
    const boothCount = new Set(filteredTxs.map((tx) => tx.booth_id ?? "sem-guiche")).size;

    return { totalAmount, cashAmount, digitalAmount, launches, averageTicket, boothCount };
  }, [filteredTxs]);

  const reportByBooth = useMemo<BoothSummaryRow[]>(() => {
    const map = new Map<string, BoothSummaryRow>();

    for (const tx of filteredTxs) {
      const booth = boothOf(tx.booths ?? null);
      const boothId = tx.booth_id ?? "sem-guiche";
      const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";
      const amount = Number(tx.amount || 0);
      const isCash = (tx.payment_method ?? "").toLowerCase() === "cash";

      if (!map.has(boothId)) {
        map.set(boothId, {
          boothId,
          boothLabel,
          launches: 0,
          totalAmount: 0,
          cashAmount: 0,
          digitalAmount: 0,
          averageTicket: 0,
        });
      }

      const row = map.get(boothId)!;
      row.launches += 1;
      row.totalAmount += amount;
      row.cashAmount += isCash ? amount : 0;
      row.digitalAmount += isCash ? 0 : amount;
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        averageTicket: row.launches ? row.totalAmount / row.launches : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTxs]);

  const boothLabel = selectedBoothId === "all"
    ? "Todos os guiches"
    : boothOptions.find((option) => option.value === selectedBoothId)?.label ?? "Guiche";

  const reportGeneratedAt = new Date().toLocaleString("pt-BR");

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

  function handleExportCSV() {
    const rows = filteredTxs.map((tx) => {
      const booth = boothOf(tx.booths ?? null);
      return {
        data: tx.sold_at ? new Date(tx.sold_at).toLocaleString("pt-BR") : "-",
        guiche: booth ? `${booth.code} - ${booth.name}` : "-",
        operador: nameOf(tx.profiles ?? null) ?? "-",
        empresa: getObjectName(tx.companies) ?? "-",
        categoria: getObjectName(tx.transaction_categories) ?? "-",
        pagamento: paymentLabel(tx.payment_method).label,
        valor: Number(tx.amount || 0),
      };
    });

    exportToCSV(
      `relatorio-gerencial-${selectedBoothId === "all" ? "geral" : selectedBoothId}`,
      rows,
      [
        { key: "data", label: "Data" },
        { key: "guiche", label: "Guiche" },
        { key: "operador", label: "Operador" },
        { key: "empresa", label: "Empresa" },
        { key: "categoria", label: "Categoria" },
        { key: "pagamento", label: "Pagamento" },
        { key: "valor", label: "Valor (R$)" },
      ]
    );
  }

  return (
    <div className="report-print-scope space-y-6">
      {/* Print-only header */}
      <Card className="hidden print:block print:border-slate-300 print:bg-white print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Central Viagens</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">Relatorio Gerencial</h2>
            <p className="mt-2 text-sm text-muted">Emitido em {reportGeneratedAt}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Escopo</p>
            <p className="font-semibold text-foreground">{boothLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Periodo</p>
            <p className="font-semibold text-foreground">{periodLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Lancamentos</p>
            <p className="font-semibold text-foreground">{filteredTxs.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Faturamento</p>
            <p className="font-semibold text-foreground">{formatCurrency(reportSummary.totalAmount)}</p>
          </div>
        </div>
      </Card>

      <div className="print:hidden">
      <SectionHeader
        title="Relatorios Gerenciais"
        subtitle="Consulte o consolidado geral e detalhe os lancamentos por guiche com foco operacional e gerencial."
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label className="mb-1 block text-sm text-foreground">Visao do relatorio</label>
            <select
              value={selectedBoothId}
              onChange={(event) => setSelectedBoothId(event.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Geral consolidado</option>
              {boothOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={handleExportCSV} disabled={filteredTxs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="ghost" onClick={handlePrintReport} disabled={filteredTxs.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir relatorio
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento bruto" value={formatCurrency(reportSummary.totalAmount)} delta={`${reportSummary.launches} lancamento(s)`} />
        <StatCard label="Ticket medio" value={formatCurrency(reportSummary.averageTicket)} />
        <StatCard label="Dinheiro" value={formatCurrency(reportSummary.cashAmount)} />
        <StatCard label="Digital" value={formatCurrency(reportSummary.digitalAmount)} />
      </div>
      </div>

      <Card className="print:border-slate-300 print:bg-white print:shadow-none">
        <SectionHeader
          title="Resumo Consolidado por Guiche"
          subtitle={selectedBoothId === "all" ? "Compare faturamento, ticket medio e mix financeiro entre os guiches." : `Resumo filtrado para ${boothLabel}.`}
          className="mb-4"
        />
        <DataTable
          columns={[
            { key: "guiche", header: "Guiche", render: (row) => <span className="font-semibold">{row.boothLabel}</span> },
            { key: "lancamentos", header: "Lancamentos", render: (row) => row.launches },
            { key: "faturamento", header: "Faturamento", render: (row) => formatCurrency(row.totalAmount) },
            { key: "dinheiro", header: "Dinheiro", render: (row) => formatCurrency(row.cashAmount) },
            { key: "digital", header: "Digital", render: (row) => formatCurrency(row.digitalAmount) },
            { key: "ticket", header: "Ticket medio", render: (row) => formatCurrency(row.averageTicket) },
          ]}
          rows={reportByBooth}
          emptyMessage="Nenhum dado de relatorio no periodo informado."
        />
      </Card>

      <Card className="print:border-slate-300 print:bg-white print:shadow-none">
        <SectionHeader
          title="Lancamentos do Relatorio"
          subtitle={`${filteredTxs.length} registro(s) exibidos em ${boothLabel}.`}
          className="mb-4"
        />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => row.sold_at ? new Date(row.sold_at).toLocaleString("pt-BR") : "-" },
            {
              key: "guiche",
              header: "Guiche",
              render: (row) => {
                const booth = boothOf(row.booths ?? null);
                return booth ? `${booth.code} - ${booth.name}` : "-";
              },
            },
            { key: "operador", header: "Operador", render: (row) => nameOf(row.profiles ?? null) ?? "-" },
            { key: "empresa", header: "Empresa", render: (row) => getObjectName(row.companies) ?? "-" },
            { key: "categoria", header: "Categoria", render: (row) => getObjectName(row.transaction_categories) ?? "-" },
            {
              key: "pagamento",
              header: "Pagamento",
              render: (row) => {
                const payment = paymentLabel(row.payment_method);
                return <Badge variant={payment.variant}>{payment.label}</Badge>;
              },
            },
            { key: "valor", header: "Valor", render: (row) => <span className="font-semibold">{formatCurrency(Number(row.amount || 0))}</span> },
          ]}
          rows={filteredTxs}
          emptyMessage="Nenhum lancamento encontrado para o guiche selecionado."
        />
      </Card>

      <Card className="print:hidden">
        <SectionHeader title="Log de Auditoria" subtitle="Rastreabilidade administrativa complementar ao relatorio financeiro." className="mb-4" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
            { key: "usuario", header: "Usuario", render: (row) => nameOf(row.profiles) ?? "-" },
            { key: "acao", header: "Acao", render: (row) => <Badge variant="info">{row.action}</Badge> },
            { key: "entidade", header: "Entidade", render: (row) => row.entity ?? "-" },
          ]}
          rows={auditLogs}
          emptyMessage="Nenhum log de auditoria."
        />
      </Card>
    </div>
  );
}
