"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Eye, TrendingUp, Wallet } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { exportToCSV } from "@/lib/csv-export";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Input } from "@/components/rebuild/ui/input";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

/* ====== TIPOS ====== */
type DailyCashClosingRow = {
  id: string;
  office_id?: string | null;
  user_id?: string | null;
  date: string;
  company: string;
  total_sold?: number | string | null;
  total_informado?: number | string | null;
  amount_pix?: number | string | null;
  amount_card?: number | string | null;
  amount_cash?: number | string | null;
  ceia_base?: number | string | null;
  ceia_pix?: number | string | null;
  ceia_debito?: number | string | null;
  ceia_credito?: number | string | null;
  ceia_link_estadual?: number | string | null;
  ceia_link_interestadual?: number | string | null;
  ceia_dinheiro?: number | string | null;
  ceia_total_lancado?: number | string | null;
  total_lancado?: number | string | null;
  ceia_faltante?: number | string | null;
  diferenca?: number | string | null;
  qtd_taxa_estadual?: number | string | null;
  qtd_taxa_interestadual?: number | string | null;
  link_pagamento?: number | string | null;
  cash_net?: number | string | null;
  status?: "open" | "closed" | string | null;
  status_conferencia?: "CONFERIDO" | "FALTANDO" | "EXCEDIDO" | string | null;
  operator_name?: string | null;
  booth_name?: string | null;
  booth_code?: string | null;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type AdminFinanceSectionProps = {
  dateFrom: string;
  dateTo: string;
  dailyCashClosingRows: DailyCashClosingRow[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApplyFilters: () => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
};

/* ====== HELPERS ====== */
function formatPeriodDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const toNum = (v: any) => Number(v ?? 0);

function getTotalInformado(row: DailyCashClosingRow) {
  return toNum(row.total_informado ?? row.ceia_base ?? row.total_sold);
}

function getTotalLancado(row: DailyCashClosingRow) {
  return toNum(row.total_lancado ?? row.ceia_total_lancado);
}

function getDiferenca(row: DailyCashClosingRow) {
  return toNum(row.diferenca ?? row.ceia_faltante);
}

function getConferenceStatus(row: DailyCashClosingRow) {
  const normalized = String(row.status_conferencia ?? "").trim().toUpperCase();

  if (normalized === "CONFERIDO") {
    return { key: "CONFERIDO" as const, label: "CONFERIDO", variant: "success" as const, textClass: "text-emerald-600" };
  }
  if (normalized === "FALTANDO") {
    return { key: "FALTANDO" as const, label: "FALTANDO", variant: "warning" as const, textClass: "text-amber-600" };
  }
  if (normalized === "EXCEDIDO") {
    return { key: "EXCEDIDO" as const, label: "EXCEDIDO", variant: "danger" as const, textClass: "text-red-600" };
  }

  const diff = getDiferenca(row);
  if (Math.abs(diff) < 0.01) {
    return { key: "CONFERIDO" as const, label: "CONFERIDO", variant: "success" as const, textClass: "text-emerald-600" };
  }
  if (diff > 0) {
    return { key: "FALTANDO" as const, label: "FALTANDO", variant: "warning" as const, textClass: "text-amber-600" };
  }
  return { key: "EXCEDIDO" as const, label: "EXCEDIDO", variant: "danger" as const, textClass: "text-red-600" };
}

/* ====== COMPONENTE ====== */
export function AdminFinanceSection({
  dateFrom,
  dateTo,
  dailyCashClosingRows,
  onDateFromChange,
  onDateToChange,
  onApplyFilters,
  onClearFilters,
}: AdminFinanceSectionProps) {
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [conferenceFilter, setConferenceFilter] = useState<"all" | "CONFERIDO" | "FALTANDO" | "EXCEDIDO">("all");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onApplyFilters();
  }

  const periodLabel = dateFrom || dateTo
    ? `Periodo: ${formatPeriodDate(dateFrom) ?? "inicio"} ate ${formatPeriodDate(dateTo) ?? "hoje"}`
    : "Sem filtro de data: exibindo todo o periodo carregado.";

  const companyOptions = useMemo(
    () => Array.from(new Set(dailyCashClosingRows.map((row) => row.company).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dailyCashClosingRows],
  );

  const operatorOptions = useMemo(
    () => Array.from(
      new Map(
        dailyCashClosingRows
          .filter((row) => Boolean(row.user_id))
          .map((row) => [row.user_id ?? "", row.operator_name ?? nameOf(row.profiles ?? null) ?? "-"])
      ).entries(),
    )
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [dailyCashClosingRows],
  );

  const filteredRows = useMemo(
    () => dailyCashClosingRows.filter((row) => {
      const companyMatch = selectedCompany === "all" || row.company === selectedCompany;
      const operatorMatch = selectedOperator === "all" || row.user_id === selectedOperator;
      const conferenceMatch = conferenceFilter === "all" || getConferenceStatus(row).key === conferenceFilter;
      return companyMatch && operatorMatch && conferenceMatch;
    }),
    [conferenceFilter, dailyCashClosingRows, selectedCompany, selectedOperator],
  );

  const summary = useMemo(
    () => filteredRows.reduce(
      (acc, row) => {
        acc.totalInformado += getTotalInformado(row);
        acc.totalLancado += getTotalLancado(row);
        acc.diferenca += getDiferenca(row);
        if (getConferenceStatus(row).key === "CONFERIDO") acc.conferidos += 1;
        return acc;
      },
      { totalInformado: 0, totalLancado: 0, diferenca: 0, conferidos: 0 },
    ),
    [filteredRows],
  );

  function handleViewAll() {
    setSelectedCompany("all");
    setSelectedOperator("all");
    setConferenceFilter("all");
  }

  async function handleClearAll() {
    handleViewAll();
    await onClearFilters();
  }

  function handleExport() {
    const rows = filteredRows.map((row) => ({
      data: new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR"),
      operador: row.operator_name ?? nameOf(row.profiles ?? null) ?? "-",
      empresa: row.company,
      total_informado: getTotalInformado(row),
      total_lancado: getTotalLancado(row),
      diferenca: getDiferenca(row),
      status_conferencia: getConferenceStatus(row).label,
      status: String(row.status ?? "-"),
      created_at: row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "-",
      observacao: row.notes ?? "",
    }));

    exportToCSV("relatorio-central-viagens", rows, [
      { key: "data", label: "Data" },
      { key: "operador", label: "Operador" },
      { key: "empresa", label: "Empresa" },
      { key: "total_informado", label: "Total informado" },
      { key: "total_lancado", label: "Total lancado" },
      { key: "diferenca", label: "Diferenca" },
      { key: "status_conferencia", label: "Status conferencia" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Criado em" },
      { key: "observacao", label: "Observacao" },
    ]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financeiro Central Viagens"
        subtitle="Painel consolidado de fechamentos."
      />

      {/* Filtros */}
      <Card>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Empresa</label>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todas as empresas</option>
              {companyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Operador</label>
            <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos os operadores</option>
              {operatorOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Status</label>
            <select value={conferenceFilter} onChange={(e) => setConferenceFilter(e.target.value as typeof conferenceFilter)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos</option>
              <option value="CONFERIDO">CONFERIDO</option>
              <option value="FALTANDO">FALTANDO</option>
              <option value="EXCEDIDO">EXCEDIDO</option>
            </select>
          </div>

          <Button type="submit">Aplicar</Button>
          <Button variant="ghost" type="button" onClick={handleViewAll}>
            <Eye className="mr-2 h-4 w-4" />
            Ver tudo
          </Button>
          <Button variant="secondary" type="button" onClick={handleExport} disabled={!filteredRows.length}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="ghost" type="button" onClick={() => void handleClearAll()}>Limpar</Button>
        </form>

        <div className="mt-4">
          <Badge variant="secondary">{periodLabel}</Badge>
        </div>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total informado"
          value={formatCurrency(summary.totalInformado)}
          icon={<Wallet className="h-5 w-5" />}
          delta={`${filteredRows.length} registro(s)`}
          deltaType="neutral"
        />
        <StatCard
          label="Total lancado"
          value={formatCurrency(summary.totalLancado)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta="Soma das linhas filtradas"
          deltaType="neutral"
        />
        <StatCard
          label="Diferenca"
          value={formatCurrency(summary.diferenca)}
          icon={<Wallet className="h-5 w-5" />}
          delta={Math.abs(summary.diferenca) < 0.01 ? "Periodo conferido" : summary.diferenca > 0 ? "Faltando no periodo" : "Excedido no periodo"}
          deltaType={Math.abs(summary.diferenca) < 0.01 ? "positive" : "neutral"}
        />
        <StatCard
          label="Conferidos"
          value={String(summary.conferidos)}
          icon={<Eye className="h-5 w-5" />}
          delta="Status CONFERIDO"
          deltaType={summary.conferidos > 0 ? "positive" : "neutral"}
        />
      </div>

      {/* Tabela */}
      <Card>
        <SectionHeader
          title="Fechamentos"
          subtitle="Detalhamento por data, empresa e operador."
          className="mb-4"
        />

        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") },
            { key: "operador", header: "Operador", render: (row) => row.operator_name ?? nameOf(row.profiles ?? null) ?? "-" },
            { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
            { key: "total_informado", header: "Total informado", render: (row) => formatCurrency(getTotalInformado(row)) },
            { key: "total_lancado", header: "Total lancado", render: (row) => formatCurrency(getTotalLancado(row)) },
            { key: "diferenca", header: "Diferenca", render: (row) => {
              const status = getConferenceStatus(row);
              return <span className={`font-semibold ${status.textClass}`}>{formatCurrency(getDiferenca(row))}</span>;
            }},
            { key: "status_conferencia", header: "Conferencia", render: (row) => {
              const status = getConferenceStatus(row);
              return <Badge variant={status.variant}>{status.label}</Badge>;
            }},
            { key: "status", header: "Status", render: (row) => String(row.status ?? "-") },
            { key: "created_at", header: "Criado em", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "-" },
          ]}
          rows={filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhum registro encontrado para os filtros atuais."
        />
      </Card>
    </div>
  );
}
