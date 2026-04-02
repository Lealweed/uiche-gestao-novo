type FullNameLike = { full_name: string };
type BoothLike = { name: string; code: string };
type CompanyCommissionLike = {
  commission_percent?: number | null;
  comission_percent?: number | null;
};

export const ADMIN_CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#f59e0b",
  success: "#10b981",
  danger: "#ef4444",
  purple: "#a78bfa",
  cyan: "#22d3ee",
  grid: "#1e293b",
  text: "#94a3b8",
};

export function getCompanyPct(company: CompanyCommissionLike) {
  return Number(company.commission_percent ?? company.comission_percent ?? 0);
}

export function nameOf(value: FullNameLike | FullNameLike[] | null) {
  return Array.isArray(value) ? value[0]?.full_name : value?.full_name;
}

export function boothOf(value: BoothLike | BoothLike[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
