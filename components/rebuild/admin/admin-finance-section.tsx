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

function getCeiaDifferenceStatus(diff: number) {
  if (Math.abs(diff) < 0.01) {
    return { key: "conferido" as const, label: "Conferido", variant: "success" as const, textClass: "text-emerald-600" };
  }
  if (diff > 0) {
    return { key: "faltando" as const, label: "Faltando", variant: "warning" as const, textClass: "text-amber-600" };
  }
  return { key: "excedido" as const, label: "Excedido", variant: "danger" as const, textClass: "text-red-600" };
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
  const [conferenceFilter, setConferenceFilter] = useState<"all" | "conferido" | "faltando" | "excedido">("all");

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
    () => Array.from(new Set(dailyCashClosingRows.map((row) => nameOf(row.profiles ?? null)).filter((v): v is string => Boolean(v && v !== "-")))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dailyCashClosingRows],
  );

  const filteredRows = useMemo(
    () => dailyCashClosingRows.filter((row) => {
      const companyMatch = selectedCompany === "all" || row.company === selectedCompany;
      const operatorName = nameOf(row.profiles ?? null) ?? "-";
      const operatorMatch = selectedOperator === "all" || operatorName === selectedOperator;
      const conferenceMatch = conferenceFilter === "all" || getCeiaDifferenceStatus(Number(row.ceia_faltante || 0)).key === conferenceFilter;
      return companyMatch && operatorMatch && conferenceMatch;
    }),
    [conferenceFilter, dailyCashClosingRows, selectedCompany, selectedOperator],
  );

  const summary = useMemo(
    () => filteredRows.reduce(
      (acc, row) => {
        acc.base += Number(row.ceia_base || 0);
        acc.lancado += Number(row.ceia_total_lancado || 0);
        acc.diferenca += Number(row.ceia_faltante || 0);
        if (Math.abs(Number(row.ceia_faltante || 0)) < 0.01) acc.conferidos += 1;
        else acc.comDiferenca += 1;
        return acc;
      },
      { base: 0, lancado: 0, diferenca: 0, conferidos: 0, comDiferenca: 0 },
    ),
    [filteredRows],
  );

  const percentConferidos = filteredRows.length > 0
    ? ((summary.conferidos / filteredRows.length) * 100).toFixed(1)
    : "0.0";

  function handleViewAll() {
    setSelectedCompany("all");
    setSelectedOperator("all");
    setConferenceFilter("all");
  }

  function handleExport() {
    const rows = filteredRows.map((row) => ({
      data: new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR"),
      empresa: row.company,
      operador: nameOf(row.profiles ?? null) ?? "-",
      base_ceia: Number(row.ceia_base || 0),
      total_lancado: Number(row.ceia_total_lancado || 0),
      faltante: Number(row.ceia_faltante || 0),
      status: getCeiaDifferenceStatus(Number(row.ceia_faltante || 0)).label,
      pix: Number(row.ceia_pix || 0),
      debito: Number(row.ceia_debito || 0),
      credito: Number(row.ceia_credito || 0),
      link_estadual: Number(row.ceia_link_estadual || 0),
      link_interestadual: Number(row.ceia_link_interestadual || 0),
      dinheiro: Number(row.ceia_dinheiro || 0),
      cash_net: Number(row.cash_net || 0),
      total_vendido: Number(row.total_sold || 0),
      observacao: row.notes ?? "",
    }));

    exportToCSV("relatorio-ceia", rows, [
      { key: "data", label: "Data" },
      { key: "empresa", label: "Empresa" },
      { key: "operador", label: "Operador" },
      { key: "base_ceia", label: "Base CEIA" },
      { key: "total_lancado", label: "Total lancado" },
      { key: "faltante", label: "Faltante" },
      { key: "status", label: "Status" },
      { key: "pix", label: "PIX" },
      { key: "debito", label: "Debito" },
      { key: "credito", label: "Credito" },
      { key: "link_estadual", label: "Link estadual" },
      { key: "link_interestadual", label: "Link interestadual" },
      { key: "dinheiro", label: "Dinheiro" },
      { key: "cash_net", label: "Cash net" },
      { key: "total_vendido", label: "Total vendido" },
      { key: "observacao", label: "Observacao" },
    ]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financeiro CEIA"
        subtitle="Painel consolidado de fechamentos por resumo CEIA."
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
              {operatorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Status</label>
            <select value={conferenceFilter} onChange={(e) => setConferenceFilter(e.target.value as typeof conferenceFilter)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos</option>
              <option value="conferido">Conferido</option>
              <option value="faltando">Faltando</option>
              <option value="excedido">Excedido</option>
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
          <Button variant="ghost" type="button" onClick={() => void onClearFilters()}>Limpar</Button>
        </form>

        <div className="mt-4">
          <Badge variant="secondary">{periodLabel}</Badge>
        </div>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CEIA base total"
          value={formatCurrency(summary.base)}
          icon={<Wallet className="h-5 w-5" />}
          delta={`${filteredRows.length} fechamento(s)`}
          deltaType="neutral"
        />
        <StatCard
          label="Total lancado"
          value={formatCurrency(summary.lancado)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta={summary.lancado >= summary.base ? "Lancamento completo ou acima" : "Existem diferencas"}
          deltaType={summary.lancado >= summary.base ? "positive" : "neutral"}
        />
        <StatCard
          label="Diferenca acumulada"
          value={formatCurrency(summary.diferenca)}
          icon={<Wallet className="h-5 w-5" />}
          delta={Math.abs(summary.diferenca) < 0.01 ? "Periodo conferido" : summary.diferenca > 0 ? "Faltando no periodo" : "Excedido no periodo"}
          deltaType={Math.abs(summary.diferenca) < 0.01 ? "positive" : "neutral"}
        />
        <StatCard
          label="% conferidos"
          value={`${percentConferidos}%`}
          icon={<Eye className="h-5 w-5" />}
          delta={`${summary.conferidos} ok · ${summary.comDiferenca} com diferenca`}
          deltaType={summary.comDiferenca === 0 ? "positive" : "neutral"}
        />
      </div>

      {/* Tabela */}
      <Card>
        <SectionHeader
          title="Fechamentos CEIA"
          subtitle="Detalhamento por data, empresa e operador."
          className="mb-4"
        />

        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") },
            { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
            { key: "operador", header: "Operador", render: (row) => nameOf(row.profiles ?? null) ?? "-" },
            { key: "base", header: "Base", render: (row) => formatCurrency(Number(row.ceia_base || 0)) },
            { key: "lancado", header: "Lancado", render: (row) => formatCurrency(Number(row.ceia_total_lancado || 0)) },
            { key: "faltante", header: "Faltante", render: (row) => {
              const status = getCeiaDifferenceStatus(Number(row.ceia_faltante || 0));
              return <span className={`font-semibold ${status.textClass}`}>{formatCurrency(Number(row.ceia_faltante || 0))}</span>;
            }},
            { key: "status", header: "Status", render: (row) => {
              const status = getCeiaDifferenceStatus(Number(row.ceia_faltante || 0));
              return <Badge variant={status.variant}>{status.label}</Badge>;
            }},
          ]}
          rows={filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhum fechamento CEIA encontrado."
        />
      </Card>
    </div>
  );
}
