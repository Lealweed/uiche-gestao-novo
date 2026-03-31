import type { SupabaseClient } from "@supabase/supabase-js";
import { isSchemaToleranceError, tolerantData } from "@/lib/schema-tolerance";

type DataClient = SupabaseClient<any, "public", any>;

export type Option = {
  id: string;
  name: string;
  commission_percent?: number | null;
  comission_percent?: number | null;
};

export type Category = { id: string; name: string };
export type Subcategory = { id: string; name: string; category_id: string };
export type Shift = { id: string; booth_id: string; status: "open" | "closed" };
export type Tx = {
  id: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  sold_at: string;
  ticket_reference: string | null;
  note: string | null;
  company_id: string | null;
  company_name: string;
  receipt_count: number;
};
export type BoothLink = { booth_id: string; booth_name: string };
export type Punch = {
  id: string;
  punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim";
  punched_at: string;
  note: string | null;
};
export type CashMovement = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
};

type ProfileAccess = {
  role?: string;
  active?: boolean;
} | null;

export type OperatorBootstrapData = {
  operatorActive: boolean | null;
  profileRole: string | null;
  shift: Shift | null;
  booths: BoothLink[];
  companies: Option[];
  categories: Category[];
  subcategories: Subcategory[];
  initialBoothId: string;
  initialCategoryId: string;
  initialSubcategoryId: string;
};

export async function loadOperatorBootstrapData(supabase: DataClient, userId: string): Promise<OperatorBootstrapData> {
  const [profileRes, boothLinksRes, companiesRes, categoriesRes, subcategoriesRes, shiftRes, allBoothsRes] = await Promise.all([
    supabase.from("profiles").select("role,active").eq("user_id", userId).single(),
    supabase.from("operator_booths").select("booth_id").eq("operator_id", userId).eq("active", true),
    supabase.from("companies").select("*").eq("active", true).order("name"),
    supabase.from("transaction_categories").select("id,name").eq("active", true).order("name"),
    supabase.from("transaction_subcategories").select("id,name,category_id").eq("active", true).order("name"),
    supabase.from("shifts").select("id,booth_id,status").eq("operator_id", userId).eq("status", "open").maybeSingle(),
    supabase.from("booths").select("id,name").eq("active", true),
  ]);

  const profile = (profileRes.data as ProfileAccess) ?? null;
  const boothLinkData = tolerantData((boothLinksRes.data as { booth_id: string }[] | null) ?? [], boothLinksRes.error, [], "Vínculos").data;
  const companies = tolerantData((companiesRes.data as Option[] | null) ?? [], companiesRes.error, [], "Empresas").data;
  const categories = tolerantData((categoriesRes.data as Category[] | null) ?? [], categoriesRes.error, [], "Categorias").data;
  const subcategories = tolerantData((subcategoriesRes.data as Subcategory[] | null) ?? [], subcategoriesRes.error, [], "Subcategorias").data;
  const allBooths = tolerantData((allBoothsRes.data as { id: string; name: string }[] | null) ?? [], allBoothsRes.error, [], "Guichês").data;

  const boothNameMap = new Map(allBooths.map((booth) => [booth.id, booth.name]));
  const booths = boothLinkData.map((booth) => ({
    booth_id: booth.booth_id,
    booth_name: boothNameMap.get(booth.booth_id) ?? booth.booth_id,
  }));

  const initialCategoryId = categories[0]?.id ?? "";
  const initialSubcategoryId = subcategories.find((subcategory) => subcategory.category_id === initialCategoryId)?.id ?? "";
  const initialBoothId = boothLinkData[0]?.booth_id ?? "";

  return {
    operatorActive: profile?.active ?? null,
    profileRole: profile?.role ?? null,
    shift: (shiftRes.data as Shift | null) ?? null,
    booths,
    companies,
    categories,
    subcategories,
    initialBoothId,
    initialCategoryId,
    initialSubcategoryId,
  };
}

export async function loadOperatorTransactions(supabase: DataClient, shiftId: string): Promise<Tx[]> {
  const txRes = await supabase
    .from("transactions")
    .select("id,amount,payment_method,sold_at,ticket_reference,note,company_id")
    .eq("shift_id", shiftId)
    .eq("status", "posted")
    .order("sold_at", { ascending: false })
    .limit(100);

  if (txRes.error) return [];

  const baseTransactions = (txRes.data ?? []) as Array<{
    id: string;
    amount: number;
    payment_method: "pix" | "credit" | "debit" | "cash";
    sold_at: string;
    ticket_reference: string | null;
    note: string | null;
    company_id: string | null;
  }>;

  const transactionIds = baseTransactions.map((transaction) => transaction.id);
  const companyIds = Array.from(new Set(baseTransactions.map((transaction) => transaction.company_id).filter(Boolean))) as string[];

  const [receiptRes, companyRes] = await Promise.all([
    transactionIds.length
      ? supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id", transactionIds)
      : Promise.resolve({ data: [], error: null } as const),
    companyIds.length
      ? supabase.from("companies").select("id,name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const receiptCounts = new Map<string, number>();
  for (const receipt of (receiptRes.data ?? []) as { transaction_id: string }[]) {
    receiptCounts.set(receipt.transaction_id, (receiptCounts.get(receipt.transaction_id) ?? 0) + 1);
  }

  const companyNames = new Map<string, string>();
  for (const company of (companyRes.data ?? []) as { id: string; name: string }[]) {
    companyNames.set(company.id, company.name);
  }

  return baseTransactions.map((transaction) => ({
    ...transaction,
    company_name: transaction.company_id ? companyNames.get(transaction.company_id) ?? "-" : "-",
    receipt_count: receiptCounts.get(transaction.id) ?? 0,
  }));
}

export async function loadOperatorPunches(supabase: DataClient, userId: string): Promise<Punch[]> {
  const res = await supabase
    .from("time_punches")
    .select("id,punch_type,punched_at,note")
    .eq("user_id", userId)
    .order("punched_at", { ascending: false })
    .limit(20);

  if (res.error && !isSchemaToleranceError(res.error)) return [];
  return (res.data as Punch[] | null) ?? [];
}

export async function loadOperatorCashMovements(supabase: DataClient, shiftId: string): Promise<CashMovement[]> {
  const res = await supabase
    .from("cash_movements")
    .select("id,movement_type,amount,note,created_at")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (res.error && !isSchemaToleranceError(res.error)) return [];
  return (res.data as CashMovement[] | null) ?? [];
}
