"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Eye, RefreshCw, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { exportToCSV } from "@/lib/csv-export";
import { formatCurrency } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Input } from "@/components/rebuild/ui/input";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

const supabase = createClient();

type AuditRow = {
  id: string;
  office_id?: string | null;
  user_id?: string | null;
  date: string;
  company: string;
  total_informado?: number | string | null;
  total_cea?: number | string | null;
  total_lancado_sem_taxas?: number | string | null;
  taxa_estadual?: number | string | null;
  taxa_interestadual?: number | string | null;
  total_taxas?: number | string | null;
  total_geral_lancado?: number | string | null;
  ceia_pix?: number | string | null;
  ceia_debito?: number | string | null;
  ceia_credito?: number | string | null;
  ceia_dinheiro?: number | string | null;
  link_pagamento?: number | string | null;
  qtd_taxa_estadual?: number | string | null;
  qtd_taxa_interestadual?: number | string | null;
  costs_amount?: number | string | null;
  sangria_amount?: number | string | null;
  total_lancado?: number | string | null;
  ceia_faltante?: number | string | null;
  diferenca?: number | string | null;
  diferenca_cea?: number | string | null;
  cash_net?: number | string | null;
  status?: string | null;
  status_conferencia?: string | null;
  notes?: string | null;
  created_at: string;
  operator_name?: string | null;
  booth_name?: string | null;
  booth_code?: string | null;
};

const toNum = (value: unknown) => Number(value ?? 0);

function formatPeriodDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getConferenceStatus(row: AuditRow) {
  const diff = toNum(row.diferenca_cea ?? row.ceia_faltante ?? row.diferenca);
  const normalized = String(row.status_conferencia ?? "").trim().toUpperCase();

  if (normalized === "CONFERIDO" || Math.abs(diff) < 0.01) {
    return { label: "CONFERIDO", variant: "success" as const, textClass: "text-emerald-400" };
  }
  if (normalized === "FALTANDO" || diff > 0) {
    return { label: "FALTANDO", variant: "warning" as const, textClass: "text-amber-300" };
  }
  return { label: "EXCEDIDO", variant: "danger" as const, textClass: "text-rose-400" };
}

export function AdminCashClosingConsolidado() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [selectedBooth, setSelectedBooth] = useState("all");
  const [conferenceFilter, setConferenceFilter] = useState<"all" | "CONFERIDO" | "FALTANDO" | "EXCEDIDO">("all");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  async function loadRows(nextDateFrom = dateFrom, nextDateTo = dateTo) {
    setLoading(true);
    setErrorMessage(null);

    let query = supabase
      .from("v_admin_cash_audit")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (nextDateFrom) {
      query = query.gte("date", nextDateFrom);
    }
    if (nextDateTo) {
      query = query.lte("date", nextDateTo);
    }

    const { data, error } = await query;

    if (error) {
      setRows([]);
      setErrorMessage(error.message);
    } else {
      setRows((data ?? []) as AuditRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRows();
  }

  function handleClear() {
    setDateFrom("");
    setDateTo("");
    setSelectedCompany("all");
    setSelectedOperator("all");
    setSelectedBooth("all");
    setConferenceFilter("all");
    setSelectedRowId(null);
    void loadRows("", "");
  }

  const companyOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.company).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows],
  );

  const operatorOptions = useMemo(
    () => Array.from(new Map(rows.filter((row) => row.user_id).map((row) => [row.user_id ?? "", row.operator_name ?? "-"])).entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [rows],
  );

  const boothOptions = useMemo(
    () => Array.from(new Map(rows.filter((row) => row.office_id).map((row) => [row.office_id ?? "", row.booth_name ?? row.booth_code ?? "Guiche"])).entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [rows],
  );

  const filteredRows = useMemo(
    () => rows.filter((row) => {
      const companyMatch = selectedCompany === "all" || row.company === selectedCompany;
      const operatorMatch = selectedOperator === "all" || row.user_id === selectedOperator;
      const boothMatch = selectedBooth === "all" || row.office_id === selectedBooth;
      const conferenceMatch = conferenceFilter === "all" || getConferenceStatus(row).label === conferenceFilter;
      return companyMatch && operatorMatch && boothMatch && conferenceMatch;
    }),
    [conferenceFilter, rows, selectedBooth, selectedCompany, selectedOperator],
  );

  const summary = useMemo(
    () => filteredRows.reduce(
      (acc, row) => {
        acc.totalCea += toNum(row.total_cea ?? row.total_informado);
        acc.totalLancado += toNum(row.total_geral_lancado ?? row.total_lancado);
        acc.totalTaxas += toNum(row.total_taxas ?? (toNum(row.taxa_estadual) + toNum(row.taxa_interestadual)));
        acc.totalAbatimentos += toNum(row.costs_amount) + toNum(row.sangria_amount);
        acc.diferenca += toNum(row.diferenca_cea ?? row.ceia_faltante ?? row.diferenca);
        acc.cashNet += toNum(row.cash_net);
        return acc;
      },
      { totalCea: 0, totalLancado: 0, totalTaxas: 0, totalAbatimentos: 0, diferenca: 0, cashNet: 0 },
    ),
    [filteredRows],
  );

  const periodLabel = dateFrom || dateTo
    ? `Periodo: ${formatPeriodDate(dateFrom) ?? "inicio"} ate ${formatPeriodDate(dateTo) ?? "hoje"}`
    : "Sem filtro de data aplicado.";

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedRowId) ?? null,
    [filteredRows, selectedRowId],
  );

  function handleExport() {
    const exportRows = filteredRows.map((row) => ({
      data: new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR"),
      operador: row.operator_name ?? "-",
      guiche: row.booth_name ?? row.booth_code ?? "-",
      empresa: row.company,
      total_vendido: toNum(row.total_cea ?? row.total_informado),
      total_lancado_sem_taxas: toNum(row.total_lancado_sem_taxas ?? row.total_lancado),
      taxa_estadual: toNum(row.taxa_estadual),
      taxa_interestadual: toNum(row.taxa_interestadual),
      total_taxas: toNum(row.total_taxas),
      total_geral_lancado: toNum(row.total_geral_lancado ?? row.total_lancado),
      abatimentos: toNum(row.costs_amount) + toNum(row.sangria_amount),
      resultado_liquido: toNum(row.total_geral_lancado ?? row.total_lancado) - (toNum(row.costs_amount) + toNum(row.sangria_amount)),
      diferenca: toNum(row.diferenca_cea ?? row.ceia_faltante ?? row.diferenca),
      status: getConferenceStatus(row).label,
    }));

    exportToCSV("fechamento-caixa-consolidado", exportRows, [
      { key: "data", label: "Data" },
      { key: "operador", label: "Operador" },
      { key: "guiche", label: "Guiche" },
      { key: "empresa", label: "Empresa" },
      { key: "total_vendido", label: "Total vendido" },
      { key: "total_lancado_sem_taxas", label: "Lancado sem taxas" },
      { key: "taxa_estadual", label: "Taxa estadual" },
      { key: "taxa_interestadual", label: "Taxa interestadual" },
      { key: "total_taxas", label: "Total taxas" },
      { key: "total_geral_lancado", label: "Total geral lancado" },
      { key: "abatimentos", label: "Abatimentos" },
      { key: "resultado_liquido", label: "Resultado liquido" },
      { key: "diferenca", label: "Diferenca" },
      { key: "status", label: "Status" },
    ]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Fechamento de Caixa"
        subtitle="Consolidado do resumo Central Viagens por guiche, operador, empresa e conferencia."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleSubmit}>
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Empresa</label>
            <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todas as empresas</option>
              {companyOptions.map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Operador</label>
            <select value={selectedOperator} onChange={(event) => setSelectedOperator(event.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos os operadores</option>
              {operatorOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Guiche</label>
            <select value={selectedBooth} onChange={(event) => setSelectedBooth(event.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos os guiches</option>
              {boothOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm text-foreground">Status</label>
            <select value={conferenceFilter} onChange={(event) => setConferenceFilter(event.target.value as typeof conferenceFilter)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="all">Todos</option>
              <option value="CONFERIDO">CONFERIDO</option>
              <option value="FALTANDO">FALTANDO</option>
              <option value="EXCEDIDO">EXCEDIDO</option>
            </select>
          </div>

          <Button type="submit">Aplicar</Button>
          <Button type="button" variant="ghost" onClick={handleClear}>Limpar</Button>
          <Button type="button" variant="secondary" onClick={handleExport} disabled={!filteredRows.length}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button type="button" variant="ghost" onClick={() => void loadRows()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
          {errorMessage ? <Badge variant="danger">Erro ao carregar: {errorMessage}</Badge> : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total vendido" value={formatCurrency(summary.totalCea)} icon={<Wallet className="h-5 w-5" />} delta={`${filteredRows.length} registro(s)`} deltaType="neutral" />
        <StatCard label="Total lancado" value={formatCurrency(summary.totalLancado)} icon={<Wallet className="h-5 w-5" />} delta="Pagamentos + taxas" deltaType="neutral" />
        <StatCard label="Total taxas" value={formatCurrency(summary.totalTaxas)} icon={<Wallet className="h-5 w-5" />} delta="Estadual + interestadual" deltaType="neutral" />
        <StatCard label="Abatimentos" value={formatCurrency(summary.totalAbatimentos)} icon={<Wallet className="h-5 w-5" />} delta="Custos + sangria" deltaType="neutral" />
        <StatCard label="Diferenca acumulada" value={formatCurrency(summary.diferenca)} icon={<Wallet className="h-5 w-5" />} delta={`Cash net: ${formatCurrency(summary.cashNet)}`} deltaType={Math.abs(summary.diferenca) < 0.01 ? "positive" : summary.diferenca > 0 ? "neutral" : "negative"} />
      </div>

      <Card>
        <DataTable
          loading={loading}
          rows={filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhum fechamento encontrado para os filtros atuais."
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") },
            { key: "guiche", header: "Guiche", render: (row) => row.booth_name ?? row.booth_code ?? "-" },
            { key: "operador", header: "Operador", render: (row) => row.operator_name ?? "-" },
            { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
            { key: "vendido", header: "Total vendido", render: (row) => formatCurrency(toNum(row.total_cea ?? row.total_informado)) },
            { key: "lancado", header: "Total lancado", render: (row) => formatCurrency(toNum(row.total_geral_lancado ?? row.total_lancado)) },
            { key: "diferenca", header: "Diferenca", render: (row) => {
              const status = getConferenceStatus(row);
              const diff = toNum(row.diferenca_cea ?? row.ceia_faltante ?? row.diferenca);
              return <span className={`font-semibold ${status.textClass}`}>{formatCurrency(diff)}</span>;
            } },
            { key: "status", header: "Status", render: (row) => {
              const status = getConferenceStatus(row);
              return <Badge variant={status.variant}>{status.label}</Badge>;
            } },
            { key: "acoes", header: "", render: (row) => (
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedRowId(row.id === selectedRowId ? null : row.id)}>
                <Eye className="mr-2 h-4 w-4" />
                {row.id === selectedRowId ? "Ocultar" : "Detalhes"}
              </Button>
            ) },
          ]}
        />

        {selectedRow ? (
          <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedRow.company}</p>
                <p className="text-xs text-muted">
                  {selectedRow.operator_name ?? "-"} · {selectedRow.booth_name ?? selectedRow.booth_code ?? "-"} · {new Date(`${selectedRow.date}T12:00:00`).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Badge variant={getConferenceStatus(selectedRow).variant}>{getConferenceStatus(selectedRow).label}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Total vendido</p><p className="font-semibold text-amber-300">{formatCurrency(toNum(selectedRow.total_cea ?? selectedRow.total_informado))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Lancado sem taxas</p><p className="font-semibold text-foreground">{formatCurrency(toNum(selectedRow.total_lancado_sem_taxas ?? selectedRow.total_lancado))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa estadual</p><p className="font-semibold text-amber-300">{formatCurrency(toNum(selectedRow.taxa_estadual))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa interestadual</p><p className="font-semibold text-amber-200">{formatCurrency(toNum(selectedRow.taxa_interestadual))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Abatimentos</p><p className="font-semibold text-rose-300">{formatCurrency(toNum(selectedRow.costs_amount) + toNum(selectedRow.sangria_amount))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Resultado liquido</p><p className="font-semibold text-emerald-400">{formatCurrency(toNum(selectedRow.total_geral_lancado ?? selectedRow.total_lancado) - (toNum(selectedRow.costs_amount) + toNum(selectedRow.sangria_amount)))}</p></div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">PIX</p><p className="font-semibold text-cyan-400">{formatCurrency(toNum(selectedRow.ceia_pix))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Debito</p><p className="font-semibold text-blue-400">{formatCurrency(toNum(selectedRow.ceia_debito))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Credito</p><p className="font-semibold text-violet-400">{formatCurrency(toNum(selectedRow.ceia_credito))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro</p><p className="font-semibold text-emerald-400">{formatCurrency(toNum(selectedRow.ceia_dinheiro))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Link pagamento</p><p className="font-semibold text-sky-400">{formatCurrency(toNum(selectedRow.link_pagamento))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Qtd taxa est.</p><p className="font-semibold text-foreground">{toNum(selectedRow.qtd_taxa_estadual)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Qtd taxa inter.</p><p className="font-semibold text-foreground">{toNum(selectedRow.qtd_taxa_interestadual)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Cash net</p><p className={`font-semibold ${toNum(selectedRow.cash_net) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(toNum(selectedRow.cash_net))}</p></div>
            </div>

            {selectedRow.notes ? <p className="mt-3 text-sm text-muted">Obs: {selectedRow.notes}</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}