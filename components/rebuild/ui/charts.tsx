"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

/* ── shared palette ─────────────────────────────────────────── */
const COLORS = {
  pix:     "#22C55E",
  credit:  "#3B82F6",
  debit:   "#8B5CF6",
  cash:    "#F59E0B",
  primary: "#3B82F6",
  accent:  "#22C55E",
  muted:   "#6B7280",
  repasse: "#F59E0B",
  central: "#22C55E",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "0.5rem",
  color: "#E5E7EB",
  fontSize: "0.8rem",
};

/* ── PaymentPieChart ─────────────────────────────────────────── */
type PaymentPieData = { name: string; value: number; key: string };

type PaymentPieChartProps = {
  pix: number;
  credit: number;
  debit: number;
  cash: number;
};

export function PaymentPieChart({ pix, credit, debit, cash }: PaymentPieChartProps) {
  const data: PaymentPieData[] = [
    { key: "pix",    name: "PIX",      value: pix },
    { key: "credit", name: "Crédito",  value: credit },
    { key: "debit",  name: "Débito",   value: debit },
    { key: "cash",   name: "Dinheiro", value: cash },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ds-muted)",
          fontSize: "0.875rem",
        }}
      >
        Sem lançamentos no turno
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key as keyof typeof COLORS] ?? COLORS.primary} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, ""]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", color: "var(--ds-muted)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── RepasseBarChart ─────────────────────────────────────────── */
type RepasseRow = { name: string; amount: number; central: number; repasse: number };

type RepasseBarChartProps = {
  data: RepasseRow[];
};

export function RepasseBarChart({ data }: RepasseBarChartProps) {
  const top = data.slice(0, 8);

  if (top.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ds-muted)",
          fontSize: "0.875rem",
        }}
      >
        Sem dados de repasse no período
      </div>
    );
  }

  const shortenName = (name: string) =>
    name.length > 14 ? name.substring(0, 12) + "…" : name;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top.map((d) => ({ ...d, name: shortenName(d.name) }))} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#6B7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6B7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, ""]}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: "0.75rem", color: "var(--ds-muted)" }}
        />
        <Bar dataKey="amount"  name="Faturamento" fill={COLORS.primary} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="central" name="Retido"       fill={COLORS.accent}  radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="repasse" name="Repasse"      fill={COLORS.repasse} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── PaymentMethodBarChart (admin) ───────────────────────────── */
type PaymentBarData = { name: string; value: number; fill: string };

type AdminPaymentBarChartProps = {
  pix: number;
  credit: number;
  debit: number;
  cash: number;
};

export function AdminPaymentBarChart({ pix, credit, debit, cash }: AdminPaymentBarChartProps) {
  const data: PaymentBarData[] = [
    { name: "PIX",      value: pix,    fill: COLORS.pix },
    { name: "Crédito",  value: credit, fill: COLORS.credit },
    { name: "Débito",   value: debit,  fill: COLORS.debit },
    { name: "Dinheiro", value: cash,   fill: COLORS.cash },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: "#6B7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Total"]}
        />
        <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
