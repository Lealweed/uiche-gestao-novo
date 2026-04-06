"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Clock,
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
  auditLogsCount: number;
  cashSaldo: number;
  rows: ShiftRow[];
  adjustments: AdjustmentRow[];
  onExportCSV: () => void;
  onForceCloseShift: (shiftId: string) => void;
  onApproveAdjustment: (adjId: string, txId: string) => void;
  onRejectAdjustment: (adjId: string) => void;
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
  auditLogsCount,
  cashSaldo,
  rows,
  adjustments,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Faturamento Total</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(repassesComputed.faturamento)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <span className="inline-flex items-center text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {reportTxCount}
                </span>
                transacoes
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20">
            <div className="h-full bg-blue-500" style={{ width: "75%" }} />
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Receita Central</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(repassesComputed.central)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <span className="inline-flex items-center text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                </span>
                taxas retidas
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20">
            <div className="h-full bg-emerald-500" style={{ width: "60%" }} />
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Repasse Viacoes</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(repassesComputed.repasse)}</p>
              <p className="mt-1 text-xs text-muted">valor liquido</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20">
            <div className="h-full bg-amber-500" style={{ width: "85%" }} />
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Turnos Ativos</p>
              <p className="text-2xl font-bold text-foreground">{summary.abertos}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                {summary.pendencias > 0 ? (
                  <span className="inline-flex items-center text-amber-600">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {summary.pendencias} pendencia(s)
                  </span>
                ) : (
                  <span className="text-emerald-600">sem pendencias</span>
                )}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/20 text-slate-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-500/20">
            <div className="h-full bg-slate-500" style={{ width: `${Math.min(summary.abertos * 10, 100)}%` }} />
          </div>
        </Card>
      </div>

      {isMounted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Faturamento por Dia</h3>
                <p className="text-xs text-muted">Ultimos 7 dias</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <div className="w-full">
              <AreaChart width={500} height={256} data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ width: "100%", height: 256 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Faturamento"]}
                  contentStyle={{
                    backgroundColor: "hsl(230 20% 13%)",
                    border: "1px solid hsl(230 15% 20%)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
                    color: "#f1f5f9",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Formas de Pagamento</h3>
                <p className="text-xs text-muted">Distribuicao por metodo</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="flex w-full justify-center">
              <PieChart width={300} height={256}>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]}
                  contentStyle={{
                    backgroundColor: "hsl(230 20% 13%)",
                    border: "1px solid hsl(230 15% 20%)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
                    color: "#f1f5f9",
                  }}
                />
                <Legend iconType="circle" formatter={(value) => <span style={{ color: "#f1f5f9", fontSize: "14px" }}>{value}</span>} />
              </PieChart>
            </div>
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
          <div className="w-full">
            <BarChart width={600} height={288} data={topCompaniesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} style={{ width: "100%", height: 288 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: CHART_COLORS.text }} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "faturamento" ? "Faturamento" : "Repasse"]}
                contentStyle={{
                  backgroundColor: "hsl(230 20% 13%)",
                  border: "1px solid hsl(230 15% 20%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
                  color: "#f1f5f9",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Legend />
              <Bar dataKey="faturamento" name="Faturamento" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              <Bar dataKey="repasse" name="Repasse" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted">Ajustes Pendentes</p>
            <p className="text-xl font-bold text-foreground">{adjustmentsCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/20 text-slate-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted">Logs de Auditoria</p>
            <p className="text-xl font-bold text-foreground">{auditLogsCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted">Saldo Caixa</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(cashSaldo)}</p>
          </div>
        </Card>
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
            { key: "acao", header: "Acao", render: (r) => r.status === "open" ? <Button variant="ghost" size="sm" onClick={() => onForceCloseShift(r.shift_id)}>Encerrar</Button> : null },
          ]}
          rows={rows.slice(0, 50)}
          emptyMessage="Nenhum turno encontrado."
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
                    <Button variant="primary" size="sm" onClick={() => onApproveAdjustment(a.id, a.transaction_id)}>
                      Aprovar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRejectAdjustment(a.id)}>
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
