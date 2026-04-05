"use client";

import { useMemo, useState } from "react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
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

  return (
    <div className="space-y-6">
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
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
          <Badge variant="secondary">{selectedBoothId === "all" ? "Relatorio geral" : `Guiche: ${boothLabel}`}</Badge>
          <Badge variant="secondary">{filteredTxs.length} lancamento(s)</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento bruto" value={formatCurrency(reportSummary.totalAmount)} />
        <StatCard label="Lancamentos" value={String(reportSummary.launches)} />
        <StatCard label="Ticket medio" value={formatCurrency(reportSummary.averageTicket)} />
        <StatCard label={selectedBoothId === "all" ? "Guiches no periodo" : "Digital do guiche"} value={selectedBoothId === "all" ? String(reportSummary.boothCount) : formatCurrency(reportSummary.digitalAmount)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total em dinheiro" value={formatCurrency(reportSummary.cashAmount)} />
        <StatCard label="Total digital" value={formatCurrency(reportSummary.digitalAmount)} />
      </div>

      <Card>
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

      <Card>
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

      <Card>
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
