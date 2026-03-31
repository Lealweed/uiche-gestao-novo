import type { SupabaseClient } from "@supabase/supabase-js";

type DataClient = SupabaseClient<any, "public", any>;
type Related<T> = T | T[] | null;

export type ShiftTotal = {
  shift_id: string;
  booth_name: string;
  operator_name: string;
  status: "open" | "closed";
  gross_amount: string;
  commission_amount: string;
  total_pix: string;
  total_credit: string;
  total_debit: string;
  total_cash: string;
  missing_card_receipts: number;
};

export type Company = {
  id: string;
  name: string;
  commission_percent?: number | null;
  comission_percent?: number | null;
  active: boolean;
};

export type Booth = { id: string; code: string; name: string; active: boolean };
export type Profile = {
  user_id: string;
  full_name: string;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  active: boolean;
};
export type Category = { id: string; name: string; active: boolean };
export type Subcategory = {
  id: string;
  name: string;
  active: boolean;
  category_id: string;
  transaction_categories?: Related<{ name: string }>;
};
export type OperatorBoothLink = {
  id: string;
  active: boolean;
  operator_id?: string;
  booth_id?: string;
  profiles: Related<{ full_name: string }>;
  booths: Related<{ name: string; code: string }>;
};
export type AuditLog = {
  id: string;
  action: string;
  entity: string | null;
  details: Record<string, unknown>;
  created_at: string;
  created_by?: string;
  profiles: Related<{ full_name: string }>;
};
export type Adjustment = {
  id: string;
  transaction_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  requested_by?: string;
  profiles: Related<{ full_name: string }>;
  transactions: {
    amount: number;
    payment_method: string;
    companies: Related<{ name: string }>;
  } | null;
};
export type TxForReport = {
  id: string;
  status?: string;
  amount: number;
  sold_at?: string;
  payment_method?: string;
  operator_id?: string;
  booth_id?: string;
  company_id?: string;
  category_id?: string;
  subcategory_id?: string;
  profiles?: Related<{ full_name: string }>;
  booths?: Related<{ name: string; code: string }>;
  companies?: Related<{ name: string }>;
  transaction_categories: Related<{ name: string }>;
  transaction_subcategories: Related<{ name: string }>;
};
export type TimePunchRow = {
  id: string;
  punch_type: string;
  punched_at: string;
  note: string | null;
  user_id?: string;
  booth_id?: string;
  profiles: Related<{ full_name: string }>;
  booths: Related<{ code: string; name: string }>;
};
export type CashMovementRow = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
  user_id?: string;
  booth_id?: string;
  profiles: Related<{ full_name: string }>;
  booths: Related<{ code: string; name: string }>;
};
export type ShiftCashClosingRow = {
  id: string;
  expected_cash: number;
  declared_cash: number;
  difference: number;
  note: string | null;
  created_at: string;
  user_id?: string;
  booth_id?: string;
  profiles: Related<{ full_name: string }>;
  booths: Related<{ code: string; name: string }>;
};

export type AdminDashboardData = {
  rows: ShiftTotal[];
  companies: Company[];
  booths: Booth[];
  profiles: Profile[];
  categories: Category[];
  subcategories: Subcategory[];
  operatorBoothLinks: OperatorBoothLink[];
  auditLogs: AuditLog[];
  timePunchRows: TimePunchRow[];
  cashMovementRows: CashMovementRow[];
  shiftCashClosingRows: ShiftCashClosingRow[];
  reportTxs: TxForReport[];
  adjustments: Adjustment[];
};

type AdminDataFilters = {
  from?: string;
  to?: string;
};

function safe<T>(res: { data: T | null; error: unknown }, fallback: T): T {
  return res.data ?? fallback;
}

export async function fetchAdminDashboardData(supabase: DataClient, filters: AdminDataFilters): Promise<AdminDashboardData> {
  const from = filters.from?.trim() ?? "";
  const to = filters.to?.trim() ?? "";
  const startIso = from ? `${from}T00:00:00.000Z` : null;
  const endIso = to ? `${to}T23:59:59.999Z` : null;

  let shiftQuery = supabase.from("v_shift_totals").select("*").order("opened_at", { ascending: false }).limit(200);
  let transactionQuery = supabase
    .from("transactions")
    .select("id,status,amount,sold_at,payment_method,operator_id,booth_id,company_id,category_id,subcategory_id")
    .eq("status", "posted")
    .order("sold_at", { ascending: false })
    .limit(2000);

  if (startIso) {
    shiftQuery = shiftQuery.gte("opened_at", startIso);
    transactionQuery = transactionQuery.gte("sold_at", startIso);
  }

  if (endIso) {
    shiftQuery = shiftQuery.lte("opened_at", endIso);
    transactionQuery = transactionQuery.lte("sold_at", endIso);
  }

  const results = await Promise.allSettled([
    shiftQuery,
    supabase.from("companies").select("*").order("name"),
    supabase.from("booths").select("id,code,name,active").order("name"),
    supabase.from("profiles").select("user_id,full_name,cpf,address,phone,avatar_url,role,active").order("full_name"),
    supabase.from("transaction_categories").select("id,name,active").order("name"),
    supabase.from("transaction_subcategories").select("id,name,active,category_id").order("name"),
    supabase.from("operator_booths").select("id,active,operator_id,booth_id").limit(200),
    supabase.from("audit_logs").select("id,action,entity,details,created_at,created_by").order("created_at", { ascending: false }).limit(50),
    supabase.from("time_punches").select("id,punch_type,punched_at,note,user_id,booth_id").order("punched_at", { ascending: false }).limit(200),
    supabase.from("cash_movements").select("id,movement_type,amount,note,created_at,user_id,booth_id").order("created_at", { ascending: false }).limit(300),
    supabase.from("shift_cash_closings").select("id,expected_cash,declared_cash,difference,note,created_at,user_id,booth_id").order("created_at", { ascending: false }).limit(300),
    transactionQuery,
    supabase.from("adjustment_requests").select("id,transaction_id,reason,status,created_at,requested_by").eq("status", "pending").order("created_at", { ascending: false }).limit(40),
  ]);

  function getResult<T>(idx: number, fallback: T): T {
    const r = results[idx];
    if (r.status === "fulfilled") return safe(r.value as { data: T | null; error: unknown }, fallback);
    return fallback;
  }

  const shiftRes    = getResult<ShiftTotal[]>(0, []);
  const companyRes  = getResult<Company[]>(1, []);
  const boothRes    = getResult<Booth[]>(2, []);
  const profileRes  = getResult<Profile[]>(3, []);
  const categoryRes = getResult<Category[]>(4, []);
  const subcategoryRes = getResult<Subcategory[]>(5, []);
  const linkResRaw    = getResult<Omit<OperatorBoothLink, "profiles" | "booths">[]>(6, []);
  const auditResRaw   = getResult<Omit<AuditLog, "profiles">[]>(7, []);
  const punchResRaw   = getResult<Omit<TimePunchRow, "profiles" | "booths">[]>(8, []);
  const cashResRaw    = getResult<Omit<CashMovementRow, "profiles" | "booths">[]>(9, []);
  const closingResRaw = getResult<Omit<ShiftCashClosingRow, "profiles" | "booths">[]>(10, []);
  const txResRaw      = getResult<Omit<TxForReport, "profiles" | "booths" | "companies" | "transaction_categories" | "transaction_subcategories">[]>(11, []);
  const adjustmentResRaw = getResult<Omit<Adjustment, "profiles" | "transactions">[]>(12, []);

  const rows = shiftRes as ShiftTotal[];
  const companies = companyRes as Company[];
  const booths = boothRes as Booth[];
  const profiles = profileRes as Profile[];
  const categories = categoryRes as Category[];
  const subcategories = subcategoryRes as Subcategory[];

  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile.full_name]));
  const boothMap = new Map(booths.map((booth) => [booth.id, { name: booth.name, code: booth.code }]));
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const subcategoryMap = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory.name]));

  const operatorBoothLinks = linkResRaw.map((link) => ({
    ...link,
    profiles: link.operator_id ? { full_name: profileMap.get(link.operator_id) ?? "-" } : null,
    booths: link.booth_id ? boothMap.get(link.booth_id) ?? null : null,
  }));

  const auditLogs = auditResRaw.map((audit) => ({
    ...audit,
    profiles: audit.created_by ? { full_name: profileMap.get(audit.created_by) ?? "-" } : null,
  }));

  const timePunchRows = punchResRaw.map((punch) => ({
    ...punch,
    profiles: punch.user_id ? { full_name: profileMap.get(punch.user_id) ?? "-" } : null,
    booths: punch.booth_id ? boothMap.get(punch.booth_id) ?? null : null,
  }));

  const cashMovementRows = cashResRaw.map((movement) => ({
    ...movement,
    profiles: movement.user_id ? { full_name: profileMap.get(movement.user_id) ?? "-" } : null,
    booths: movement.booth_id ? boothMap.get(movement.booth_id) ?? null : null,
  }));

  const shiftCashClosingRows = closingResRaw.map((closing) => ({
    ...closing,
    profiles: closing.user_id ? { full_name: profileMap.get(closing.user_id) ?? "-" } : null,
    booths: closing.booth_id ? boothMap.get(closing.booth_id) ?? null : null,
  }));

  const reportTxs = txResRaw.map((transaction) => ({
    ...transaction,
    profiles: transaction.operator_id ? { full_name: profileMap.get(transaction.operator_id) ?? "-" } : null,
    booths: transaction.booth_id ? boothMap.get(transaction.booth_id) ?? null : null,
    companies: transaction.company_id ? { name: companyMap.get(transaction.company_id) ?? "-" } : null,
    transaction_categories: transaction.category_id ? { name: categoryMap.get(transaction.category_id) ?? "-" } : null,
    transaction_subcategories: transaction.subcategory_id ? { name: subcategoryMap.get(transaction.subcategory_id) ?? "-" } : null,
  }));

  const txById = new Map(reportTxs.map((transaction) => [transaction.id, transaction]));
  const adjustments = adjustmentResRaw.map((adjustment) => {
    const transaction = txById.get(adjustment.transaction_id);
    return {
      ...adjustment,
      profiles: adjustment.requested_by ? { full_name: profileMap.get(adjustment.requested_by) ?? "-" } : null,
      transactions: transaction
        ? {
            amount: Number(transaction.amount || 0),
            payment_method: transaction.payment_method ?? "-",
            companies: transaction.company_id ? { name: companyMap.get(transaction.company_id) ?? "-" } : null,
          }
        : null,
    };
  });

  return {
    rows,
    companies,
    booths,
    profiles,
    categories,
    subcategories,
    operatorBoothLinks,
    auditLogs,
    timePunchRows,
    cashMovementRows,
    shiftCashClosingRows,
    reportTxs,
    adjustments,
  };
}
