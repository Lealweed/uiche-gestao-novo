"use client";

import {
  AlertCircle,
  Banknote,
  BarChart3,
  CreditCard,
  DollarSign,
  Download,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { Input } from "@/components/rebuild/ui/input";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { SkeletonDashboard } from "@/components/rebuild/ui/skeleton";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { DataTable } from "@/components/rebuild/ui/table";
import { ADMIN_CHART_COLORS as CHART_COLORS, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";

type RepassesCompanyRow = {
  name: string;
  amount: number;
  central: number;
  repasse: number;
  payoutDays: number;
};

type ShiftRow = {
  shift_id: string;
  booth_name: string;
  operator_name: string;
  status: "open" | "closed";
  gross_amount: string;
  missing_card_receipts: number;
};

type AdjustmentRow = {
  id: string;
  transaction_id: string;
  reason: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  transactions: {
    amount: number;
    companies: { name: string } | { name: string }[] | null;
  } | null;
};

type PaymentMethodDatum = {
  name: string;
  value: number;
  color: string;
};

type DailyRevenueDatum = {
  date: string;
  valor: number;
};

type TopCompanyDatum = {
  name: string;
  faturamento: number;
  repasse: number;
};

type FinanceByBoothSummary = {
  boothId: string;
  boothLabel: string;
  grossSales: number;
  txCount: number;
  companyCount: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  cashSales: number;
  linkSales: number;
  costsAmount: number;
  sangriaResumo: number;
  totalAbatimentos: number;
  netResult: number;
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

type FinanceByBoothCompanyRow = {
  boothId: string;
  boothLabel: string;
  company: string;
  operatorName: string;
  totalVendidoExterno: number;
  totalLancado: number;
  totalAbatimentos: number;
  resultadoLiquido: number;
  taxaEstadual: number;
  taxaInterestadual: number;
  custos: number;
  sangria: number;
};

function formatPayoutDeadline(days: number | null | undefined) {
  const safeDays = typeof days === "number" && Number.isFinite(days) && days >= 0 ? Math.trunc(days) : 0;
  return `D+${safeDays}`;
}

type AdminDashboardSectionProps = {
  isLoading: boolean;
  isMounted: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  repassesComputed: {
    faturamento: number;
    central: number;
    repasse: number;
    viacoes: RepassesCompanyRow[];
  };
  reportTxCount: number;
  summary: {
    abertos: number;
    pendencias: number;
  };
  dailyRevenueData: DailyRevenueDatum[];
  paymentMethodData: PaymentMethodDatum[];
  topCompaniesData: TopCompanyDatum[];
  adjustmentsCount: number;
  cashSaldo: number;
  rows: ShiftRow[];
  adjustments: AdjustmentRow[];
  onExportCSV: () => void;
  onForceCloseShift: (shiftId: string) => void;
  onApproveAdjustment: (adjId: string, txId: string) => void;
  onRejectAdjustment: (adjId: string) => void;
  boardingTaxAudit: {
    qtd_estadual: number;
    valor_estadual: number;
    qtd_federal: number;
    valor_federal: number;
  };
  summaryClosingTotals: {
    totalAbatimentos: number;
    resultadoLiquido: number;
  };
  financeByBooth: FinanceByBoothSummary[];
  financeByBoothCompany: FinanceByBoothCompanyRow[];
};

export function AdminDashboardSection({
  isLoading,
  isMounted,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApplyFilters,
  onClearFilters,
  repassesComputed,
  reportTxCount,
  summary,
  dailyRevenueData,
  paymentMethodData,
  topCompaniesData,
  adjustmentsCount,
  cashSaldo,
  rows,
  adjustments,
  boardingTaxAudit,
  summaryClosingTotals,
  financeByBooth,
  financeByBoothCompany,
  onExportCSV,
  onForceCloseShift,
  onApproveAdjustment,
  onRejectAdjustment,
}: AdminDashboardSectionProps) {
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      <Card>
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onApplyFilters();
          }}
        >
          <Input type="date" label="Data inicial" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <Input type="date" label="Data final" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          <Button type="submit">Filtrar</Button>
          <Button variant="ghost" type="button" onClick={onClearFilters}>
            Limpar
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Faturamento Total"
          value={formatCurrency(repassesComputed.faturamento)}
          icon={<DollarSign className="h-5 w-5" />}
          delta={`${reportTxCount} lancamento(s)`}
          deltaType="positive"
        />
        <StatCard
          label="Receita Central"
          value={formatCurrency(repassesComputed.central)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta="Taxas retidas"
          deltaType="positive"
        />
        <StatCard
          label="Repasse Viacoes"
          value={formatCurrency(repassesComputed.repasse)}
          icon={<Wallet className="h-5 w-5" />}
          delta="Valor liquido"
        />
        <StatCard
          label="Turnos Ativos"
          value={String(summary.abertos)}
          icon={<Users className="h-5 w-5" />}
          delta={summary.pendencias > 0 ? `${summary.pendencias} pendencia(s)` : "Sem pendencias"}
          deltaType={summary.pendencias > 0 ? "negative" : "positive"}
        />
      </div>

      {/* Taxas de Embarque */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Taxa Estadual" value={formatCurrency(boardingTaxAudit.valor_estadual)} icon={<Banknote className="h-5 w-5" />} delta={`${boardingTaxAudit.qtd_estadual} emitida${boardingTaxAudit.qtd_estadual !== 1 ? "s" : ""}`} />
        <StatCard label="Taxa Federal" value={formatCurrency(boardingTaxAudit.valor_federal)} icon={<Banknote className="h-5 w-5" />} delta={`${boardingTaxAudit.qtd_federal} emitida${boardingTaxAudit.qtd_federal !== 1 ? "s" : ""}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Custos e Sangrias" value={formatCurrency(summaryClosingTotals.totalAbatimentos)} icon={<CreditCard className="h-5 w-5" />} delta="Abatimentos do resumo" />
        <StatCard label="Resultado Liquido Diario" value={formatCurrency(summaryClosingTotals.resultadoLiquido)} icon={<Wallet className="h-5 w-5" />} delta="Lancado menos abatimentos" />
      </div>

      {isMounted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-base font-semibold text-foreground">Faturamento por Dia</h3>
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Faturamento"]}
                  contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", color: "#f1f5f9" }}
                />
                <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="mb-4 text-base font-semibold text-foreground">Formas de Pagamento</h3>
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]}
                  contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", color: "#f1f5f9" }}
                />
                <Legend iconType="circle" formatter={(value) => <span style={{ color: "#f1f5f9", fontSize: "14px" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {isMounted && topCompaniesData.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Top 5 Viacoes</h3>
              <p className="text-xs text-muted">Por faturamento bruto</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onExportCSV}>
              <Download className="mr-1 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={topCompaniesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: CHART_COLORS.text }} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "faturamento" ? "Faturamento" : "Repasse"]}
                contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", color: "#f1f5f9" }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Legend />
              <Bar dataKey="faturamento" name="Faturamento" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              <Bar dataKey="repasse" name="Repasse" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Ajustes Pendentes" value={String(adjustmentsCount)} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Saldo Caixa" value={formatCurrency(cashSaldo)} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Acerto Contabil por Viacao</h3>
        </div>
        <DataTable
          columns={[
            { key: "empresa", header: "Empresa / Viacao", render: (v) => <span className="font-semibold text-foreground">{v.name}</span> },
            { key: "faturamento", header: "Faturamento Bruto", render: (v) => formatCurrency(v.amount) },
            { key: "central", header: "Taxa Retida", render: (v) => <span className="font-semibold text-emerald-600">{formatCurrency(v.central)}</span> },
            { key: "repasse", header: "Repasse Liquido", render: (v) => <span className="font-semibold text-amber-600">{formatCurrency(v.repasse)}</span> },
            { key: "prazo", header: "Prazo", render: (v) => <span className="font-semibold text-cyan-300">{formatPayoutDeadline(v.payoutDays)}</span> },
          ]}
          rows={repassesComputed.viacoes}
          emptyMessage="Nenhum faturamento registrado no periodo."
        />
      </Card>

      <Card>
        <SectionHeader title="Controle de Turnos" className="mb-4" />
        <DataTable
          columns={[
            { key: "booth", header: "Guiche", render: (r) => r.booth_name },
            { key: "operator", header: "Operador", render: (r) => r.operator_name },
            { key: "status", header: "Status", render: (r) => <Badge variant={r.status === "open" ? "success" : "neutral"}>{r.status === "open" ? "ABERTO" : "FECHADO"}</Badge> },
            { key: "receita", header: "Receita", render: (r) => <span className="font-semibold">{formatCurrency(Number(r.gross_amount || 0))}</span> },
            { key: "pendencias", header: "Pendencias", render: (r) => Number(r.missing_card_receipts || 0) > 0 ? <Badge variant="warning">{r.missing_card_receipts}</Badge> : "-" },
            { key: "acao", header: "Acao", render: (r) => r.status === "open" ? <Button variant="danger" size="sm" onClick={() => { if (window.confirm(`Forcar encerramento do turno de ${r.operator_name} no guiche ${r.booth_name}?`)) onForceCloseShift(r.shift_id); }}>Forcar encerramento</Button> : null },
          ]}
          rows={rows.slice(0, 50)}
          emptyMessage="Nenhum turno encontrado."
        />
      </Card>

      <Card>
        <SectionHeader title="Acompanhamento Por Guiche" subtitle="Resumo em tempo real do fechamento por resumo." className="mb-4" />
        <DataTable
          columns={[
            { key: "guiche", header: "Guiche", render: (row) => <span className="font-semibold">{row.boothLabel}</span> },
            { key: "empresas", header: "Empresas", render: (row) => row.companyCount },
            { key: "externo", header: "Total externo", render: (row) => formatCurrency(row.grossSales) },
            { key: "taxas", header: "Taxas", render: (row) => formatCurrency(row.stateTaxValue + row.federalTaxValue) },
            { key: "abatimentos", header: "Abatimentos", render: (row) => formatCurrency(row.totalAbatimentos) },
            { key: "liquido", header: "Resultado liquido", render: (row) => formatCurrency(row.netResult) },
            { key: "caixa", header: "Fechamento caixa", render: (row) => row.closingCount > 0 ? formatCurrency(row.declared) : "-" },
          ]}
          rows={financeByBooth}
          emptyMessage="Nenhum fechamento por guiche encontrado no periodo."
        />
      </Card>

      <Card>
        <SectionHeader title="Empresas Dentro De Cada Guiche" subtitle="Relatorio final diario por guiche, empresa e operador." className="mb-4" />
        <DataTable
          columns={[
            { key: "guiche", header: "Guiche", render: (row) => row.boothLabel },
            { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
            { key: "operador", header: "Operador", render: (row) => row.operatorName },
            { key: "externo", header: "Total externo", render: (row) => formatCurrency(row.totalVendidoExterno) },
            { key: "lancado", header: "Total lancado", render: (row) => formatCurrency(row.totalLancado) },
            { key: "taxas", header: "Taxas", render: (row) => formatCurrency(row.taxaEstadual + row.taxaInterestadual) },
            { key: "abatimentos", header: "Abatimentos", render: (row) => formatCurrency(row.totalAbatimentos) },
            { key: "liquido", header: "Resultado liquido", render: (row) => formatCurrency(row.resultadoLiquido) },
          ]}
          rows={financeByBoothCompany}
          emptyMessage="Nenhum resumo por empresa encontrado no periodo."
        />
      </Card>

      {adjustments.length > 0 && (
        <Card>
          <SectionHeader title={`Ajustes Pendentes (${adjustments.length})`} className="mb-4" />
          <DataTable
            columns={[
              { key: "operador", header: "Operador", render: (a) => nameOf(a.profiles) ?? "-" },
              { key: "motivo", header: "Motivo", render: (a) => <span className="block max-w-[200px] truncate">{a.reason}</span> },
              { key: "valor", header: "Valor", render: (a) => a.transactions ? formatCurrency(Number(a.transactions.amount)) : "-" },
              { key: "empresa", header: "Empresa", render: (a) => a.transactions ? nameOf(a.transactions.companies as never) ?? "-" : "-" },
              {
                key: "acao",
                header: "Acao",
                render: (a) => (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => { if (window.confirm("Aprovar este ajuste? A transacao sera atualizada.")) onApproveAdjustment(a.id, a.transaction_id); }}>
                      Aprovar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => { if (window.confirm("Rejeitar este ajuste? A acao nao podera ser desfeita.")) onRejectAdjustment(a.id); }}>
                      Rejeitar
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={adjustments}
            emptyMessage="Nenhum ajuste pendente."
          />
        </Card>
      )}
    </>
  );
}
