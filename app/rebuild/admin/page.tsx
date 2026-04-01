"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { Input } from "@/components/rebuild/ui/input";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Card } from "@/components/rebuild/ui/card";
import { Toast, type ToastType } from "@/components/rebuild/ui/toast";
import { exportToCSV } from "@/lib/csv-export";
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Users, 
  Wallet, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard,
  Banknote,
  RefreshCw,
  Download,
  Printer,
  Pencil,
  X,
  Check,
} from "lucide-react";

const supabase = createClient();

// Chart colors - Dark mode compatible
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#f59e0b", 
  success: "#10b981",
  danger: "#ef4444",
  purple: "#a78bfa",
  cyan: "#22d3ee",
  grid: "#1e293b",
  text: "#94a3b8",
};

type ShiftTotal = {
  shift_id: string; booth_name: string; operator_name: string;
  status: "open" | "closed"; gross_amount: string; commission_amount: string;
  total_pix: string; total_credit: string; total_debit: string; total_cash: string;
  missing_card_receipts: number;
};
type Company = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null; active: boolean };
type Booth   = { id: string; code: string; name: string; active: boolean };
type Profile = { user_id: string; full_name: string; cpf: string|null; address: string|null; phone: string|null; avatar_url: string|null; role: "admin"|"operator"; active: boolean };
type Category    = { id: string; name: string; active: boolean };
type Subcategory = { id: string; name: string; active: boolean; category_id: string; transaction_categories?: { name: string }|{ name: string }[]|null };
type OperatorBoothLink = { id: string; active: boolean; operator_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { name: string; code: string }|{ name: string; code: string }[]|null };
type AuditLog  = { id: string; action: string; entity: string|null; details: Record<string,unknown>; created_at: string; created_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null };
type Adjustment = { id: string; transaction_id: string; reason: string; status: "pending"|"approved"|"rejected"; created_at: string; requested_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null; transactions: { amount: number; payment_method: string; companies: { name: string }|{ name: string }[]|null }|null };
type TxForReport = { id: string; status?: string; amount: number; sold_at?: string; payment_method?: string; operator_id?: string; booth_id?: string; company_id?: string; category_id?: string; subcategory_id?: string; profiles?: { full_name: string }|{ full_name: string }[]|null; booths?: { name: string; code: string }|{ name: string; code: string }[]|null; companies?: { name: string }|{ name: string }[]|null; transaction_categories: { name: string }|{ name: string }[]|null; transaction_subcategories: { name: string }|{ name: string }[]|null };
type TimePunchRow = { id: string; punch_type: string; punched_at: string; note: string|null; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type CashMovementRow = { id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type ShiftCashClosingRow = { id: string; expected_cash: number; declared_cash: number; difference: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type MenuSection = "dashboard"|"operadores"|"gestao"|"financeiro"|"relatorios"|"usuarios"|"empresas"|"configuracoes";

function getCompanyPct(c: Company) { return Number(c.commission_percent ?? c.comission_percent ?? 0); }
function nameOf(x: { full_name: string }|{ full_name: string }[]|null) { return Array.isArray(x) ? x[0]?.full_name : x?.full_name; }
function boothOf(x: { name: string; code: string }|{ name: string; code: string }[]|null) { return Array.isArray(x) ? x[0] : x; }

function SectionCard({ title, children, action, className = "" }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "ATIVO" : "INATIVO"}</Badge>;
}

export default function AdminRebuildPage() {
  const router = useRouter();
  const [rows, setRows]           = useState<ShiftTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths]       = useState<Booth[]>([]);
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [operatorBoothLinks, setOperatorBoothLinks] = useState<OperatorBoothLink[]>([]);
  const [auditLogs, setAuditLogs]           = useState<AuditLog[]>([]);
  const [timePunchRows, setTimePunchRows]   = useState<TimePunchRow[]>([]);
  const [cashMovementRows, setCashMovementRows] = useState<CashMovementRow[]>([]);
  const [shiftCashClosingRows, setShiftCashClosingRows] = useState<ShiftCashClosingRow[]>([]);
  const [reportTxs, setReportTxs] = useState<TxForReport[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [message, setMessage]     = useState<string|null>(null);
  const [toastType, setToastType] = useState<ToastType>("info");
  const [menu, setMenu]           = useState<MenuSection>("dashboard");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [boothSearch, setBoothSearch]     = useState("");
  const [companyName, setCompanyName]     = useState("");
  const [companyPct, setCompanyPct]       = useState("6");
  const [boothCode, setBoothCode]         = useState("");
  const [boothName, setBoothName]         = useState("");
  const [categoryName, setCategoryName]   = useState("");
  const [subcategoryName, setSubcategoryName]         = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [selectedOperatorId, setSelectedOperatorId]   = useState("");
  const [selectedBoothId, setSelectedBoothId]         = useState("");
  const [newProfileUserId, setNewProfileUserId]       = useState("");
  const [newProfileName, setNewProfileName]           = useState("");
  const [newProfileRole, setNewProfileRole]           = useState<"admin"|"operator">("operator");
  const [newProfileCpf, setNewProfileCpf]             = useState("");
  const [newProfilePhone, setNewProfilePhone]         = useState("");
  const [newProfileAddress, setNewProfileAddress]     = useState("");
  const [newProfileAvatarUrl, setNewProfileAvatarUrl] = useState("");
  const [newProfileActive, setNewProfileActive]       = useState(true);
  const [resetEmail, setResetEmail]                   = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [punchPage, setPunchPage] = useState(1);
  const PUNCH_PER_PAGE = 10;

  // Estados de edicao
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState("");
  const [editingCompanyPct, setEditingCompanyPct] = useState("");
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [editingBoothCode, setEditingBoothCode] = useState("");
  const [editingBoothName, setEditingBoothName] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.push("/login");
      const { data: p } = await supabase.from("profiles").select("role").eq("user_id", data.user.id).single();
      if ((p as { role?: string } | null)?.role !== "admin") return router.push("/operator");
      await refreshData();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleSectionChange(e: Event) {
      const section = (e as CustomEvent).detail;
      const map: Record<string, MenuSection> = {
        "dashboard": "dashboard",
        "controle-turno": "operadores",
        "financeiro": "financeiro",
        "relatorios": "relatorios",
        "usuarios": "usuarios",
        "empresas": "empresas",
        "configuracoes": "configuracoes",
      };
      if (map[section]) setMenu(map[section]);
    }
    window.addEventListener("rebuild:section-change", handleSectionChange);
    const hash = window.location.hash.replace("#", "").trim();
    if (hash) {
      handleSectionChange(new CustomEvent("rebuild:section-change", { detail: hash }) as Event);
    }
    return () => window.removeEventListener("rebuild:section-change", handleSectionChange);
  }, []);

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string,unknown>) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({ created_by: data.user.id, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });
  }

  async function refreshData(from?: string, to?: string) {
    setLoading(true);
    const f = from ?? dateFrom; const t = to ?? dateTo;
    const sI = f ? `${f}T00:00:00.000Z` : null;
    const eI = t ? `${t}T23:59:59.999Z` : null;
    try {
      let shiftQ = supabase.from("v_shift_totals").select("*").order("opened_at", { ascending: false }).limit(200);
      let txQ    = supabase.from("transactions").select("id,status,amount,sold_at,payment_method,operator_id,booth_id,company_id,category_id,subcategory_id").eq("status","posted").order("sold_at",{ascending:false}).limit(5000);
      if (sI) { shiftQ = shiftQ.gte("opened_at", sI); txQ = txQ.gte("sold_at", sI); }
      if (eI) { shiftQ = shiftQ.lte("opened_at", eI); txQ = txQ.lte("sold_at", eI); }

      const [shiftRes,compRes,boothRes,profileRes,catRes,subRes,linkRes,auditRes,punchRes,cashRes,closeRes,txRes,adjRes] = await Promise.all([
        shiftQ,
        supabase.from("companies").select("*").order("name"),
        supabase.from("booths").select("id,code,name,active").order("name"),
        supabase.from("profiles").select("user_id,full_name,cpf,address,phone,avatar_url,role,active").order("full_name"),
        supabase.from("transaction_categories").select("id,name,active").order("name"),
        supabase.from("transaction_subcategories").select("id,name,active,category_id").order("name"),
        supabase.from("operator_booths").select("id,active,operator_id,booth_id").limit(200),
        supabase.from("audit_logs").select("id,action,entity,details,created_at,created_by").order("created_at",{ascending:false}).limit(50),
        supabase.from("time_punches").select("id,punch_type,punched_at,note,user_id,booth_id").order("punched_at",{ascending:false}).limit(200),
        supabase.from("cash_movements").select("id,movement_type,amount,note,created_at,user_id,booth_id").order("created_at",{ascending:false}).limit(300),
        supabase.from("shift_cash_closings").select("id,expected_cash,declared_cash,difference,note,created_at,user_id,booth_id").order("created_at",{ascending:false}).limit(300),
        txQ,
        supabase.from("adjustment_requests").select("id,transaction_id,reason,status,created_at,requested_by").eq("status","pending").order("created_at",{ascending:false}).limit(40),
      ]);

      const shiftsData   = (shiftRes.data as ShiftTotal[]) ?? [];
      const companiesData= (compRes.data as Company[]) ?? [];
      const boothsData   = (boothRes.data as Booth[]) ?? [];
      const profilesData = (profileRes.data as Profile[]) ?? [];
      const catsData     = (catRes.data as Category[]) ?? [];
      const subsData     = (subRes.data as unknown as Subcategory[]) ?? [];
      const profileMap   = new Map(profilesData.map(p => [p.user_id, p.full_name]));
      const boothMap     = new Map(boothsData.map(b => [b.id, { name: b.name, code: b.code }]));
      const companyMap   = new Map(companiesData.map(c => [c.id, c.name]));
      const catMap       = new Map(catsData.map(c => [c.id, c.name]));
      const subMap       = new Map(subsData.map(s => [s.id, s.name]));

      const hydratedLinks   = ((linkRes.data ?? []) as unknown as OperatorBoothLink[]).map(l => ({ ...l, profiles: l.operator_id ? { full_name: profileMap.get(l.operator_id) ?? "-" } : null, booths: l.booth_id ? boothMap.get(l.booth_id) ?? null : null }));
      const hydratedAudit   = ((auditRes.data ?? []) as unknown as AuditLog[]).map(a => ({ ...a, profiles: a.created_by ? { full_name: profileMap.get(a.created_by) ?? "-" } : null }));
      const hydratedPunch   = ((punchRes.data ?? []) as unknown as TimePunchRow[]).map(p => ({ ...p, profiles: p.user_id ? { full_name: profileMap.get(p.user_id) ?? "-" } : null, booths: p.booth_id ? boothMap.get(p.booth_id) ?? null : null }));
      const hydratedCash    = ((cashRes.data ?? []) as unknown as CashMovementRow[]).map(c => ({ ...c, profiles: c.user_id ? { full_name: profileMap.get(c.user_id) ?? "-" } : null, booths: c.booth_id ? boothMap.get(c.booth_id) ?? null : null }));
      const hydratedClosings= ((closeRes.data ?? []) as unknown as ShiftCashClosingRow[]).map(c => ({ ...c, profiles: c.user_id ? { full_name: profileMap.get(c.user_id) ?? "-" } : null, booths: c.booth_id ? boothMap.get(c.booth_id) ?? null : null }));
      const hydratedTxs     = ((txRes.data ?? []) as unknown as TxForReport[]).map(tx => ({ ...tx, profiles: tx.operator_id ? { full_name: profileMap.get(tx.operator_id) ?? "-" } : null, booths: tx.booth_id ? boothMap.get(tx.booth_id) ?? null : null, companies: tx.company_id ? { name: companyMap.get(tx.company_id) ?? "-" } : null, transaction_categories: tx.category_id ? { name: catMap.get(tx.category_id) ?? "-" } : null, transaction_subcategories: tx.subcategory_id ? { name: subMap.get(tx.subcategory_id) ?? "-" } : null }));
      const txById = new Map(hydratedTxs.map(tx => [tx.id, tx]));
      const hydratedAdj = ((adjRes.data ?? []) as unknown as Adjustment[]).map(a => { const tx = txById.get(a.transaction_id); return { ...a, profiles: a.requested_by ? { full_name: profileMap.get(a.requested_by) ?? "-" } : null, transactions: tx ? { amount: Number(tx.amount||0), payment_method: tx.payment_method ?? "-", companies: tx.company_id ? { name: companyMap.get(tx.company_id) ?? "-" } : null } : null } as Adjustment; });

      setRows(shiftsData); setCompanies(companiesData); setBooths(boothsData); setProfiles(profilesData);
      setCategories(catsData); setSubcategories(subsData as unknown as Subcategory[]);
      setOperatorBoothLinks(hydratedLinks as unknown as OperatorBoothLink[]);
      setAuditLogs(hydratedAudit as unknown as AuditLog[]);
      setTimePunchRows(hydratedPunch as unknown as TimePunchRow[]);
      setCashMovementRows(hydratedCash as unknown as CashMovementRow[]);
      setShiftCashClosingRows(hydratedClosings as unknown as ShiftCashClosingRow[]);
      setReportTxs(hydratedTxs as unknown as TxForReport[]); setAdjustments(hydratedAdj as unknown as Adjustment[]);
    } finally { setLoading(false); }
  }

  const repassesComputed = useMemo(() => {
    let faturamento = 0;
    let central = 0;
    let repasse = 0;
    const comps = new Map<string, { id: string, name: string, amount: number, central: number, repasse: number }>();
    const pctMap = new Map(companies.map(c => [c.id, getCompanyPct(c)]));

    for (const tx of reportTxs) {
      const v = Number(tx.amount || 0);
      const cId = tx.company_id;
      const pct = cId ? (pctMap.get(cId) ?? 0) : 0;
      const taxa = v * (pct / 100);
      const liq = v - taxa;

      faturamento += v;
      central += taxa;
      repasse += liq;

      if (cId) {
        if (!comps.has(cId)) {
          const cName = tx.companies && !Array.isArray(tx.companies) ? tx.companies.name : "Desconhecida";
          comps.set(cId, { id: cId, name: cName, amount: 0, central: 0, repasse: 0 });
        }
        const st = comps.get(cId)!;
        st.amount += v;
        st.central += taxa;
        st.repasse += liq;
      }
    }
    
    return {
      faturamento,
      central,
      repasse,
      viacoes: Array.from(comps.values()).sort((a,b) => b.amount - a.amount),
    };
  }, [reportTxs, companies]);

  const summary = useMemo(() => ({
    totalDia:       rows.reduce((a,r) => a + Number(r.gross_amount||0), 0),
    totalComissao:  rows.reduce((a,r) => a + Number(r.commission_amount||0), 0),
    pendencias:     rows.reduce((a,r) => a + Number(r.missing_card_receipts||0), 0),
    abertos:        rows.filter(r => r.status === "open").length,
  }), [rows]);

  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
    for (const tx of reportTxs) {
      const method = (tx.payment_method || "").toLowerCase();
      if (method.includes("pix")) methods.pix += Number(tx.amount || 0);
      else if (method.includes("credit")) methods.credito += Number(tx.amount || 0);
      else if (method.includes("debit")) methods.debito += Number(tx.amount || 0);
      else methods.dinheiro += Number(tx.amount || 0);
    }
    return [
      { name: "PIX", value: methods.pix, color: CHART_COLORS.primary },
      { name: "Credito", value: methods.credito, color: CHART_COLORS.purple },
      { name: "Debito", value: methods.debito, color: CHART_COLORS.cyan },
      { name: "Dinheiro", value: methods.dinheiro, color: CHART_COLORS.success },
    ].filter(d => d.value > 0);
  }, [reportTxs]);

  const dailyRevenueData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    for (const tx of reportTxs) {
      if (!tx.sold_at) continue;
      const date = new Date(tx.sold_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(tx.amount || 0));
    }
    return Array.from(dailyMap.entries())
      .map(([date, valor]) => ({ date, valor }))
      .slice(-7)
      .reverse();
  }, [reportTxs]);

  const topCompaniesData = useMemo(() => {
    return repassesComputed.viacoes.slice(0, 5).map((v, i) => ({
      name: v.name.length > 15 ? v.name.slice(0, 15) + "..." : v.name,
      faturamento: v.amount,
      repasse: v.repasse,
      fill: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.purple, CHART_COLORS.cyan][i] || CHART_COLORS.primary,
    }));
  }, [repassesComputed.viacoes]);

  const cashMovementTotals = useMemo(() => {
    const s = cashMovementRows.filter(m => m.movement_type==="suprimento").reduce((a,m)=>a+Number(m.amount||0),0);
    const g = cashMovementRows.filter(m => m.movement_type==="sangria").reduce((a,m)=>a+Number(m.amount||0),0);
    const j = cashMovementRows.filter(m => m.movement_type==="ajuste").reduce((a,m)=>a+Number(m.amount||0),0);
    return { suprimento: s, sangria: g, ajuste: j, saldo: s - g + j };
  }, [cashMovementRows]);

  const cashClosingTotals = useMemo(() => ({
    expected:   shiftCashClosingRows.reduce((a,r)=>a+Number(r.expected_cash||0),0),
    declared:   shiftCashClosingRows.reduce((a,r)=>a+Number(r.declared_cash||0),0),
    difference: shiftCashClosingRows.reduce((a,r)=>a+Number(r.difference||0),0),
  }), [shiftCashClosingRows]);

  const filteredProfiles = useMemo(() => { const t = profileSearch.trim().toLowerCase(); return t ? profiles.filter(p => [p.full_name, p.cpf??"", p.phone??"", p.role].join(" ").toLowerCase().includes(t)) : profiles; }, [profiles, profileSearch]);
  const filteredBooths   = useMemo(() => { const t = boothSearch.trim().toLowerCase(); return t ? booths.filter(b => `${b.code} ${b.name}`.toLowerCase().includes(t)) : booths; }, [booths, boothSearch]);

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    let { error } = await supabase.from("companies").insert({ name: companyName.trim(), commission_percent: Number(companyPct), active: true });
    if (error?.message?.toLowerCase().includes("commission_percent")) {
      const r = await supabase.from("companies").insert({ name: companyName.trim(), comission_percent: Number(companyPct), active: true } as any);
      error = r.error;
    }
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setCompanyName(""); setCompanyPct("6");
    setToastType("success"); setMessage("Empresa cadastrada com sucesso!"); await refreshData();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("booths").insert({ code: boothCode.trim().toUpperCase(), name: boothName.trim(), active: true });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setBoothCode(""); setBoothName(""); setToastType("success"); setMessage("Guiche cadastrado com sucesso!"); await refreshData();
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("transaction_categories").insert({ name: categoryName.trim(), active: true });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setCategoryName(""); setToastType("success"); setMessage("Categoria cadastrada com sucesso!"); await refreshData();
  }

  async function createSubcategory(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("transaction_subcategories").insert({ category_id: subcategoryCategoryId, name: subcategoryName.trim(), active: true });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setSubcategoryName(""); setSubcategoryCategoryId(""); setToastType("success"); setMessage("Subcategoria cadastrada com sucesso!"); await refreshData();
  }

  async function linkOperatorToBooth(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("operator_booths").upsert({ operator_id: selectedOperatorId, booth_id: selectedBoothId, active: true });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setToastType("success"); setMessage("Operador vinculado com sucesso!"); await refreshData();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const uid = newProfileUserId.trim();
    const { error } = await supabase.from("profiles").upsert({ user_id: uid, full_name: newProfileName.trim(), cpf: newProfileCpf.trim()||null, address: newProfileAddress.trim()||null, phone: newProfilePhone.trim()||null, avatar_url: newProfileAvatarUrl.trim()||null, role: newProfileRole, active: newProfileActive });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setNewProfileUserId(""); setNewProfileName(""); setNewProfileCpf(""); setNewProfilePhone(""); setNewProfileAddress(""); setNewProfileAvatarUrl(""); setNewProfileRole("operator"); setNewProfileActive(true);
    await logAction("UPSERT_PROFILE","profiles",uid,{role:newProfileRole});
    setToastType("success"); setMessage("Perfil salvo com sucesso!"); await refreshData();
  }

  async function sendResetLink(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setResetEmail(""); setToastType("success"); setMessage("Link de reset enviado com sucesso!");
  }

  async function toggleCompanyActive(c: Company) { await supabase.from("companies").update({ active: !c.active }).eq("id",c.id); await refreshData(); }
  async function toggleBoothActive(b: Booth) { await supabase.from("booths").update({ active: !b.active }).eq("id",b.id); await refreshData(); }
  async function toggleProfileActive(p: Profile) { await supabase.from("profiles").update({ active: !p.active }).eq("user_id",p.user_id); await refreshData(); }
  async function toggleCategoryActive(c: Category) { await supabase.from("transaction_categories").update({ active: !c.active }).eq("id",c.id); await refreshData(); }
  async function toggleSubcategoryActive(s: Subcategory) { await supabase.from("transaction_subcategories").update({ active: !s.active }).eq("id",s.id); await refreshData(); }

  // Funcoes de edicao
  function startEditCategory(c: Category) {
    setEditingCategoryId(c.id);
    setEditingCategoryName(c.name);
  }
  async function saveEditCategory() {
    if (!editingCategoryId) return;
    await supabase.from("transaction_categories").update({ name: editingCategoryName }).eq("id", editingCategoryId);
    setEditingCategoryId(null);
    setEditingCategoryName("");
    await refreshData();
    setToastType("success"); setMessage("Categoria atualizada!");
  }
  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  function startEditSubcategory(s: Subcategory) {
    setEditingSubcategoryId(s.id);
    setEditingSubcategoryName(s.name);
  }
  async function saveEditSubcategory() {
    if (!editingSubcategoryId) return;
    await supabase.from("transaction_subcategories").update({ name: editingSubcategoryName }).eq("id", editingSubcategoryId);
    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
    await refreshData();
    setToastType("success"); setMessage("Subcategoria atualizada!");
  }
  function cancelEditSubcategory() {
    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
  }

  function startEditCompany(c: Company) {
    setEditingCompanyId(c.id);
    setEditingCompanyName(c.name);
    setEditingCompanyPct(getCompanyPct(c).toString());
  }
  async function saveEditCompany() {
    if (!editingCompanyId) return;
    await supabase.from("companies").update({ name: editingCompanyName, commission_percentage: parseFloat(editingCompanyPct) }).eq("id", editingCompanyId);
    setEditingCompanyId(null);
    setEditingCompanyName("");
    setEditingCompanyPct("");
    await refreshData();
    setToastType("success"); setMessage("Empresa atualizada!");
  }
  function cancelEditCompany() {
    setEditingCompanyId(null);
    setEditingCompanyName("");
    setEditingCompanyPct("");
  }

  function startEditBooth(b: Booth) {
    setEditingBoothId(b.id);
    setEditingBoothCode(b.code);
    setEditingBoothName(b.name);
  }
  async function saveEditBooth() {
    if (!editingBoothId) return;
    await supabase.from("booths").update({ code: editingBoothCode, name: editingBoothName }).eq("id", editingBoothId);
    setEditingBoothId(null);
    setEditingBoothCode("");
    setEditingBoothName("");
    await refreshData();
    setToastType("success"); setMessage("Guiche atualizado!");
  }
  function cancelEditBooth() {
    setEditingBoothId(null);
    setEditingBoothCode("");
    setEditingBoothName("");
  }

  async function approveAdjustment(adjId: string, txId: string) {
    await supabase.from("transactions").update({ status:"voided" }).eq("id",txId);
    const { data: a } = await supabase.auth.getUser();
    await supabase.from("adjustment_requests").update({ status:"approved", reviewed_by: a.user?.id??null, reviewed_at: new Date().toISOString() }).eq("id",adjId);
    await logAction("APPROVE_ADJUSTMENT","adjustment_requests",adjId,{transaction_id:txId});
    setToastType("success"); setMessage("Ajuste aprovado com sucesso!"); await refreshData();
  }

  async function rejectAdjustment(adjId: string) {
    const { data: a } = await supabase.auth.getUser();
    await supabase.from("adjustment_requests").update({ status:"rejected", reviewed_by: a.user?.id??null, reviewed_at: new Date().toISOString() }).eq("id",adjId);
    await logAction("REJECT_ADJUSTMENT","adjustment_requests",adjId);
    setToastType("info"); setMessage("Ajuste rejeitado."); await refreshData();
  }

  async function forceCloseShift(shiftId: string) {
    const { error } = await supabase.rpc("close_shift", { p_shift_id: shiftId, p_ip: null, p_notes: "Encerrado pelo admin" });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    await logAction("FORCE_CLOSE_SHIFT","shifts",shiftId);
    setToastType("success"); setMessage("Turno encerrado com sucesso!"); await refreshData();
  }

  const show = (k: MenuSection) => menu === k;

  function handleExportCSV() {
    exportToCSV("repasses-viacao", repassesComputed.viacoes, [
      { key: "name", label: "Empresa / Viacao" },
      { key: "amount", label: "Faturamento Bruto" },
      { key: "central", label: "Taxa Retida (Central)" },
      { key: "repasse", label: "Repasse Liquido" },
    ]);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <RebuildShell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Central Viagens</p>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => refreshData()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Global message */}
      <Toast message={message} type={toastType} onClose={() => setMessage(null)} />

      {/* Main content - No duplicate menu! */}
      <div className="space-y-6">
        {/* DASHBOARD */}
        {show("dashboard") && (
          <>
            {loading ? (
              <Card className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted">Carregando indicadores...</p>
              </Card>
            ) : (
              <>
                {/* Date filter */}
<Card>
              <form className="flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); refreshData(); }}>
                <Input type="date" label="Data inicial" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
                <Input type="date" label="Data final" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
                <Button type="submit">Filtrar</Button>
                <Button variant="ghost" type="button" onClick={() => { setDateFrom(""); setDateTo(""); refreshData("",""); }}>Limpar</Button>
              </form>
            </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted mb-1">Faturamento Total</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(repassesComputed.faturamento)}</p>
                        <p className="text-xs text-muted mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center text-emerald-600">
                            <ArrowUpRight className="w-3 h-3" />
                            {reportTxs.length}
                          </span>
                          transacoes
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20">
                      <div className="h-full bg-blue-500" style={{ width: "75%" }} />
                    </div>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted mb-1">Receita Central</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(repassesComputed.central)}</p>
                        <p className="text-xs text-muted mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center text-emerald-600">
                            <TrendingUp className="w-3 h-3" />
                          </span>
                          taxas retidas
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20">
                      <div className="h-full bg-emerald-500" style={{ width: "60%" }} />
                    </div>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted mb-1">Repasse Viacoes</p>
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(repassesComputed.repasse)}</p>
                        <p className="text-xs text-muted mt-1">valor liquido</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20">
                      <div className="h-full bg-amber-500" style={{ width: "85%" }} />
                    </div>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted mb-1">Turnos Ativos</p>
                        <p className="text-2xl font-bold text-foreground">{summary.abertos}</p>
                        <p className="text-xs text-muted mt-1 flex items-center gap-1">
                          {summary.pendencias > 0 ? (
                            <span className="inline-flex items-center text-amber-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {summary.pendencias} pendencia(s)
                            </span>
                          ) : (
                            <span className="text-emerald-600">sem pendencias</span>
                          )}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center text-slate-400">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-500/20">
                      <div className="h-full bg-slate-500" style={{ width: `${Math.min(summary.abertos * 10, 100)}%` }} />
                    </div>
                  </Card>
                </div>

                {/* Charts Row */}
                {isMounted && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Trend Chart */}
                    <Card>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Faturamento por Dia</h3>
                          <p className="text-xs text-muted">Ultimos 7 dias</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="w-full">
                        <AreaChart width={500} height={256} data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ width: "100%", height: 256 }}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                              contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)", color: "#f1f5f9" }}
                              labelStyle={{ color: "#94a3b8" }}
                            />
                            <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                          </AreaChart>
                      </div>
                    </Card>

                    {/* Payment Methods Chart */}
                    <Card>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Formas de Pagamento</h3>
                          <p className="text-xs text-muted">Distribuicao por metodo</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="w-full flex justify-center">
                          <PieChart width={300} height={256}>
                            <Pie
                              data={paymentMethodData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {paymentMethodData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), ""]}
                              contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)", color: "#f1f5f9" }}
                            />
                            <Legend 
                              iconType="circle"
                              formatter={(value) => <span style={{ color: "#f1f5f9", fontSize: "14px" }}>{value}</span>}
                            />
                          </PieChart>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Top Companies Chart */}
                {isMounted && topCompaniesData.length > 0 && (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Top 5 Viacoes</h3>
                        <p className="text-xs text-muted">Por faturamento bruto</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 mr-1" />
                        Exportar CSV
                      </Button>
                    </div>
                    <div className="w-full">
                        <BarChart width={600} height={288} data={topCompaniesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} style={{ width: "100%", height: 288 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={true} vertical={false} />
                          <XAxis type="number" tick={{ fontSize: 12, fill: CHART_COLORS.text }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: CHART_COLORS.text }} />
                          <Tooltip 
                            formatter={(value: number, name: string) => [formatCurrency(value), name === "faturamento" ? "Faturamento" : "Repasse"]}
                            contentStyle={{ backgroundColor: "hsl(230 20% 13%)", border: "1px solid hsl(230 15% 20%)", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)", color: "#f1f5f9" }}
                            labelStyle={{ color: "#94a3b8" }}
                          />
                          <Legend />
                          <Bar dataKey="faturamento" name="Faturamento" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                          <Bar dataKey="repasse" name="Repasse" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </div>
                  </Card>
                )}

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Ajustes Pendentes</p>
                      <p className="text-xl font-bold text-foreground">{adjustments.length}</p>
                    </div>
                  </Card>
                  <Card className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center text-slate-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Logs de Auditoria</p>
                      <p className="text-xl font-bold text-foreground">{auditLogs.length}</p>
                    </div>
                  </Card>
                  <Card className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Saldo Caixa</p>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(cashMovementTotals.saldo)}</p>
                    </div>
                  </Card>
                </div>

                {/* Consolidated Table */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">Consolidado por Viacao</h3>
                  </div>
                  <DataTable
                    columns={[
                      { key: "empresa", header: "Empresa / Viacao", render: (v) => <span className="font-semibold text-foreground">{v.name}</span> },
                      { key: "faturamento", header: "Faturamento Bruto", render: (v) => formatCurrency(v.amount) },
                      { key: "central", header: "Taxa Retida", render: (v) => <span className="text-emerald-600 font-semibold">{formatCurrency(v.central)}</span> },
                      { key: "repasse", header: "Repasse Liquido", render: (v) => <span className="text-amber-600 font-semibold">{formatCurrency(v.repasse)}</span> },
                    ]}
                    rows={repassesComputed.viacoes}
                    emptyMessage="Nenhum faturamento registrado no periodo."
                  />
                </Card>

                {/* Shifts table */}
                <Card>
                  <SectionHeader title="Controle de Turnos" className="mb-4" />
                  <DataTable
                    columns={[
                      { key: "booth", header: "Guiche", render: (r) => r.booth_name },
                      { key: "operator", header: "Operador", render: (r) => r.operator_name },
                      { key: "status", header: "Status", render: (r) => <Badge variant={r.status==="open"?"success":"neutral"}>{r.status==="open"?"ABERTO":"FECHADO"}</Badge> },
                      { key: "receita", header: "Receita", render: (r) => <span className="font-semibold">{formatCurrency(Number(r.gross_amount||0))}</span> },
                      { key: "pendencias", header: "Pendencias", render: (r) => Number(r.missing_card_receipts||0)>0 ? <Badge variant="warning">{r.missing_card_receipts}</Badge> : "-" },
                      { key: "acao", header: "Acao", render: (r) => r.status==="open" ? <Button variant="ghost" size="sm" onClick={()=>forceCloseShift(r.shift_id)}>Encerrar</Button> : null },
                    ]}
                    rows={rows.slice(0,50)}
                    emptyMessage="Nenhum turno encontrado."
                  />
                </Card>

                {/* Adjustments */}
                {adjustments.length > 0 && (
                  <Card>
                    <SectionHeader title={`Ajustes Pendentes (${adjustments.length})`} className="mb-4" />
                    <DataTable
                      columns={[
                        { key: "operador", header: "Operador", render: (a) => nameOf(a.profiles) ?? "-" },
                        { key: "motivo", header: "Motivo", render: (a) => <span className="truncate max-w-[200px] block">{a.reason}</span> },
                        { key: "valor", header: "Valor", render: (a) => a.transactions ? formatCurrency(Number(a.transactions.amount)) : "-" },
                        { key: "empresa", header: "Empresa", render: (a) => a.transactions ? nameOf(a.transactions.companies as any) ?? "-" : "-" },
                        { key: "acao", header: "Acao", render: (a) => (
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={()=>approveAdjustment(a.id, a.transaction_id)}>Aprovar</Button>
                            <Button variant="ghost" size="sm" onClick={()=>rejectAdjustment(a.id)}>Rejeitar</Button>
                          </div>
                        ) },
                      ]}
                      rows={adjustments}
                      emptyMessage="Nenhum ajuste pendente."
                    />
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* OPERADORES */}
        {show("operadores") && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Registro de Ponto</h2>
              <span className="text-sm text-muted">{timePunchRows.length} registros</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timePunchRows
                .slice((punchPage - 1) * PUNCH_PER_PAGE, punchPage * PUNCH_PER_PAGE)
                .map((p) => {
                  const b = boothOf(p.booths);
                  const punchTypeColors: Record<string, string> = {
                    entrada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                    saida: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                    pausa_inicio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    pausa_fim: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                  };
                  const colorClass = punchTypeColors[p.punch_type] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";
                  
                  return (
                    <Card key={p.id} className="relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${colorClass.split(" ")[0]}`} />
                      <div className="pl-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={colorClass}>{p.punch_type.replace("_", " ")}</Badge>
                          <span className="text-xs text-muted">
                            {new Date(p.punched_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground mb-1">{nameOf(p.profiles) ?? "Operador"}</p>
                        <p className="text-sm text-muted">{b ? `${b.code} - ${b.name}` : "-"}</p>
                        {p.note && <p className="text-xs text-muted mt-2 italic">{p.note}</p>}
                      </div>
                    </Card>
                  );
                })}
            </div>

            {timePunchRows.length > PUNCH_PER_PAGE && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={punchPage === 1}
                  onClick={() => setPunchPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted px-4">
                  Pagina {punchPage} de {Math.ceil(timePunchRows.length / PUNCH_PER_PAGE)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={punchPage >= Math.ceil(timePunchRows.length / PUNCH_PER_PAGE)}
                  onClick={() => setPunchPage((p) => p + 1)}
                >
                  Proxima
                </Button>
              </div>
            )}
          </>
        )}

        {/* FINANCEIRO */}
{show("financeiro") && (
          <>
            <Card>
              <form className="flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); refreshData(); }}>
                <Input type="date" label="Data inicial" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
                <Input type="date" label="Data final" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
                <Button type="submit">Filtrar</Button>
                <Button variant="ghost" type="button" onClick={() => { setDateFrom(""); setDateTo(""); refreshData("",""); }}>Limpar</Button>
              </form>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Suprimento" value={formatCurrency(cashMovementTotals.suprimento)} icon={<ArrowUpRight className="w-5 h-5" />} deltaType="positive" />
              <StatCard label="Sangria" value={formatCurrency(cashMovementTotals.sangria)} icon={<ArrowDownRight className="w-5 h-5" />} deltaType="negative" />
              <StatCard label="Ajuste" value={formatCurrency(cashMovementTotals.ajuste)} icon={<RefreshCw className="w-5 h-5" />} />
              <StatCard label="Saldo Caixa" value={formatCurrency(cashMovementTotals.saldo)} icon={<Wallet className="w-5 h-5" />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Esperado (caixa)" value={formatCurrency(cashClosingTotals.expected)} />
              <StatCard label="Declarado" value={formatCurrency(cashClosingTotals.declared)} />
              <StatCard label="Diferenca" value={formatCurrency(cashClosingTotals.difference)} deltaType={cashClosingTotals.difference === 0 ? "positive" : "negative"} />
            </div>

            <Card>
              <SectionHeader title="Movimentos de Caixa" className="mb-4" />
              <DataTable
                columns={[
                  { key: "data", header: "Data", render: (m) => new Date(m.created_at).toLocaleString("pt-BR") },
                  { key: "operador", header: "Operador", render: (m) => nameOf(m.profiles) ?? "-" },
                  { key: "guiche", header: "Guiche", render: (m) => { const b = boothOf(m.booths); return b ? `${b.code} - ${b.name}` : "-"; } },
                  { key: "tipo", header: "Tipo", render: (m) => <Badge variant="neutral">{m.movement_type}</Badge> },
                  { key: "valor", header: "Valor", render: (m) => <span className="font-semibold">{formatCurrency(Number(m.amount))}</span> },
                  { key: "obs", header: "Obs", render: (m) => m.note ?? "-" },
                ]}
                rows={cashMovementRows.slice(0,100)}
                emptyMessage="Nenhum movimento de caixa."
              />
            </Card>

            <Card>
              <SectionHeader title="Fechamento de Caixa por Turno" className="mb-4" />
              <DataTable
                columns={[
                  { key: "data", header: "Data", render: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
                  { key: "operador", header: "Operador", render: (r) => nameOf(r.profiles) ?? "-" },
                  { key: "guiche", header: "Guiche", render: (r) => { const b = boothOf(r.booths); return b ? `${b.code} - ${b.name}` : "-"; } },
                  { key: "esperado", header: "Esperado", render: (r) => formatCurrency(Number(r.expected_cash)) },
                  { key: "declarado", header: "Declarado", render: (r) => formatCurrency(Number(r.declared_cash)) },
                  { key: "diferenca", header: "Diferenca", render: (r) => { const diff = Number(r.difference); return <span className={diff===0?"text-emerald-600":"text-amber-600 font-semibold"}>{formatCurrency(diff)}</span>; } },
                  { key: "obs", header: "Obs", render: (r) => r.note ?? "-" },
                ]}
                rows={shiftCashClosingRows.slice(0,100)}
                emptyMessage="Nenhum fechamento de caixa."
              />
            </Card>
          </>
        )}

        {/* RELATORIOS */}
        {show("relatorios") && (
          <Card>
            <SectionHeader title="Log de Auditoria" className="mb-4" />
            <DataTable
              columns={[
                { key: "data", header: "Data", render: (a) => new Date(a.created_at).toLocaleString("pt-BR") },
                { key: "usuario", header: "Usuario", render: (a) => nameOf(a.profiles) ?? "-" },
                { key: "acao", header: "Acao", render: (a) => <Badge variant="info">{a.action}</Badge> },
                { key: "entidade", header: "Entidade", render: (a) => a.entity ?? "-" },
              ]}
              rows={auditLogs}
              emptyMessage="Nenhum log de auditoria."
            />
          </Card>
        )}

        {/* USUARIOS */}
        {show("usuarios") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cadastrar Usuario */}
              <SectionCard title="Cadastrar / Atualizar Usuario">
                <form onSubmit={saveProfile} className="space-y-4">
                  <Input value={newProfileUserId} onChange={e=>setNewProfileUserId(e.target.value)} required placeholder="UUID do usuario (auth.users.id)" />
                  <Input value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} required placeholder="Nome completo" />
                  <Input value={newProfileCpf} onChange={e=>setNewProfileCpf(e.target.value)} placeholder="CPF" />
                  <Input value={newProfilePhone} onChange={e=>setNewProfilePhone(e.target.value)} placeholder="Telefone" />
                  <Input value={newProfileAddress} onChange={e=>setNewProfileAddress(e.target.value)} placeholder="Endereco" />
                  <Input value={newProfileAvatarUrl} onChange={e=>setNewProfileAvatarUrl(e.target.value)} placeholder="URL avatar" />
                  <select value={newProfileRole} onChange={e=>setNewProfileRole(e.target.value as "admin"|"operator")} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="operator">Operador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={newProfileActive} onChange={e=>setNewProfileActive(e.target.checked)} className="rounded" />
                    Usuario ativo
                  </label>
                  <Button type="submit" className="w-full">Salvar Usuario</Button>
                </form>
              </SectionCard>

              {/* Reset Password */}
              <SectionCard title="Redefinicao de Senha">
                <form onSubmit={sendResetLink} className="space-y-4">
                  <Input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} required type="email" placeholder="E-mail do usuario" />
                  <Button type="submit" className="w-full">Enviar Link de Redefinicao</Button>
                </form>
              </SectionCard>
            </div>

            {/* Lista usuarios */}
            <SectionCard title="Usuarios Cadastrados">
              <Input value={profileSearch} onChange={e=>setProfileSearch(e.target.value)} placeholder="Buscar por nome, CPF ou perfil..." className="mb-4" />
              <DataTable
                columns={[
                  { key: "nome", header: "Nome", render: (p) => <span className="font-semibold">{p.full_name}</span> },
                  { key: "cpf", header: "CPF", render: (p) => p.cpf ?? "-" },
                  { key: "telefone", header: "Telefone", render: (p) => p.phone ?? "-" },
                  { key: "perfil", header: "Perfil", render: (p) => <Badge variant="info">{p.role}</Badge> },
                  { key: "status", header: "Status", render: (p) => <StatusBadge active={p.active} /> },
                  { key: "acao", header: "Acao", render: (p) => (
                    <Button variant="ghost" size="sm" onClick={()=>toggleProfileActive(p)}>{p.active?"Inativar":"Ativar"}</Button>
                  ) },
                ]}
                rows={filteredProfiles}
                emptyMessage="Nenhum usuario encontrado."
              />
            </SectionCard>
          </div>
        )}

        {/* EMPRESAS */}
        {show("empresas") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cadastrar Empresa */}
              <SectionCard title="Cadastrar Nova Empresa">
                <form onSubmit={createCompany} className="space-y-4">
                  <Input value={companyName} onChange={e=>setCompanyName(e.target.value)} required placeholder="Nome da empresa / viacao" />
                  <Input value={companyPct} onChange={e=>setCompanyPct(e.target.value)} required type="number" min="0" step="0.001" placeholder="% Comissao Central" />
                  <Button type="submit" className="w-full">Cadastrar Empresa</Button>
                </form>
              </SectionCard>

              {/* Cadastrar Guiche */}
              <SectionCard title="Cadastrar Novo Guiche">
                <form onSubmit={createBooth} className="space-y-4">
                  <Input value={boothCode} onChange={e=>setBoothCode(e.target.value)} required placeholder="Codigo (ex: G02)" />
                  <Input value={boothName} onChange={e=>setBoothName(e.target.value)} required placeholder="Nome (ex: Guiche 02)" />
                  <Button type="submit" className="w-full">Cadastrar Guiche</Button>
                </form>
              </SectionCard>
            </div>

            {/* Lista empresas */}
            <SectionCard title="Empresas / Viacoes">
              <DataTable
                columns={[
                  { key: "nome", header: "Nome", render: (c) => 
                    editingCompanyId === c.id ? (
                      <input
                        value={editingCompanyName}
                        onChange={(e) => setEditingCompanyName(e.target.value)}
                        className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-full"
                        autoFocus
                      />
                    ) : <span className="font-semibold">{c.name}</span>
                  },
                  { key: "comissao", header: "Comissao Central", render: (c) => 
                    editingCompanyId === c.id ? (
                      <input
                        value={editingCompanyPct}
                        onChange={(e) => setEditingCompanyPct(e.target.value)}
                        type="number"
                        step="0.001"
                        className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-20"
                      />
                    ) : `${getCompanyPct(c).toFixed(3)}%`
                  },
                  { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
                  { key: "acao", header: "Acao", render: (c) => 
                    editingCompanyId === c.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={saveEditCompany}><Check className="w-4 h-4 text-emerald-400" /></Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditCompany}><X className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={()=>startEditCompany(c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={()=>toggleCompanyActive(c)}>{c.active?"Inativar":"Ativar"}</Button>
                      </div>
                    )
                  },
                ]}
                rows={companies}
                emptyMessage="Nenhuma empresa cadastrada."
              />
            </SectionCard>

            {/* Lista guiches */}
            <SectionCard title="Guiches de Venda">
              <Input value={boothSearch} onChange={e=>setBoothSearch(e.target.value)} placeholder="Buscar guiche..." className="mb-4" />
              <DataTable
                columns={[
                  { key: "codigo", header: "Codigo", render: (b) => 
                    editingBoothId === b.id ? (
                      <input
                        value={editingBoothCode}
                        onChange={(e) => setEditingBoothCode(e.target.value)}
                        className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-16"
                        autoFocus
                      />
                    ) : <span className="font-bold">{b.code}</span>
                  },
                  { key: "nome", header: "Nome", render: (b) => 
                    editingBoothId === b.id ? (
                      <input
                        value={editingBoothName}
                        onChange={(e) => setEditingBoothName(e.target.value)}
                        className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-full"
                      />
                    ) : b.name
                  },
                  { key: "status", header: "Status", render: (b) => <StatusBadge active={b.active} /> },
                  { key: "acao", header: "Acao", render: (b) => 
                    editingBoothId === b.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={saveEditBooth}><Check className="w-4 h-4 text-emerald-400" /></Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditBooth}><X className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={()=>startEditBooth(b)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={()=>toggleBoothActive(b)}>{b.active?"Inativar":"Ativar"}</Button>
                      </div>
                    )
                  },
                ]}
                rows={filteredBooths}
                emptyMessage="Nenhum guiche cadastrado."
              />
            </SectionCard>
          </div>
        )}

        {/* CONFIGURACOES */}
        {show("configuracoes") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vinculos Operador - Guiche */}
              <SectionCard title="Vinculos Operador - Guiche" action={
                <form onSubmit={linkOperatorToBooth} className="flex gap-2">
                  <select className="px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground" value={selectedOperatorId} onChange={e=>setSelectedOperatorId(e.target.value)} required>
                    <option value="">Operador</option>
                    {profiles.filter(p=>p.role==="operator").map(p=><option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                  </select>
                  <select className="px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground" value={selectedBoothId} onChange={e=>setSelectedBoothId(e.target.value)} required>
                    <option value="">Guiche</option>
                    {booths.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                  </select>
                  <Button type="submit">Vincular</Button>
                </form>
              }>
                <DataTable
                  columns={[
                    { key: "operador", header: "Operador", render: (l) => nameOf(l.profiles) ?? "-" },
                    { key: "guiche", header: "Guiche", render: (l) => { const b = boothOf(l.booths); return b ? `${b.code} - ${b.name}` : "-"; } },
                    { key: "status", header: "Status", render: (l) => <StatusBadge active={l.active} /> },
                    { key: "acao", header: "Acao", render: (l) => (
                      <Button variant="ghost" size="sm" onClick={async()=>{ await supabase.from("operator_booths").update({active:!l.active}).eq("id",l.id); await refreshData(); }}>
                        {l.active ? "Desvincular" : "Reativar"}
                      </Button>
                    ) },
                  ]}
                  rows={operatorBoothLinks}
                  emptyMessage="Nenhum vinculo encontrado."
                />
              </SectionCard>

              {/* Categorias */}
              <SectionCard title="Categorias de Transacao">
                <form onSubmit={createCategory} className="flex gap-2 mb-4">
                  <input value={categoryName} onChange={e=>setCategoryName(e.target.value)} required placeholder="Nome da categoria" className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <Button type="submit">+</Button>
                </form>
                <DataTable
                  columns={[
                    { key: "nome", header: "Nome", render: (c) => 
                      editingCategoryId === c.id ? (
                        <input
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-full"
                          autoFocus
                        />
                      ) : c.name
                    },
                    { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
                    { key: "acao", header: "Acao", render: (c) => 
                      editingCategoryId === c.id ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={saveEditCategory}><Check className="w-4 h-4 text-emerald-400" /></Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditCategory}><X className="w-4 h-4 text-red-400" /></Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={()=>startEditCategory(c)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={()=>toggleCategoryActive(c)}>{c.active?"Inativar":"Ativar"}</Button>
                        </div>
                      )
                    },
                  ]}
                  rows={categories}
                  emptyMessage="Nenhuma categoria encontrada."
                />
              </SectionCard>
            </div>

            {/* Subcategorias */}
            <SectionCard title="Subcategorias de Transacao">
              <form onSubmit={createSubcategory} className="flex flex-wrap gap-2 mb-4">
                <select value={subcategoryCategoryId} onChange={e=>setSubcategoryCategoryId(e.target.value)} required className="px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground">
                  <option value="">Categoria pai</option>
                  {categories.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={subcategoryName} onChange={e=>setSubcategoryName(e.target.value)} required placeholder="Nome da subcategoria" className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <Button type="submit">+</Button>
              </form>
              <DataTable
                columns={[
                  { key: "nome", header: "Nome", render: (s) => 
                    editingSubcategoryId === s.id ? (
                      <input
                        value={editingSubcategoryName}
                        onChange={(e) => setEditingSubcategoryName(e.target.value)}
                        className="px-2 py-1 text-sm bg-input border border-border rounded text-foreground w-full"
                        autoFocus
                      />
                    ) : s.name
                  },
                  { key: "categoria", header: "Categoria", render: (s) => { const cat = s.transaction_categories; return Array.isArray(cat) ? cat[0]?.name : cat?.name ?? "-"; } },
                  { key: "status", header: "Status", render: (s) => <StatusBadge active={s.active} /> },
                  { key: "acao", header: "Acao", render: (s) => 
                    editingSubcategoryId === s.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={saveEditSubcategory}><Check className="w-4 h-4 text-emerald-400" /></Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditSubcategory}><X className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={()=>startEditSubcategory(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={()=>toggleSubcategoryActive(s)}>{s.active?"Inativar":"Ativar"}</Button>
                      </div>
                    )
                  },
                ]}
                rows={subcategories.slice(0,20)}
                emptyMessage="Nenhuma subcategoria encontrada."
              />
            </SectionCard>
          </div>
        )}
      </div>
    </RebuildShell>
  );
}
