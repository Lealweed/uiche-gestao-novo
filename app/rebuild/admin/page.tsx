"use client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminArea, canAccessAdminSection, getDefaultAdminSectionForRole, getHomeRouteForRole, type AppRole } from "@/lib/rbac";

import { AdminAttendanceSection } from "@/components/rebuild/admin/admin-attendance-section";
import { AdminCompaniesSection } from "@/components/rebuild/admin/admin-companies-section";
import { AdminDashboardSection } from "@/components/rebuild/admin/admin-dashboard-section";
import { AdminFinanceSection } from "@/components/rebuild/admin/admin-finance-section";
import { SectionCard, StatusBadge } from "@/components/rebuild/admin/admin-common";
import { AdminMessagesSection } from "@/components/rebuild/admin/admin-messages-section";
import { AdminOperatorsSection } from "@/components/rebuild/admin/admin-operators-section";
import { AdminPageHeader } from "@/components/rebuild/admin/admin-page-header";
import { AdminReportsSection } from "@/components/rebuild/admin/admin-reports-section";
import { AdminSettingsSection } from "@/components/rebuild/admin/admin-settings-section";
import { AdminUsersSection } from "@/components/rebuild/admin/admin-users-section";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { Input } from "@/components/rebuild/ui/input";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Card } from "@/components/rebuild/ui/card";
import { Toast, type ToastType } from "@/components/rebuild/ui/toast";
import { ConfirmDialog } from "@/components/rebuild/ui/confirm-dialog";
import { Breadcrumb } from "@/components/rebuild/ui/breadcrumb";
import { SkeletonTable } from "@/components/rebuild/ui/skeleton";
import { exportToCSV } from "@/lib/csv-export";
import { ADMIN_CHART_COLORS, boothOf, formatCurrency, getCompanyPct, nameOf } from "@/lib/admin/admin-helpers";
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
  Power,
  Trash2,
  Filter,
  SortAsc,
  SortDesc,
  MoreVertical,
  Radio,
  CircleDot,
  MessageSquare,
  Send,
  Eye,
  CheckCheck,
} from "lucide-react";

const supabase = createClient();

type ShiftTotal = {
  shift_id: string; booth_name: string; operator_name: string;
  status: "open" | "closed"; gross_amount: string; commission_amount: string;
  total_pix: string; total_credit: string; total_debit: string; total_cash: string;
  missing_card_receipts: number;
};
type Company = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null; active: boolean };
type Booth   = { id: string; code: string; name: string; active: boolean };
type Profile = { user_id: string; full_name: string; cpf: string|null; address: string|null; phone: string|null; avatar_url: string|null; role: AppRole; active: boolean };
type Category    = { id: string; name: string; active: boolean };
type Subcategory = { id: string; name: string; active: boolean; category_id: string; transaction_categories?: { name: string }|{ name: string }[]|null };
type OperatorBoothLink = { id: string; active: boolean; operator_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { name: string; code: string }|{ name: string; code: string }[]|null };
type AuditLog  = { id: string; action: string; entity: string|null; details: Record<string,unknown>; created_at: string; created_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null };
type Adjustment = { id: string; transaction_id: string; reason: string; status: "pending"|"approved"|"rejected"; created_at: string; requested_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null; transactions: { amount: number; payment_method: string; companies: { name: string }|{ name: string }[]|null }|null };
type TxForReport = { id: string; status?: string; amount: number; sold_at?: string; payment_method?: string; operator_id?: string; booth_id?: string; company_id?: string; category_id?: string; subcategory_id?: string; profiles?: { full_name: string }|{ full_name: string }[]|null; booths?: { name: string; code: string }|{ name: string; code: string }[]|null; companies?: { name: string }|{ name: string }[]|null; transaction_categories: { name: string }|{ name: string }[]|null; transaction_subcategories: { name: string }|{ name: string }[]|null };
type TimePunchRow = { id: string; punch_type: string; punched_at: string; note: string|null; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type CashMovementRow = { id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type ShiftCashClosingRow = { id: string; expected_cash: number; declared_cash: number; difference: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type MenuSection = "dashboard"|"operadores"|"gestao"|"financeiro"|"relatorios"|"usuarios"|"empresas"|"configuracoes"|"mensagens"|"ponto";
type OperatorMessage = { id: string; message: string; read: boolean; created_at: string; operator_id: string; profiles: { full_name: string }|{ full_name: string }[]|null };
type AttendanceRow = { id: string; user_id: string; clock_in: string; clock_out: string | null; full_name: string };

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
  const [newProfileRole, setNewProfileRole]           = useState<AppRole>("operator");
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

  // Estados de confirmacao
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", variant: "danger", onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Estado de loading
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Estados de mensagens dos operadores
  const [operatorMessages, setOperatorMessages] = useState<OperatorMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole | "">("");
  const currentRoleRef = useRef<AppRole | "">("");
  currentRoleRef.current = currentRole;
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-refresh every 60 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshData();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");
      const { data: p } = await supabase.from("profiles").select("role,active").eq("user_id", data.user.id).single();
      const role = (p as { role?: string; active?: boolean } | null)?.role ?? "";
      const isActive = (p as { role?: string; active?: boolean } | null)?.active !== false;
      const destination = getHomeRouteForRole(role);

      if (!isActive) {
        await supabase.auth.signOut();
        return router.replace("/login");
      }

      if (!destination) {
        await supabase.auth.signOut();
        return router.replace("/login");
      }

      if (!canAccessAdminArea(role)) return router.replace(destination);

      setCurrentRole(role as AppRole);
      if (getDefaultAdminSectionForRole(role) === "financeiro") {
        setMenu("financeiro");
        if (typeof window !== "undefined" && !window.location.hash) {
          router.replace("/rebuild/admin#financeiro");
        }
      }

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
        "mensagens": "mensagens",
        "folha-de-ponto": "ponto",
      };
      const resolvedSection = map[section];
      if (resolvedSection) {
        if (!canAccessAdminSection(currentRoleRef.current || "admin", resolvedSection)) {
          const fallback = getDefaultAdminSectionForRole(currentRoleRef.current) as MenuSection;
          setToastType("warning");
          setMessage("Perfil financeiro com acesso concentrado em Dashboard, Financeiro e Relatorios.");
          setMenu(fallback);
          return;
        }
        setMenu(resolvedSection);
        if (section === "mensagens") setTimeout(() => loadOperatorMessages(), 200);
        if (section === "folha-de-ponto") setTimeout(() => loadAttendance(), 200);
      }
    }
    window.addEventListener("rebuild:section-change", handleSectionChange);
    const hash = window.location.hash.replace("#", "").trim();
    if (hash) {
      handleSectionChange(new CustomEvent("rebuild:section-change", { detail: hash }) as Event);
    }
    return () => window.removeEventListener("rebuild:section-change", handleSectionChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string,unknown>) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({ created_by: data.user.id, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });
  }

  async function refreshData(from?: string, to?: string) {
    setLoading(true);
    setIsLoading(true);
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
    } finally { setLoading(false); setIsLoading(false); setLastUpdate(new Date()); }
  }

  // ===== FUNCOES MENSAGENS OPERADORES =====
  const loadOperatorMessages = useCallback(async () => {
    const profileMap = new Map(profilesRef.current.map(p => [p.user_id, p.full_name]));
    const { data, error } = await supabase
      .from("operator_messages")
      .select("id, message, read, created_at, operator_id")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (!error && data) {
      const hydratedMessages = data.map((m: { id: string; message: string; read: boolean; created_at: string; operator_id: string }) => ({
        ...m,
        profiles: { full_name: profileMap.get(m.operator_id) ?? "Operador" }
      }));
      setOperatorMessages(hydratedMessages);
      setUnreadCount(hydratedMessages.filter((m: OperatorMessage) => !m.read).length);
    }
  }, []);

  // Realtime: escutar operator_messages (inserts de qualquer operador)
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_messages" }, (payload) => {
        const raw = payload.new as { id: string; message: string; read: boolean; created_at: string; operator_id: string };
        const profileMap = new Map(profilesRef.current.map(p => [p.user_id, p.full_name]));
        const hydrated: OperatorMessage = { ...raw, profiles: { full_name: profileMap.get(raw.operator_id) ?? "Operador" } };
        setOperatorMessages(prev => [hydrated, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (menuRef.current !== "mensagens") {
          setToastType("info");
          setMessage(`Nova mensagem de ${hydrated.profiles && !Array.isArray(hydrated.profiles) ? hydrated.profiles.full_name : "Operador"}.`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markMessageAsRead(msgId: string) {
    await supabase.from("operator_messages").update({ read: true }).eq("id", msgId);
    setOperatorMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllMessagesAsRead() {
    await supabase.from("operator_messages").update({ read: true }).eq("read", false);
    setOperatorMessages(prev => prev.map(m => ({ ...m, read: true })));
    setUnreadCount(0);
    setToastType("success");
    setMessage("Todas as mensagens foram marcadas como lidas.");
  }

  // ===== FUNCOES FOLHA DE PONTO =====
  async function loadAttendance() {
    const profileMap = new Map(profilesRef.current.map(p => [p.user_id, p.full_name]));
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const { data, error } = await supabase
      .from("user_attendance")
      .select("id, user_id, clock_in, clock_out")
      .gte("clock_in", today.toISOString())
      .lt("clock_in", tomorrow.toISOString())
      .order("clock_in", { ascending: true });
    if (!error && data) {
      setAttendanceRows(
        (data as { id: string; user_id: string; clock_in: string; clock_out: string | null }[]).map(r => ({
          ...r,
          full_name: profileMap.get(r.user_id) ?? "Operador",
        }))
      );
    }
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
      { name: "PIX", value: methods.pix, color: ADMIN_CHART_COLORS.primary },
      { name: "Credito", value: methods.credito, color: ADMIN_CHART_COLORS.purple },
      { name: "Debito", value: methods.debito, color: ADMIN_CHART_COLORS.cyan },
      { name: "Dinheiro", value: methods.dinheiro, color: ADMIN_CHART_COLORS.success },
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
      fill: [ADMIN_CHART_COLORS.primary, ADMIN_CHART_COLORS.secondary, ADMIN_CHART_COLORS.success, ADMIN_CHART_COLORS.purple, ADMIN_CHART_COLORS.cyan][i] || ADMIN_CHART_COLORS.primary,
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

  function confirmToggleCompany(c: Company) {
    setConfirmDialog({
      open: true,
      title: c.active ? "Inativar Empresa" : "Reativar Empresa",
      description: `Tem certeza que deseja ${c.active ? "inativar" : "reativar"} a empresa "${c.name}"?`,
      variant: c.active ? "warning" : "info",
      onConfirm: async () => {
        await supabase.from("companies").update({ active: !c.active }).eq("id", c.id);
        await refreshData();
        setToastType("success");
        setMessage(`Empresa ${c.active ? "inativada" : "reativada"} com sucesso!`);
      },
    });
  }

  function confirmToggleBooth(b: Booth) {
    setConfirmDialog({
      open: true,
      title: b.active ? "Inativar Guiche" : "Reativar Guiche",
      description: `Tem certeza que deseja ${b.active ? "inativar" : "reativar"} o guiche "${b.code} - ${b.name}"?`,
      variant: b.active ? "warning" : "info",
      onConfirm: async () => {
        await supabase.from("booths").update({ active: !b.active }).eq("id", b.id);
        await refreshData();
        setToastType("success");
        setMessage(`Guiche ${b.active ? "inativado" : "reativado"} com sucesso!`);
      },
    });
  }

  function confirmToggleProfile(p: Profile) {
    setConfirmDialog({
      open: true,
      title: p.active ? "Inativar Usuario" : "Reativar Usuario",
      description: `Tem certeza que deseja ${p.active ? "inativar" : "reativar"} o usuario "${p.full_name}"?`,
      variant: p.active ? "danger" : "info",
      onConfirm: async () => {
        await supabase.from("profiles").update({ active: !p.active }).eq("user_id", p.user_id);
        await refreshData();
        setToastType("success");
        setMessage(`Usuario ${p.active ? "inativado" : "reativado"} com sucesso!`);
      },
    });
  }

  function confirmToggleCategory(c: Category) {
    setConfirmDialog({
      open: true,
      title: c.active ? "Inativar Categoria" : "Reativar Categoria",
      description: `Tem certeza que deseja ${c.active ? "inativar" : "reativar"} a categoria "${c.name}"?`,
      variant: c.active ? "warning" : "info",
      onConfirm: async () => {
        await supabase.from("transaction_categories").update({ active: !c.active }).eq("id", c.id);
        await refreshData();
        setToastType("success");
        setMessage(`Categoria ${c.active ? "inativada" : "reativada"} com sucesso!`);
      },
    });
  }

  function confirmToggleSubcategory(s: Subcategory) {
    setConfirmDialog({
      open: true,
      title: s.active ? "Inativar Subcategoria" : "Reativar Subcategoria",
      description: `Tem certeza que deseja ${s.active ? "inativar" : "reativar"} a subcategoria "${s.name}"?`,
      variant: s.active ? "warning" : "info",
      onConfirm: async () => {
        await supabase.from("transaction_subcategories").update({ active: !s.active }).eq("id", s.id);
        await refreshData();
        setToastType("success");
        setMessage(`Subcategoria ${s.active ? "inativada" : "reativada"} com sucesso!`);
      },
    });
  }

  async function handleConfirmAction() {
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  }

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

  const menuLabels: Record<MenuSection, string> = {
    dashboard: "Dashboard",
    operadores: "Controle de Turno",
    financeiro: "Financeiro",
    relatorios: "Relatorios",
    gestao: "Gestao",
    usuarios: "Usuarios",
    empresas: "Empresas",
    configuracoes: "Configuracoes",
    mensagens: "Mensagens",
    ponto: "Folha de Ponto",
  };

  return (
    <RebuildShell>
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Central Viagens", onClick: () => setMenu("dashboard") },
          { label: menuLabels[menu] },
        ]}
        className="mb-4"
      />

      {/* Header */}
      <AdminPageHeader
        title={menuLabels[menu]}
        lastUpdate={lastUpdate}
        autoRefresh={autoRefresh}
        loading={loading}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onRefresh={() => refreshData()}
        onExport={handleExportCSV}
      />

      {/* Global message */}
      <Toast message={message} type={toastType} onClose={() => setMessage(null)} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        loading={confirmLoading}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      {/* Main content - No duplicate menu! */}
      <div className="space-y-6">
        {/* DASHBOARD */}
        {show("dashboard") && (
          <AdminDashboardSection
            isLoading={isLoading}
            isMounted={isMounted}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApplyFilters={() => refreshData()}
            onClearFilters={() => {
              setDateFrom("");
              setDateTo("");
              refreshData("", "");
            }}
            repassesComputed={repassesComputed}
            reportTxCount={reportTxs.length}
            summary={summary}
            dailyRevenueData={dailyRevenueData}
            paymentMethodData={paymentMethodData}
            topCompaniesData={topCompaniesData}
            adjustmentsCount={adjustments.length}
            auditLogsCount={auditLogs.length}
            cashSaldo={cashMovementTotals.saldo}
            rows={rows}
            adjustments={adjustments}
            onExportCSV={handleExportCSV}
            onForceCloseShift={forceCloseShift}
            onApproveAdjustment={approveAdjustment}
            onRejectAdjustment={rejectAdjustment}
          />
        )}

        {/* OPERADORES */}
        {show("operadores") && (
          <AdminOperatorsSection
            timePunchRows={timePunchRows}
            punchPage={punchPage}
            punchPerPage={PUNCH_PER_PAGE}
            onPreviousPage={() => setPunchPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPunchPage((p) => p + 1)}
          />
        )}

        {/* FINANCEIRO */}
{show("financeiro") && (
          <AdminFinanceSection
            dateFrom={dateFrom}
            dateTo={dateTo}
            cashMovementTotals={cashMovementTotals}
            cashClosingTotals={cashClosingTotals}
            cashMovementRows={cashMovementRows}
            shiftCashClosingRows={shiftCashClosingRows}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApplyFilters={() => refreshData()}
            onClearFilters={() => {
              setDateFrom("");
              setDateTo("");
              refreshData("", "");
            }}
          />
        )}

        {/* RELATORIOS */}
        {show("relatorios") && <AdminReportsSection auditLogs={auditLogs} />}

        {/* USUARIOS */}
        {show("usuarios") && (
          <AdminUsersSection
            newProfileUserId={newProfileUserId}
            newProfileName={newProfileName}
            newProfileCpf={newProfileCpf}
            newProfilePhone={newProfilePhone}
            newProfileAddress={newProfileAddress}
            newProfileAvatarUrl={newProfileAvatarUrl}
            newProfileRole={newProfileRole}
            newProfileActive={newProfileActive}
            resetEmail={resetEmail}
            profileSearch={profileSearch}
            filteredProfiles={filteredProfiles}
            onNewProfileUserIdChange={(e) => setNewProfileUserId(e.target.value)}
            onNewProfileNameChange={(e) => setNewProfileName(e.target.value)}
            onNewProfileCpfChange={(e) => setNewProfileCpf(e.target.value)}
            onNewProfilePhoneChange={(e) => setNewProfilePhone(e.target.value)}
            onNewProfileAddressChange={(e) => setNewProfileAddress(e.target.value)}
            onNewProfileAvatarUrlChange={(e) => setNewProfileAvatarUrl(e.target.value)}
            onNewProfileRoleChange={(e) => setNewProfileRole(e.target.value as AppRole)}
            onNewProfileActiveChange={(e) => setNewProfileActive(e.target.checked)}
            onResetEmailChange={(e) => setResetEmail(e.target.value)}
            onProfileSearchChange={(e) => setProfileSearch(e.target.value)}
            onSaveProfile={saveProfile}
            onSendResetLink={sendResetLink}
            onToggleProfile={confirmToggleProfile}
          />
        )}

        {/* EMPRESAS */}
        {show("empresas") && (
          <AdminCompaniesSection
            companyName={companyName}
            companyPct={companyPct}
            boothCode={boothCode}
            boothName={boothName}
            boothSearch={boothSearch}
            companies={companies}
            filteredBooths={filteredBooths}
            editingCompanyId={editingCompanyId}
            editingCompanyName={editingCompanyName}
            editingCompanyPct={editingCompanyPct}
            editingBoothId={editingBoothId}
            editingBoothCode={editingBoothCode}
            editingBoothName={editingBoothName}
            onCompanyNameChange={(e) => setCompanyName(e.target.value)}
            onCompanyPctChange={(e) => setCompanyPct(e.target.value)}
            onBoothCodeChange={(e) => setBoothCode(e.target.value)}
            onBoothNameChange={(e) => setBoothName(e.target.value)}
            onBoothSearchChange={(e) => setBoothSearch(e.target.value)}
            onEditingCompanyNameChange={(e) => setEditingCompanyName(e.target.value)}
            onEditingCompanyPctChange={(e) => setEditingCompanyPct(e.target.value)}
            onEditingBoothCodeChange={(e) => setEditingBoothCode(e.target.value)}
            onEditingBoothNameChange={(e) => setEditingBoothName(e.target.value)}
            onCreateCompany={createCompany}
            onCreateBooth={createBooth}
            onStartEditCompany={startEditCompany}
            onSaveEditCompany={saveEditCompany}
            onCancelEditCompany={cancelEditCompany}
            onToggleCompany={confirmToggleCompany}
            onStartEditBooth={startEditBooth}
            onSaveEditBooth={saveEditBooth}
            onCancelEditBooth={cancelEditBooth}
            onToggleBooth={confirmToggleBooth}
          />
        )}

        {/* CONFIGURACOES */}
        {show("configuracoes") && (
          <AdminSettingsSection
            selectedOperatorId={selectedOperatorId}
            selectedBoothId={selectedBoothId}
            categoryName={categoryName}
            subcategoryName={subcategoryName}
            subcategoryCategoryId={subcategoryCategoryId}
            profiles={profiles}
            booths={booths}
            categories={categories}
            subcategories={subcategories}
            operatorBoothLinks={operatorBoothLinks}
            editingCategoryId={editingCategoryId}
            editingCategoryName={editingCategoryName}
            editingSubcategoryId={editingSubcategoryId}
            editingSubcategoryName={editingSubcategoryName}
            onSelectedOperatorChange={(e) => setSelectedOperatorId(e.target.value)}
            onSelectedBoothChange={(e) => setSelectedBoothId(e.target.value)}
            onCategoryNameChange={(e) => setCategoryName(e.target.value)}
            onSubcategoryNameChange={(e) => setSubcategoryName(e.target.value)}
            onSubcategoryCategoryChange={(e) => setSubcategoryCategoryId(e.target.value)}
            onEditingCategoryNameChange={(e) => setEditingCategoryName(e.target.value)}
            onEditingSubcategoryNameChange={(e) => setEditingSubcategoryName(e.target.value)}
            onLinkOperatorToBooth={linkOperatorToBooth}
            onCreateCategory={createCategory}
            onCreateSubcategory={createSubcategory}
            onToggleOperatorBoothLink={async (link) => {
              await supabase.from("operator_booths").update({ active: !link.active }).eq("id", link.id);
              await refreshData();
            }}
            onStartEditCategory={startEditCategory}
            onSaveEditCategory={saveEditCategory}
            onCancelEditCategory={cancelEditCategory}
            onToggleCategory={confirmToggleCategory}
            onStartEditSubcategory={startEditSubcategory}
            onSaveEditSubcategory={saveEditSubcategory}
            onCancelEditSubcategory={cancelEditSubcategory}
            onToggleSubcategory={confirmToggleSubcategory}
          />
        )}

        {/* ===== MENSAGENS DOS OPERADORES ===== */}
        {show("mensagens") && (
          <AdminMessagesSection
            unreadCount={unreadCount}
            operatorMessages={operatorMessages}
            isMounted={isMounted}
            onRefresh={loadOperatorMessages}
            onMarkAllRead={markAllMessagesAsRead}
            onMarkAsRead={markMessageAsRead}
          />
        )}

        {/* ===== FOLHA DE PONTO ===== */}
        {show("ponto") && (
          <AdminAttendanceSection
            attendanceRows={attendanceRows}
            isMounted={isMounted}
            onRefresh={loadAttendance}
          />
        )}
      </div>
    </RebuildShell>
  );
}
