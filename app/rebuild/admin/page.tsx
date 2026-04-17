"use client";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminArea, canAccessAdminSection, getDefaultAdminSectionForRole, getHomeRouteForRole, type AppRole } from "@/lib/rbac";
import { isSchemaToleranceError } from "@/lib/schema-tolerance";

import { AdminAttendanceSection } from "@/components/rebuild/admin/admin-attendance-section";
import { AdminCashClosingSection } from "@/components/rebuild/admin/admin-cash-closing-section";
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

import { Card } from "@/components/rebuild/ui/card";
import { Toast, type ToastType } from "@/components/rebuild/ui/toast";
import { ConfirmDialog } from "@/components/rebuild/ui/confirm-dialog";
import { Breadcrumb } from "@/components/rebuild/ui/breadcrumb";
import { SkeletonTable } from "@/components/rebuild/ui/skeleton";
import { exportToCSV } from "@/lib/csv-export";
import { ADMIN_CHART_COLORS, boothOf, formatCurrency, getCompanyPct, nameOf } from "@/lib/admin/admin-helpers";
import { getChatAttachmentUrl, uploadChatAttachment, validateChatAttachment } from "@/lib/chat-attachments";
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
  shift_id: string;
  booth_id?: string;
  operator_id?: string;
  booth_name: string;
  operator_name: string;
  opened_at?: string;
  closed_at?: string;
  status: "open" | "closed";
  gross_amount: string;
  commission_amount: string;
  total_pix: string;
  total_credit: string;
  total_debit: string;
  total_cash: string;
  missing_card_receipts: number;
};
type Company = {
  id: string;
  name: string;
  commission_percent?: number | null;
  comission_percent?: number | null;
  dia_repasse?: number | null;
  payout_days?: number | null;
  active: boolean;
};
type Booth   = { id: string; code: string; name: string; active: boolean };
type Profile = { user_id: string; full_name: string; email?: string | null; cpf: string|null; address: string|null; phone: string|null; avatar_url: string|null; role: AppRole; active: boolean };
type Category    = { id: string; name: string; active: boolean };
type Subcategory = { id: string; name: string; active: boolean; category_id: string; transaction_categories?: { name: string }|{ name: string }[]|null };
type OperatorBoothLink = { id: string; active: boolean; operator_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { name: string; code: string }|{ name: string; code: string }[]|null };
type AuditLog  = { id: string; action: string; entity: string|null; details: Record<string,unknown>; created_at: string; created_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null };
type Adjustment = { id: string; transaction_id: string; reason: string; status: "pending"|"approved"|"rejected"; created_at: string; requested_by?: string; profiles: { full_name: string }|{ full_name: string }[]|null; transactions: { amount: number; payment_method: string; companies: { name: string }|{ name: string }[]|null }|null };
type TxForReport = { id: string; status?: string; amount: number; sold_at?: string; payment_method?: string; operator_id?: string; booth_id?: string; company_id?: string; category_id?: string; subcategory_id?: string; boarding_tax_state?: number | null; boarding_tax_federal?: number | null; profiles?: { full_name: string }|{ full_name: string }[]|null; booths?: { name: string; code: string }|{ name: string; code: string }[]|null; companies?: { name: string }|{ name: string }[]|null; transaction_categories: { name: string }|{ name: string }[]|null; transaction_subcategories: { name: string }|{ name: string }[]|null };
type TimePunchRow = { id: string; punch_type: string; punched_at: string; note: string|null; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type CashMovementRow = { id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type ShiftCashClosingRow = { id: string; expected_cash: number; declared_cash: number; difference: number; note: string|null; created_at: string; user_id?: string; booth_id?: string; profiles: { full_name: string }|{ full_name: string }[]|null; booths: { code: string; name: string }|{ code: string; name: string }[]|null };
type DailyCashClosingRow = {
  id: string;
  office_id?: string;
  user_id?: string;
  date: string;
  company: string;
  total_sold: number;
  amount_pix: number;
  amount_card: number;
  amount_cash: number;
  ceia_amount?: number;
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
  profiles: { full_name: string }|{ full_name: string }[]|null;
  booths: { code: string; name: string }|{ code: string; name: string }[]|null;
};
type MenuSection = "dashboard"|"operadores"|"gestao"|"financeiro"|"fechamento-caixa"|"relatorios"|"usuarios"|"empresas"|"configuracoes"|"mensagens"|"ponto";
type OperatorMessage = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  operator_id: string;
  booth_id: string | null;
  sender_role: "operator" | "admin";
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  attachment_url?: string | null;
  profiles: { full_name: string }|{ full_name: string }[]|null;
  booths: { name: string; code: string }|{ name: string; code: string }[]|null;
};
type AttendanceRow = { id: string; user_id: string; clock_in: string; clock_out: string | null; full_name: string };
type BoardingTax = { id: string; name: string; amount: number; tax_type: "estadual" | "federal"; active: boolean; created_at?: string };
type MessageConversation = {
  operatorId: string;
  boothId: string | null;
  operatorName: string;
  boothName: string;
};

type FinanceByBoothSummary = {
  boothId: string;
  boothLabel: string;
  grossSales: number;
  txCount: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  cashSales: number;
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

const DEFAULT_BOARDING_TAXES: BoardingTax[] = [
  { id: "fallback-goiania", name: "Goiania", amount: 8.5, tax_type: "estadual", active: true },
  { id: "fallback-belem", name: "Belem", amount: 12, tax_type: "estadual", active: true },
];

export default function AdminRebuildPage() {
  const router = useRouter();
  const [rows, setRows]           = useState<ShiftTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths]       = useState<Booth[]>([]);
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [boardingTaxes, setBoardingTaxes] = useState<BoardingTax[]>([]);
  const [operatorBoothLinks, setOperatorBoothLinks] = useState<OperatorBoothLink[]>([]);
  const [auditLogs, setAuditLogs]           = useState<AuditLog[]>([]);
  const [timePunchRows, setTimePunchRows]   = useState<TimePunchRow[]>([]);
  const [cashMovementRows, setCashMovementRows] = useState<CashMovementRow[]>([]);
  const [shiftCashClosingRows, setShiftCashClosingRows] = useState<ShiftCashClosingRow[]>([]);
  const [dailyCashClosingRows, setDailyCashClosingRows] = useState<DailyCashClosingRow[]>([]);
  const [reportTxs, setReportTxs] = useState<TxForReport[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [message, setMessage]     = useState<string|null>(null);
  const [toastType, setToastType] = useState<ToastType>("info");
  const [menu, setMenu]           = useState<MenuSection>("dashboard");
  const [dateFrom, setDateFrom]   = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo]       = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [responsavelConferencia, setResponsavelConferencia] = useState("");
  const [dataAssinatura, setDataAssinatura] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoesFinais, setObservacoesFinais] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [boothSearch, setBoothSearch]     = useState("");
  const [companyName, setCompanyName]     = useState("");
  const [companyPct, setCompanyPct]       = useState("6");
  const [companyRepasseDay, setCompanyRepasseDay] = useState("");
  const [companyPayoutDays, setCompanyPayoutDays] = useState("0");
  const [boothCode, setBoothCode]         = useState("");
  const [boothName, setBoothName]         = useState("");
  const [categoryName, setCategoryName]   = useState("");
  const [subcategoryName, setSubcategoryName]         = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [boardingTaxName, setBoardingTaxName] = useState("");
  const [boardingTaxAmount, setBoardingTaxAmount] = useState("");
  const [boardingTaxType, setBoardingTaxType] = useState<BoardingTax["tax_type"]>("estadual");
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
  const [savingProfile, setSavingProfile]             = useState(false);
  const [sendingReset, setSendingReset]               = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [punchPage, setPunchPage] = useState(1);
  const PUNCH_PER_PAGE = 10;

  // Estados de edicao
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [editingBoardingTaxId, setEditingBoardingTaxId] = useState<string | null>(null);
  const [editingBoardingTaxName, setEditingBoardingTaxName] = useState("");
  const [editingBoardingTaxAmount, setEditingBoardingTaxAmount] = useState("");
  const [editingBoardingTaxType, setEditingBoardingTaxType] = useState<BoardingTax["tax_type"]>("estadual");
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState("");
  const [editingCompanyPct, setEditingCompanyPct] = useState("");
  const [editingCompanyRepasseDay, setEditingCompanyRepasseDay] = useState("");
  const [editingCompanyPayoutDays, setEditingCompanyPayoutDays] = useState("0");
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
  const [activeConversation, setActiveConversation] = useState<MessageConversation | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [adminReplyAttachment, setAdminReplyAttachment] = useState<File | null>(null);
  const [adminReplyAttachmentKey, setAdminReplyAttachmentKey] = useState(0);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole | "">("");
  const currentRoleRef = useRef<AppRole | "">("");
  currentRoleRef.current = currentRole;
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const boothsRef = useRef(booths);
  boothsRef.current = booths;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (activeConversation) return;

    const linkedConversation = operatorBoothLinks.find((link) => link.active && link.operator_id);
    if (linkedConversation?.operator_id) {
      setActiveConversation({
        operatorId: linkedConversation.operator_id,
        boothId: linkedConversation.booth_id ?? null,
        operatorName: nameOf(linkedConversation.profiles) ?? "Operador",
        boothName: boothOf(linkedConversation.booths)?.name ?? "Guiche",
      });
      return;
    }

    const firstMessage = operatorMessages[0];
    if (firstMessage) {
      setActiveConversation({
        operatorId: firstMessage.operator_id,
        boothId: firstMessage.booth_id,
        operatorName: nameOf(firstMessage.profiles) ?? "Operador",
        boothName: boothOf(firstMessage.booths)?.name ?? "Guiche",
      });
    }
  }, [activeConversation, operatorBoothLinks, operatorMessages]);

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
        "fechamento-caixa": "fechamento-caixa",
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

    const { error } = await supabase
      .from("audit_logs")
      .insert({ created_by: data.user.id, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });

    if (error && !isSchemaToleranceError(error)) {
      console.warn("Falha ao registrar auditoria admin:", error.message);
    }
  }

  async function loadVisibleProfiles() {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (accessToken) {
      try {
        const response = await fetch("/api/admin/users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as { users?: Profile[] };
          if (Array.isArray(payload.users)) {
            return payload.users;
          }
        }
      } catch {
        // fallback silencioso para a consulta direta em profiles
      }
    }

    const { data } = await supabase
      .from("profiles")
      .select("user_id,full_name,cpf,address,phone,avatar_url,role,active")
      .order("full_name");

    return (data as Profile[]) ?? [];
  }

  async function refreshData(from?: string, to?: string) {
    setLoading(true);
    setIsLoading(true);
    const f = from ?? dateFrom; const t = to ?? dateTo;
    const sI = f ? `${f}T00:00:00.000Z` : null;
    const eI = t ? `${t}T23:59:59.999Z` : null;
    try {
      let shiftQ = supabase.from("v_shift_totals").select("*").order("opened_at", { ascending: false }).limit(200);
      let txQ = supabase
        .from("transactions")
        .select("id,status,amount,sold_at,payment_method,operator_id,booth_id,company_id,category_id,subcategory_id,boarding_tax_state,boarding_tax_federal")
        .neq("status", "voided")
        .order("sold_at", { ascending: false })
        .limit(5000);
      let cashQ = supabase
        .from("cash_movements")
        .select("id,movement_type,amount,note,created_at,user_id,booth_id")
        .order("created_at", { ascending: false })
        .limit(5000);
      let closeQ = supabase
        .from("shift_cash_closings")
        .select("id,expected_cash,declared_cash,difference,note,created_at,user_id,booth_id")
        .order("created_at", { ascending: false })
        .limit(5000);
      let dailyCloseQ = supabase
        .from("daily_cash_closings")
        .select("id,office_id,user_id,date,company,total_sold,amount_pix,amount_card,amount_cash,ceia_amount,ceia_base,ceia_pix,ceia_debito,ceia_credito,ceia_link_estadual,ceia_link_interestadual,ceia_dinheiro,ceia_total_lancado,ceia_faltante,cash_net,status,notes,created_at")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000);

      if (sI) {
        shiftQ = shiftQ.gte("opened_at", sI);
        txQ = txQ.gte("sold_at", sI);
        cashQ = cashQ.gte("created_at", sI);
        closeQ = closeQ.gte("created_at", sI);
        dailyCloseQ = dailyCloseQ.gte("date", f);
      }

      if (eI) {
        shiftQ = shiftQ.lte("opened_at", eI);
        txQ = txQ.lte("sold_at", eI);
        cashQ = cashQ.lte("created_at", eI);
        closeQ = closeQ.lte("created_at", eI);
        dailyCloseQ = dailyCloseQ.lte("date", t);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [shiftRes,compRes,boothRes,profileRes,catRes,subRes,boardingTaxRes,linkRes,auditRes,punchRes,cashRes,closeRes,dailyCloseRes,txRes,adjRes,attendanceRes] = await Promise.all([
        shiftQ,
        supabase.from("companies").select("*").order("name"),
        supabase.from("booths").select("id,code,name,active").order("name"),
        loadVisibleProfiles(),
        supabase.from("transaction_categories").select("id,name,active").order("name"),
        supabase.from("transaction_subcategories").select("id,name,active,category_id").order("name"),
        supabase.from("boarding_taxes").select("id,name,amount,tax_type,active,created_at").order("tax_type").order("name"),
        supabase.from("operator_booths").select("id,active,operator_id,booth_id").limit(200),
        supabase.from("audit_logs").select("id,action,entity,details,created_at,created_by").order("created_at",{ascending:false}).limit(50),
        supabase.from("time_punches").select("id,punch_type,punched_at,note,user_id,booth_id").order("punched_at",{ascending:false}).limit(200),
        cashQ,
        closeQ,
        dailyCloseQ,
        txQ,
        supabase.from("adjustment_requests").select("id,transaction_id,reason,status,created_at,requested_by").eq("status","pending").order("created_at",{ascending:false}).limit(40),
        supabase.from("user_attendance").select("id,user_id,clock_in,clock_out").gte("clock_in", today.toISOString()).lt("clock_in", tomorrow.toISOString()).order("clock_in", { ascending: true }),
      ]);

      const shiftsData   = (shiftRes.data as ShiftTotal[]) ?? [];
      const companiesData= (compRes.data as Company[]) ?? [];
      const boothsData   = (boothRes.data as Booth[]) ?? [];
      const profilesData = (profileRes as Profile[]) ?? [];
      const catsData     = (catRes.data as Category[]) ?? [];
      const subsData     = (subRes.data as unknown as Subcategory[]) ?? [];
      const boardingTaxesData = !boardingTaxRes.error
        ? ((boardingTaxRes.data as BoardingTax[]) ?? [])
        : isSchemaToleranceError(boardingTaxRes.error)
          ? DEFAULT_BOARDING_TAXES
          : [];
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
      const hydratedDailyClosings = ((dailyCloseRes.data ?? []) as unknown as Omit<DailyCashClosingRow, "profiles" | "booths">[]).map((row) => ({
        ...row,
        profiles: row.user_id ? { full_name: profileMap.get(row.user_id) ?? "-" } : null,
        booths: row.office_id ? boothMap.get(row.office_id) ?? null : null,
      }));
      const hydratedTxs     = ((txRes.data ?? []) as unknown as TxForReport[]).map(tx => ({ ...tx, profiles: tx.operator_id ? { full_name: profileMap.get(tx.operator_id) ?? "-" } : null, booths: tx.booth_id ? boothMap.get(tx.booth_id) ?? null : null, companies: tx.company_id ? { name: companyMap.get(tx.company_id) ?? "-" } : null, transaction_categories: tx.category_id ? { name: catMap.get(tx.category_id) ?? "-" } : null, transaction_subcategories: tx.subcategory_id ? { name: subMap.get(tx.subcategory_id) ?? "-" } : null }));
      const hydratedAttendance = ((attendanceRes.data ?? []) as { id: string; user_id: string; clock_in: string; clock_out: string | null }[]).map((row) => ({
        ...row,
        full_name: profileMap.get(row.user_id) ?? "Operador",
      }));
      const txById = new Map(hydratedTxs.map(tx => [tx.id, tx]));
      const hydratedAdj = ((adjRes.data ?? []) as unknown as Adjustment[]).map(a => { const tx = txById.get(a.transaction_id); return { ...a, profiles: a.requested_by ? { full_name: profileMap.get(a.requested_by) ?? "-" } : null, transactions: tx ? { amount: Number(tx.amount||0), payment_method: tx.payment_method ?? "-", companies: tx.company_id ? { name: companyMap.get(tx.company_id) ?? "-" } : null } : null } as Adjustment; });

      setRows(shiftsData); setCompanies(companiesData); setBooths(boothsData); setProfiles(profilesData);
      setCategories(catsData); setSubcategories(subsData as unknown as Subcategory[]); setBoardingTaxes(boardingTaxesData);
      setOperatorBoothLinks(hydratedLinks as unknown as OperatorBoothLink[]);
      setAuditLogs(hydratedAudit as unknown as AuditLog[]);
      setTimePunchRows(hydratedPunch as unknown as TimePunchRow[]);
      setCashMovementRows(hydratedCash as unknown as CashMovementRow[]);
      setShiftCashClosingRows(hydratedClosings as unknown as ShiftCashClosingRow[]);
      setDailyCashClosingRows(hydratedDailyClosings as unknown as DailyCashClosingRow[]);
      setReportTxs(hydratedTxs as unknown as TxForReport[]);
      setAdjustments(hydratedAdj as unknown as Adjustment[]);
      setAttendanceRows(hydratedAttendance);
    } finally { setLoading(false); setIsLoading(false); setLastUpdate(new Date()); }
  }

  // ===== FUNCOES MENSAGENS OPERADORES =====
  function resetAdminReplyAttachment() {
    setAdminReplyAttachment(null);
    setAdminReplyAttachmentKey((prev) => prev + 1);
  }

  function handleAdminReplyAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      resetAdminReplyAttachment();
      return;
    }

    const validationError = validateChatAttachment(file);
    if (validationError) {
      setToastType("warning");
      setMessage(validationError);
      resetAdminReplyAttachment();
      return;
    }

    setAdminReplyAttachment(file);
  }

  const loadOperatorMessages = useCallback(async () => {
    const profileMap = new Map(profilesRef.current.map((p) => [p.user_id, p.full_name]));
    const boothMap = new Map(boothsRef.current.map((b) => [b.id, { name: b.name, code: b.code }]));
    const normalizeMessage = async (m: { id: string; message: string; read: boolean; created_at: string; operator_id: string; booth_id?: string | null; sender_role?: string | null; attachment_path?: string | null; attachment_name?: string | null; attachment_type?: string | null; attachment_size?: number | null; }): Promise<OperatorMessage> => ({
      ...m,
      booth_id: m.booth_id ?? null,
      sender_role: m.sender_role === "operator" ? "operator" : "admin",
      attachment_path: m.attachment_path ?? null,
      attachment_name: m.attachment_name ?? null,
      attachment_type: m.attachment_type ?? null,
      attachment_size: m.attachment_size ?? null,
      attachment_url: await getChatAttachmentUrl(supabase, m.attachment_path ?? null),
      profiles: { full_name: profileMap.get(m.operator_id) ?? "Operador" },
      booths: m.booth_id ? boothMap.get(m.booth_id) ?? null : null,
    });

    const query = await supabase
      .from("operator_messages")
      .select("id, message, read, created_at, operator_id, booth_id, sender_role, attachment_path, attachment_name, attachment_type, attachment_size")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!query.error && query.data) {
      const hydratedMessages = await Promise.all(query.data.map(normalizeMessage));
      setOperatorMessages(hydratedMessages);
      setUnreadCount(hydratedMessages.filter((m) => !m.read && m.sender_role === "operator").length);
      return;
    }

    if (isSchemaToleranceError(query.error)) {
      const fallback = await supabase
        .from("operator_messages")
        .select("id, message, read, created_at, operator_id")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!fallback.error && fallback.data) {
        const hydratedMessages = await Promise.all(
          fallback.data.map((m: { id: string; message: string; read: boolean; created_at: string; operator_id: string }) =>
            normalizeMessage({ ...m, booth_id: null, sender_role: "operator", attachment_path: null, attachment_name: null, attachment_type: null, attachment_size: null })
          )
        );
        setOperatorMessages(hydratedMessages);
        setUnreadCount(hydratedMessages.filter((m) => !m.read && m.sender_role === "operator").length);
      }
    }
  }, []);

  // Realtime: escutar operator_messages (inserts/updates do chat privado)
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_messages" }, (payload) => {
        void (async () => {
          const raw = payload.new as { id: string; message: string; read: boolean; created_at: string; operator_id: string; booth_id?: string | null; sender_role?: string | null; attachment_path?: string | null; attachment_name?: string | null; attachment_type?: string | null; attachment_size?: number | null };
          const profileMap = new Map(profilesRef.current.map((p) => [p.user_id, p.full_name]));
          const boothMap = new Map(boothsRef.current.map((b) => [b.id, { name: b.name, code: b.code }]));
          const hydrated: OperatorMessage = {
            ...raw,
            booth_id: raw.booth_id ?? null,
            sender_role: raw.sender_role === "operator" ? "operator" : "admin",
            attachment_path: raw.attachment_path ?? null,
            attachment_name: raw.attachment_name ?? null,
            attachment_type: raw.attachment_type ?? null,
            attachment_size: raw.attachment_size ?? null,
            attachment_url: await getChatAttachmentUrl(supabase, raw.attachment_path ?? null),
            profiles: { full_name: profileMap.get(raw.operator_id) ?? "Operador" },
            booths: raw.booth_id ? boothMap.get(raw.booth_id) ?? null : null,
          };

          setOperatorMessages((prev) => (prev.some((message) => message.id === hydrated.id) ? prev : [hydrated, ...prev]));

          if (!hydrated.read && hydrated.sender_role === "operator") {
            setUnreadCount((prev) => prev + 1);
            if (menuRef.current !== "mensagens") {
              setToastType("info");
              setMessage(`Nova mensagem de ${nameOf(hydrated.profiles) ?? "Operador"}.`);
            }
          }
        })();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "operator_messages" }, (payload) => {
        void (async () => {
          const updated = payload.new as { id: string; message: string; read: boolean; created_at: string; operator_id: string; booth_id?: string | null; sender_role?: string | null; attachment_path?: string | null; attachment_name?: string | null; attachment_type?: string | null; attachment_size?: number | null };
          const boothMap = new Map(boothsRef.current.map((b) => [b.id, { name: b.name, code: b.code }]));
          const attachmentUrl = await getChatAttachmentUrl(supabase, updated.attachment_path ?? null);

          setOperatorMessages((prev) => {
            const next: OperatorMessage[] = prev.map((message): OperatorMessage =>
              message.id === updated.id
                ? {
                    ...message,
                    message: updated.message,
                    read: updated.read,
                    created_at: updated.created_at,
                    operator_id: updated.operator_id,
                    booth_id: updated.booth_id ?? null,
                    sender_role: updated.sender_role === "operator" ? "operator" : "admin",
                    attachment_path: updated.attachment_path ?? null,
                    attachment_name: updated.attachment_name ?? null,
                    attachment_type: updated.attachment_type ?? null,
                    attachment_size: updated.attachment_size ?? null,
                    attachment_url: attachmentUrl,
                    booths: updated.booth_id ? boothMap.get(updated.booth_id) ?? null : message.booths,
                  }
                : message
            );
            setUnreadCount(next.filter((message) => !message.read && message.sender_role === "operator").length);
            return next;
          });
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markMessageAsRead(msgId: string) {
    const { data } = await supabase.auth.getUser();
    await supabase
      .from("operator_messages")
      .update({ read: true, read_at: new Date().toISOString(), read_by: data.user?.id ?? null })
      .eq("id", msgId);
    const nextMessages = operatorMessages.map((m) => (m.id === msgId ? { ...m, read: true } : m));
    setOperatorMessages(nextMessages);
    setUnreadCount(nextMessages.filter((m) => !m.read && m.sender_role === "operator").length);
  }

  async function markAllMessagesAsRead() {
    const { data } = await supabase.auth.getUser();
    await supabase
      .from("operator_messages")
      .update({ read: true, read_at: new Date().toISOString(), read_by: data.user?.id ?? null })
      .eq("read", false);
    const nextMessages = operatorMessages.map((m) => ({ ...m, read: true }));
    setOperatorMessages(nextMessages);
    setUnreadCount(0);
    setToastType("success");
    setMessage("Todas as mensagens foram marcadas como lidas.");
  }

  async function openMessageConversation(conversation: MessageConversation) {
    setActiveConversation(conversation);
    setAdminReply("");
    resetAdminReplyAttachment();

    const { data } = await supabase.auth.getUser();
    let query = supabase
      .from("operator_messages")
      .update({ read: true, read_at: new Date().toISOString(), read_by: data.user?.id ?? null })
      .eq("operator_id", conversation.operatorId)
      .eq("sender_role", "operator")
      .eq("read", false);

    query = conversation.boothId ? query.eq("booth_id", conversation.boothId) : query.is("booth_id", null);

    const { error } = await query;
    if (error && !isSchemaToleranceError(error)) {
      setToastType("error");
      setMessage(`Erro ao abrir conversa: ${error.message}`);
      return;
    }

    await loadOperatorMessages();
  }

  async function sendAdminReply() {
    if (!activeConversation || (!adminReply.trim() && !adminReplyAttachment)) return;

    let attachmentPayload: {
      attachment_path?: string;
      attachment_name?: string;
      attachment_type?: string;
      attachment_size?: number;
    } = {};

    if (adminReplyAttachment) {
      try {
        const uploaded = await uploadChatAttachment(supabase, activeConversation.operatorId, adminReplyAttachment);
        attachmentPayload = {
          attachment_path: uploaded.attachment_path,
          attachment_name: uploaded.attachment_name,
          attachment_type: uploaded.attachment_type,
          attachment_size: uploaded.attachment_size,
        };
      } catch (error) {
        setToastType("error");
        setMessage(`Erro ao enviar anexo: ${error instanceof Error ? error.message : "falha no upload"}`);
        return;
      }
    }

    const payload = {
      operator_id: activeConversation.operatorId,
      booth_id: activeConversation.boothId,
      sender_role: "admin" as const,
      message: adminReply.trim() || `Anexo enviado: ${adminReplyAttachment?.name ?? "arquivo"}`,
      read: false,
      ...attachmentPayload,
    };

    const { error } = await supabase.from("operator_messages").insert(payload);

    if (error) {
      setToastType("error");
      setMessage(
        isSchemaToleranceError(error)
          ? "Chat com anexos requer a migration de arquivos da conversa antes do envio."
          : `Erro: ${error.message}`
      );
      return;
    }

    setAdminReply("");
    resetAdminReplyAttachment();
    setToastType("success");
    setMessage(`Mensagem enviada para ${activeConversation.boothName}.`);
    await loadOperatorMessages();
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
    const comps = new Map<string, { id: string, name: string, amount: number, central: number, repasse: number, payoutDays: number }>();
    const pctMap = new Map(companies.map(c => [c.id, getCompanyPct(c)]));
    const payoutDaysMap = new Map(
      companies.map((c) => [
        c.id,
        typeof c.payout_days === "number" && Number.isFinite(c.payout_days) ? Math.max(0, Math.trunc(c.payout_days)) : 0,
      ])
    );

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
          comps.set(cId, { id: cId, name: cName, amount: 0, central: 0, repasse: 0, payoutDays: payoutDaysMap.get(cId) ?? 0 });
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

  const boardingTaxAudit = useMemo(() => {
    let qtd_estadual = 0;
    let valor_estadual = 0;
    let qtd_federal = 0;
    let valor_federal = 0;
    for (const tx of reportTxs) {
      const es = Number(tx.boarding_tax_state ?? 0);
      const fed = Number(tx.boarding_tax_federal ?? 0);
      if (es > 0) { qtd_estadual += 1; valor_estadual += es; }
      if (fed > 0) { qtd_federal += 1; valor_federal += fed; }
    }
    return { qtd_estadual, valor_estadual, qtd_federal, valor_federal };
  }, [reportTxs]);

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
    const s = cashMovementRows.filter((movement) => movement.movement_type === "suprimento").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const g = cashMovementRows.filter((movement) => movement.movement_type === "sangria").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const j = cashMovementRows.filter((movement) => movement.movement_type === "ajuste").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const cashSales = reportTxs
      .filter((tx) => (tx.payment_method ?? "").toLowerCase() === "cash")
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

    return {
      suprimento: s,
      sangria: g,
      ajuste: j,
      cashSales,
      saldo: cashSales + s - g + j,
    };
  }, [cashMovementRows, reportTxs]);

  const cashClosingTotals = useMemo(() => ({
    expected:   shiftCashClosingRows.reduce((a,r)=>a+Number(r.expected_cash||0),0),
    declared:   shiftCashClosingRows.reduce((a,r)=>a+Number(r.declared_cash||0),0),
    difference: shiftCashClosingRows.reduce((a,r)=>a+Number(r.difference||0),0),
  }), [shiftCashClosingRows]);

  const financeByBooth = useMemo<FinanceByBoothSummary[]>(() => {
    const summaryMap = new Map<string, FinanceByBoothSummary>();

    const ensureSummary = (
      boothId?: string | null,
      boothValue?: { code: string; name: string } | { code: string; name: string }[] | null
    ) => {
      const normalizedBoothId = boothId ?? "sem-guiche";
      if (!summaryMap.has(normalizedBoothId)) {
        const booth = boothOf(boothValue ?? null);
        const boothLabel = booth ? `${booth.code} - ${booth.name}` : "Sem guiche";

        summaryMap.set(normalizedBoothId, {
          boothId: normalizedBoothId,
          boothLabel,
          grossSales: 0,
          txCount: 0,
          pixSales: 0,
          creditSales: 0,
          debitSales: 0,
          cashSales: 0,
          suprimento: 0,
          sangria: 0,
          ajuste: 0,
          saldo: 0,
          expected: 0,
          declared: 0,
          difference: 0,
          stateTaxCount: 0,
          stateTaxValue: 0,
          federalTaxCount: 0,
          federalTaxValue: 0,
          movementCount: 0,
          closingCount: 0,
        });
      }

      return summaryMap.get(normalizedBoothId)!;
    };

    for (const tx of reportTxs) {
      const summaryRow = ensureSummary(tx.booth_id, tx.booths ?? null);
      const amount = Number(tx.amount || 0);
      const paymentMethod = (tx.payment_method ?? "").toLowerCase();
      const stateTax = Number(tx.boarding_tax_state || 0);
      const federalTax = Number(tx.boarding_tax_federal || 0);

      summaryRow.grossSales += amount;
      summaryRow.txCount += 1;

      if (paymentMethod === "pix") summaryRow.pixSales += amount;
      else if (paymentMethod === "credit") summaryRow.creditSales += amount;
      else if (paymentMethod === "debit") summaryRow.debitSales += amount;
      else if (paymentMethod === "cash") summaryRow.cashSales += amount;

      if (stateTax > 0) {
        summaryRow.stateTaxCount += 1;
        summaryRow.stateTaxValue += stateTax;
      }

      if (federalTax > 0) {
        summaryRow.federalTaxCount += 1;
        summaryRow.federalTaxValue += federalTax;
      }
    }

    for (const movement of cashMovementRows) {
      const summaryRow = ensureSummary(movement.booth_id, movement.booths ?? null);
      const amount = Number(movement.amount || 0);

      if (movement.movement_type === "suprimento") summaryRow.suprimento += amount;
      else if (movement.movement_type === "sangria") summaryRow.sangria += amount;
      else summaryRow.ajuste += amount;

      summaryRow.movementCount += 1;
    }

    for (const closing of shiftCashClosingRows) {
      const summaryRow = ensureSummary(closing.booth_id, closing.booths ?? null);
      summaryRow.expected += Number(closing.expected_cash || 0);
      summaryRow.declared += Number(closing.declared_cash || 0);
      summaryRow.difference += Number(closing.difference || 0);
      summaryRow.closingCount += 1;
    }

    return Array.from(summaryMap.values())
      .map((summaryRow) => ({
        ...summaryRow,
        saldo: summaryRow.cashSales + summaryRow.suprimento - summaryRow.sangria + summaryRow.ajuste,
      }))
      .sort((a, b) => a.boothLabel.localeCompare(b.boothLabel));
  }, [cashMovementRows, reportTxs, shiftCashClosingRows]);

  async function applyDateFilters() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setToastType("warning");
      return setMessage("A data inicial nao pode ser maior que a data final.");
    }

    if (dateFrom && dateTo) {
      const start = new Date(`${dateFrom}T00:00:00`);
      const end = new Date(`${dateTo}T00:00:00`);
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
        setToastType("warning");
        return setMessage("Para manter o sistema estavel, consulte periodos de ate 365 dias por vez.");
      }
    }

    await refreshData(dateFrom, dateTo);
  }

  async function clearDateFilters() {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const to   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setDateFrom(from);
    setDateTo(to);
    await refreshData(from, to);
  }

  const filteredProfiles = useMemo(() => { const t = profileSearch.trim().toLowerCase(); return t ? profiles.filter(p => [p.full_name, p.email??"", p.cpf??"", p.phone??"", p.role].join(" ").toLowerCase().includes(t)) : profiles; }, [profiles, profileSearch]);
  const filteredBooths   = useMemo(() => { const t = boothSearch.trim().toLowerCase(); return t ? booths.filter(b => `${b.code} ${b.name}`.toLowerCase().includes(t)) : booths; }, [booths, boothSearch]);
  const normalizeConfigText = (value: string) => value.trim().toLowerCase();

  function parseRepasseDayInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      return Number.NaN;
    }

    return parsed;
  }

  function parsePayoutDaysInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return Number.NaN;
    }

    return parsed;
  }

  async function persistCompanyRecord({
    companyId,
    name,
    commissionPercent,
    diaRepasse,
    payoutDays,
    active,
  }: {
    companyId?: string;
    name: string;
    commissionPercent: number;
    diaRepasse: number | null;
    payoutDays: number;
    active?: boolean;
  }) {
    const sharedPayload = {
      name,
      ...(active === undefined ? {} : { active }),
    };

    const payloads: Record<string, unknown>[] = [
      { ...sharedPayload, commission_percent: commissionPercent, dia_repasse: diaRepasse, payout_days: payoutDays },
      { ...sharedPayload, comission_percent: commissionPercent, dia_repasse: diaRepasse, payout_days: payoutDays },
      { ...sharedPayload, commission_percent: commissionPercent, payout_days: payoutDays },
      { ...sharedPayload, comission_percent: commissionPercent, payout_days: payoutDays },
      { ...sharedPayload, commission_percent: commissionPercent, dia_repasse: diaRepasse },
      { ...sharedPayload, comission_percent: commissionPercent, dia_repasse: diaRepasse },
      { ...sharedPayload, commission_percent: commissionPercent },
      { ...sharedPayload, comission_percent: commissionPercent },
    ];

    let lastError: { message?: string; code?: string } | null = null;

    for (const payload of payloads) {
      const result = companyId
        ? await supabase.from("companies").update(payload).eq("id", companyId)
        : await supabase.from("companies").insert(payload);

      if (!result.error) {
        return {
          error: null,
          omittedDiaRepasse: !Object.prototype.hasOwnProperty.call(payload, "dia_repasse"),
          omittedPayoutDays: !Object.prototype.hasOwnProperty.call(payload, "payout_days"),
        };
      }

      lastError = result.error;
      if (!isSchemaToleranceError(result.error)) break;
    }

    return { error: lastError, omittedDiaRepasse: false, omittedPayoutDays: false };
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();

    const name = companyName.trim();
    const pct = Number(companyPct.replace(",", "."));
    const diaRepasse = parseRepasseDayInput(companyRepasseDay);
    const payoutDays = parsePayoutDaysInput(companyPayoutDays);

    if (!name) {
      setToastType("warning");
      return setMessage("Informe o nome da empresa.");
    }

    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setToastType("warning");
      return setMessage("Informe um percentual de comissao valido entre 0 e 100.");
    }

    if (Number.isNaN(diaRepasse)) {
      setToastType("warning");
      return setMessage("Informe um dia de repasse valido entre 1 e 31.");
    }

    if (Number.isNaN(payoutDays)) {
      setToastType("warning");
      return setMessage("Informe um prazo de repasse valido em dias (0 ou mais).");
    }

    if (companies.some((company) => normalizeConfigText(company.name) === normalizeConfigText(name))) {
      setToastType("warning");
      return setMessage(`A empresa "${name}" ja existe.`);
    }

    const { error, omittedDiaRepasse, omittedPayoutDays } = await persistCompanyRecord({
      name,
      commissionPercent: Number(pct.toFixed(3)),
      diaRepasse,
      payoutDays,
      active: true,
    });

    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A empresa "${name}" ja existe.` : `Erro: ${error.message}`);
    }

    setCompanyName("");
    setCompanyPct("6");
    setCompanyRepasseDay("");
    setCompanyPayoutDays("0");
    setToastType("success");
    setMessage(
      (omittedDiaRepasse && diaRepasse !== null) || (omittedPayoutDays && payoutDays !== 0)
        ? "Empresa cadastrada com sucesso! Aplique a migration de prazo/dia de repasse para persistir todos os campos financeiros no banco atual."
        : "Empresa cadastrada com sucesso!"
    );
    await refreshData();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("booths").insert({ code: boothCode.trim().toUpperCase(), name: boothName.trim(), active: true });
    if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
    setBoothCode(""); setBoothName(""); setToastType("success"); setMessage("Guiche cadastrado com sucesso!"); await refreshData();
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const name = categoryName.trim();

    if (!name) {
      setToastType("warning");
      return setMessage("Informe o nome da categoria.");
    }

    if (categories.some((category) => normalizeConfigText(category.name) === normalizeConfigText(name))) {
      setToastType("warning");
      return setMessage(`A categoria "${name}" ja existe.`);
    }

    const { error } = await supabase.from("transaction_categories").insert({ name, active: true });
    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A categoria "${name}" ja existe.` : `Erro: ${error.message}`);
    }

    setCategoryName("");
    setToastType("success");
    setMessage("Categoria cadastrada com sucesso!");
    await refreshData();
  }

  async function createSubcategory(e: FormEvent) {
    e.preventDefault();
    const name = subcategoryName.trim();
    const parentCategory = categories.find((category) => category.id === subcategoryCategoryId);

    if (!subcategoryCategoryId) {
      setToastType("warning");
      return setMessage("Selecione a categoria pai da subcategoria.");
    }

    if (!name) {
      setToastType("warning");
      return setMessage("Informe o nome da subcategoria.");
    }

    const alreadyExists = subcategories.some(
      (subcategory) =>
        subcategory.category_id === subcategoryCategoryId &&
        normalizeConfigText(subcategory.name) === normalizeConfigText(name)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A subcategoria "${name}" ja existe em ${parentCategory?.name ?? "categoria"}.`);
    }

    const { error } = await supabase.from("transaction_subcategories").insert({ category_id: subcategoryCategoryId, name, active: true });
    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A subcategoria "${name}" ja existe nessa categoria.` : `Erro: ${error.message}`);
    }

    setSubcategoryName("");
    setSubcategoryCategoryId("");
    setToastType("success");
    setMessage(`Subcategoria cadastrada em ${parentCategory?.name ?? "categoria"} com sucesso!`);
    await refreshData();
  }

  async function createBoardingTax(e: FormEvent) {
    e.preventDefault();
    const name = boardingTaxName.trim();
    const amount = Number(boardingTaxAmount.replace(",", "."));

    if (!name) {
      setToastType("warning");
      return setMessage("Informe o nome da taxa de embarque.");
    }

    if (Number.isNaN(amount) || amount < 0) {
      setToastType("warning");
      return setMessage("Informe um valor valido para a taxa de embarque.");
    }

    const alreadyExists = boardingTaxes.some(
      (tax) => tax.tax_type === boardingTaxType && normalizeConfigText(tax.name) === normalizeConfigText(name)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A taxa "${name}" ja existe em ${boardingTaxType}.`);
    }

    const { error } = await supabase.from("boarding_taxes").insert({
      name,
      amount: Number(amount.toFixed(2)),
      tax_type: boardingTaxType,
      active: true,
    });

    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A taxa "${name}" ja existe em ${boardingTaxType}.` : `Erro: ${error.message}`);
    }

    setBoardingTaxName("");
    setBoardingTaxAmount("");
    setBoardingTaxType("estadual");
    setToastType("success");
    setMessage("Taxa de embarque cadastrada com sucesso!");
    await refreshData();
  }

  async function linkOperatorToBooth(e: FormEvent) {
    e.preventDefault();

    if (!selectedOperatorId || !selectedBoothId) {
      setToastType("warning");
      return setMessage("Selecione um operador e um guiche para salvar o vinculo.");
    }

    const operator = profiles.find((profile) => profile.user_id === selectedOperatorId);
    const booth = booths.find((item) => item.id === selectedBoothId);
    const { error } = await supabase
      .from("operator_booths")
      .upsert(
        { operator_id: selectedOperatorId, booth_id: selectedBoothId, active: true },
        { onConflict: "operator_id,booth_id" }
      );

    if (error) {
      setToastType("error");
      return setMessage(`Erro: ${error.message}`);
    }

    setSelectedOperatorId("");
    setSelectedBoothId("");
    setToastType("success");
    setMessage(`Vinculo salvo: ${operator?.full_name ?? "Operador"} -> ${booth ? `${booth.code} - ${booth.name}` : "Guiche"}.`);
    await refreshData();
  }

  async function toggleOperatorBoothLink(link: OperatorBoothLink) {
    const nextActive = !link.active;
    const { error } = await supabase.from("operator_booths").update({ active: nextActive }).eq("id", link.id);

    if (error) {
      setToastType("error");
      return setMessage(`Erro: ${error.message}`);
    }

    const booth = boothOf(link.booths);
    setToastType("success");
    setMessage(
      `Vinculo ${nextActive ? "reativado" : "desativado"}: ${nameOf(link.profiles) ?? "Operador"}${booth ? ` -> ${booth.code} - ${booth.name}` : ""}.`
    );
    await refreshData();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const uid = newProfileUserId.trim();
      const { error } = await supabase.from("profiles").upsert({ user_id: uid, full_name: newProfileName.trim(), cpf: newProfileCpf.trim()||null, address: newProfileAddress.trim()||null, phone: newProfilePhone.trim()||null, avatar_url: newProfileAvatarUrl.trim()||null, role: newProfileRole, active: newProfileActive });
      if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
      setNewProfileUserId(""); setNewProfileName(""); setNewProfileCpf(""); setNewProfilePhone(""); setNewProfileAddress(""); setNewProfileAvatarUrl(""); setNewProfileRole("operator"); setNewProfileActive(true);
      await logAction("UPSERT_PROFILE","profiles",uid,{role:newProfileRole});
      setToastType("success"); setMessage("Perfil salvo com sucesso!"); await refreshData();
    } finally {
      setSavingProfile(false);
    }
  }

  async function sendResetLink(e: FormEvent) {
    e.preventDefault();
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
      if (error) { setToastType("error"); return setMessage(`Erro: ${error.message}`); }
      setResetEmail(""); setToastType("success"); setMessage("Link de reset enviado com sucesso!");
    } finally {
      setSendingReset(false);
    }
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

  function confirmToggleBoardingTax(tax: BoardingTax) {
    setConfirmDialog({
      open: true,
      title: tax.active ? "Inativar Taxa de Embarque" : "Reativar Taxa de Embarque",
      description: `Tem certeza que deseja ${tax.active ? "inativar" : "reativar"} a taxa "${tax.name}"?`,
      variant: tax.active ? "warning" : "info",
      onConfirm: async () => {
        await supabase.from("boarding_taxes").update({ active: !tax.active }).eq("id", tax.id);
        await refreshData();
        setToastType("success");
        setMessage(`Taxa ${tax.active ? "inativada" : "reativada"} com sucesso!`);
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

    const nextName = editingCategoryName.trim();
    if (!nextName) {
      setToastType("warning");
      return setMessage("Informe o nome da categoria antes de salvar.");
    }

    const alreadyExists = categories.some(
      (category) => category.id !== editingCategoryId && normalizeConfigText(category.name) === normalizeConfigText(nextName)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A categoria "${nextName}" ja existe.`);
    }

    const { error } = await supabase.from("transaction_categories").update({ name: nextName }).eq("id", editingCategoryId);
    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A categoria "${nextName}" ja existe.` : `Erro: ${error.message}`);
    }

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

    const nextName = editingSubcategoryName.trim();
    const currentSubcategory = subcategories.find((subcategory) => subcategory.id === editingSubcategoryId);

    if (!nextName) {
      setToastType("warning");
      return setMessage("Informe o nome da subcategoria antes de salvar.");
    }

    const alreadyExists = subcategories.some(
      (subcategory) =>
        subcategory.id !== editingSubcategoryId &&
        subcategory.category_id === currentSubcategory?.category_id &&
        normalizeConfigText(subcategory.name) === normalizeConfigText(nextName)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A subcategoria "${nextName}" ja existe nessa categoria.`);
    }

    const { error } = await supabase.from("transaction_subcategories").update({ name: nextName }).eq("id", editingSubcategoryId);
    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A subcategoria "${nextName}" ja existe nessa categoria.` : `Erro: ${error.message}`);
    }

    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
    await refreshData();
    setToastType("success"); setMessage("Subcategoria atualizada!");
  }
  function cancelEditSubcategory() {
    setEditingSubcategoryId(null);
    setEditingSubcategoryName("");
  }

  function startEditBoardingTax(tax: BoardingTax) {
    setEditingBoardingTaxId(tax.id);
    setEditingBoardingTaxName(tax.name);
    setEditingBoardingTaxAmount(String(Number(tax.amount ?? 0)));
    setEditingBoardingTaxType(tax.tax_type);
  }

  async function saveEditBoardingTax() {
    if (!editingBoardingTaxId) return;

    const nextName = editingBoardingTaxName.trim();
    const nextAmount = Number(editingBoardingTaxAmount.replace(",", "."));

    if (!nextName) {
      setToastType("warning");
      return setMessage("Informe o nome da taxa antes de salvar.");
    }

    if (Number.isNaN(nextAmount) || nextAmount < 0) {
      setToastType("warning");
      return setMessage("Informe um valor valido para a taxa de embarque.");
    }

    const alreadyExists = boardingTaxes.some(
      (tax) =>
        tax.id !== editingBoardingTaxId &&
        tax.tax_type === editingBoardingTaxType &&
        normalizeConfigText(tax.name) === normalizeConfigText(nextName)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A taxa "${nextName}" ja existe em ${editingBoardingTaxType}.`);
    }

    const { error } = await supabase.from("boarding_taxes").update({
      name: nextName,
      amount: Number(nextAmount.toFixed(2)),
      tax_type: editingBoardingTaxType,
    }).eq("id", editingBoardingTaxId);

    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A taxa "${nextName}" ja existe em ${editingBoardingTaxType}.` : `Erro: ${error.message}`);
    }

    setEditingBoardingTaxId(null);
    setEditingBoardingTaxName("");
    setEditingBoardingTaxAmount("");
    setEditingBoardingTaxType("estadual");
    await refreshData();
    setToastType("success");
    setMessage("Taxa de embarque atualizada!");
  }

  function cancelEditBoardingTax() {
    setEditingBoardingTaxId(null);
    setEditingBoardingTaxName("");
    setEditingBoardingTaxAmount("");
    setEditingBoardingTaxType("estadual");
  }

  function startEditCompany(c: Company) {
    setEditingCompanyId(c.id);
    setEditingCompanyName(c.name);
    setEditingCompanyPct(getCompanyPct(c).toString());
    setEditingCompanyRepasseDay(c.dia_repasse ? String(c.dia_repasse) : "");
    setEditingCompanyPayoutDays(String(c.payout_days ?? 0));
  }
  async function saveEditCompany() {
    if (!editingCompanyId) return;

    const nextName = editingCompanyName.trim();
    const nextPct = Number(editingCompanyPct.replace(",", "."));
    const nextDiaRepasse = parseRepasseDayInput(editingCompanyRepasseDay);
    const nextPayoutDays = parsePayoutDaysInput(editingCompanyPayoutDays);

    if (!nextName) {
      setToastType("warning");
      return setMessage("Informe o nome da empresa antes de salvar.");
    }

    if (Number.isNaN(nextPct) || nextPct < 0 || nextPct > 100) {
      setToastType("warning");
      return setMessage("Informe um percentual de comissao valido entre 0 e 100.");
    }

    if (Number.isNaN(nextDiaRepasse)) {
      setToastType("warning");
      return setMessage("Informe um dia de repasse valido entre 1 e 31.");
    }

    if (Number.isNaN(nextPayoutDays)) {
      setToastType("warning");
      return setMessage("Informe um prazo de repasse valido em dias (0 ou mais).");
    }

    const alreadyExists = companies.some(
      (company) => company.id !== editingCompanyId && normalizeConfigText(company.name) === normalizeConfigText(nextName)
    );

    if (alreadyExists) {
      setToastType("warning");
      return setMessage(`A empresa "${nextName}" ja existe.`);
    }

    const { error, omittedDiaRepasse, omittedPayoutDays } = await persistCompanyRecord({
      companyId: editingCompanyId,
      name: nextName,
      commissionPercent: Number(nextPct.toFixed(3)),
      diaRepasse: nextDiaRepasse,
      payoutDays: nextPayoutDays,
    });

    if (error) {
      setToastType(error.code === "23505" ? "warning" : "error");
      return setMessage(error.code === "23505" ? `A empresa "${nextName}" ja existe.` : `Erro: ${error.message}`);
    }

    setEditingCompanyId(null);
    setEditingCompanyName("");
    setEditingCompanyPct("");
    setEditingCompanyRepasseDay("");
    setEditingCompanyPayoutDays("0");
    await refreshData();
    setToastType("success");
    setMessage(
      (omittedDiaRepasse && nextDiaRepasse !== null) || (omittedPayoutDays && nextPayoutDays !== 0)
        ? "Empresa atualizada! Aplique a migration de prazo/dia de repasse para persistir todos os campos financeiros no banco atual."
        : "Empresa atualizada!"
    );
  }
  function cancelEditCompany() {
    setEditingCompanyId(null);
    setEditingCompanyName("");
    setEditingCompanyPct("");
    setEditingCompanyRepasseDay("");
    setEditingCompanyPayoutDays("0");
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
      { key: "payoutDays", label: "Prazo de Repasse (dias)" },
    ]);
  }

  const menuLabels: Record<MenuSection, string> = {
    dashboard: "Dashboard",
    operadores: "Controle de Turno",
    financeiro: "Financeiro",
    "fechamento-caixa": "Fechamento de Caixa",
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
            onApplyFilters={applyDateFilters}
            onClearFilters={clearDateFilters}
            repassesComputed={repassesComputed}
            boardingTaxAudit={boardingTaxAudit}
            reportTxCount={reportTxs.length}
            summary={summary}
            dailyRevenueData={dailyRevenueData}
            paymentMethodData={paymentMethodData}
            topCompaniesData={topCompaniesData}
            adjustmentsCount={adjustments.length}
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
            booths={booths}
            operatorBoothLinks={operatorBoothLinks}
            shiftRows={rows}
            timePunchRows={timePunchRows}
            attendanceRows={attendanceRows}
            reportTxs={reportTxs}
            cashMovementRows={cashMovementRows}
            shiftCashClosingRows={shiftCashClosingRows}
            isMounted={isMounted}
            punchPage={punchPage}
            punchPerPage={PUNCH_PER_PAGE}
            onPreviousPage={() => setPunchPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPunchPage((p) => p + 1)}
            onOpenConversation={({ operatorId, operatorName, boothName, boothId }) => {
              setActiveConversation({ operatorId, operatorName, boothName, boothId });
              setMenu("mensagens");
              if (typeof window !== "undefined") {
                window.location.hash = "mensagens";
              }
              void loadOperatorMessages();
            }}
          />
        )}

        {/* FINANCEIRO */}
{show("financeiro") && (
          <AdminFinanceSection
            dateFrom={dateFrom}
            dateTo={dateTo}
            cashMovementTotals={cashMovementTotals}
            cashClosingTotals={cashClosingTotals}
            financeByBooth={financeByBooth}
            reportTxs={reportTxs}
            cashMovementRows={cashMovementRows}
            shiftCashClosingRows={shiftCashClosingRows}
            dailyCashClosingRows={dailyCashClosingRows}
            responsavelConferencia={responsavelConferencia}
            dataAssinatura={dataAssinatura}
            observacoesFinais={observacoesFinais}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onResponsavelConferenciaChange={setResponsavelConferencia}
            onDataAssinaturaChange={setDataAssinatura}
            onObservacoesFinaisChange={setObservacoesFinais}
            onApplyFilters={applyDateFilters}
            onClearFilters={clearDateFilters}
          />
        )}

        {/* FECHAMENTO DE CAIXA */}
        {show("fechamento-caixa") && (
          <AdminCashClosingSection
            shiftCashClosingRows={shiftCashClosingRows}
            shiftRows={rows}
            isMounted={isMounted}
          />
        )}

        {/* RELATORIOS */}
        {show("relatorios") && (
          <AdminReportsSection
            auditLogs={auditLogs}
            reportTxs={reportTxs}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}

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
            savingProfile={savingProfile}
            sendingReset={sendingReset}
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
            companyRepasseDay={companyRepasseDay}
            companyPayoutDays={companyPayoutDays}
            boothCode={boothCode}
            boothName={boothName}
            boothSearch={boothSearch}
            companies={companies}
            filteredBooths={filteredBooths}
            editingCompanyId={editingCompanyId}
            editingCompanyName={editingCompanyName}
            editingCompanyPct={editingCompanyPct}
            editingCompanyRepasseDay={editingCompanyRepasseDay}
            editingCompanyPayoutDays={editingCompanyPayoutDays}
            editingBoothId={editingBoothId}
            editingBoothCode={editingBoothCode}
            editingBoothName={editingBoothName}
            onCompanyNameChange={(e) => setCompanyName(e.target.value)}
            onCompanyPctChange={(e) => setCompanyPct(e.target.value)}
            onCompanyRepasseDayChange={(e) => setCompanyRepasseDay(e.target.value)}
            onCompanyPayoutDaysChange={(e) => setCompanyPayoutDays(e.target.value)}
            onBoothCodeChange={(e) => setBoothCode(e.target.value)}
            onBoothNameChange={(e) => setBoothName(e.target.value)}
            onBoothSearchChange={(e) => setBoothSearch(e.target.value)}
            onEditingCompanyNameChange={(e) => setEditingCompanyName(e.target.value)}
            onEditingCompanyPctChange={(e) => setEditingCompanyPct(e.target.value)}
            onEditingCompanyRepasseDayChange={(e) => setEditingCompanyRepasseDay(e.target.value)}
            onEditingCompanyPayoutDaysChange={(e) => setEditingCompanyPayoutDays(e.target.value)}
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
            boardingTaxName={boardingTaxName}
            boardingTaxAmount={boardingTaxAmount}
            boardingTaxType={boardingTaxType}
            profiles={profiles}
            booths={booths}
            categories={categories}
            subcategories={subcategories}
            boardingTaxes={boardingTaxes}
            operatorBoothLinks={operatorBoothLinks}
            editingCategoryId={editingCategoryId}
            editingCategoryName={editingCategoryName}
            editingSubcategoryId={editingSubcategoryId}
            editingSubcategoryName={editingSubcategoryName}
            editingBoardingTaxId={editingBoardingTaxId}
            editingBoardingTaxName={editingBoardingTaxName}
            editingBoardingTaxAmount={editingBoardingTaxAmount}
            editingBoardingTaxType={editingBoardingTaxType}
            onSelectedOperatorChange={(e) => setSelectedOperatorId(e.target.value)}
            onSelectedBoothChange={(e) => setSelectedBoothId(e.target.value)}
            onCategoryNameChange={(e) => setCategoryName(e.target.value)}
            onSubcategoryNameChange={(e) => setSubcategoryName(e.target.value)}
            onSubcategoryCategoryChange={(e) => setSubcategoryCategoryId(e.target.value)}
            onBoardingTaxNameChange={(e) => setBoardingTaxName(e.target.value)}
            onBoardingTaxAmountChange={(e) => setBoardingTaxAmount(e.target.value)}
            onBoardingTaxTypeChange={(e) => setBoardingTaxType(e.target.value as BoardingTax["tax_type"])}
            onEditingCategoryNameChange={(e) => setEditingCategoryName(e.target.value)}
            onEditingSubcategoryNameChange={(e) => setEditingSubcategoryName(e.target.value)}
            onEditingBoardingTaxNameChange={(e) => setEditingBoardingTaxName(e.target.value)}
            onEditingBoardingTaxAmountChange={(e) => setEditingBoardingTaxAmount(e.target.value)}
            onEditingBoardingTaxTypeChange={(e) => setEditingBoardingTaxType(e.target.value as BoardingTax["tax_type"])}
            onLinkOperatorToBooth={linkOperatorToBooth}
            onCreateCategory={createCategory}
            onCreateSubcategory={createSubcategory}
            onCreateBoardingTax={createBoardingTax}
            onToggleOperatorBoothLink={toggleOperatorBoothLink}
            onStartEditCategory={startEditCategory}
            onSaveEditCategory={saveEditCategory}
            onCancelEditCategory={cancelEditCategory}
            onToggleCategory={confirmToggleCategory}
            onStartEditSubcategory={startEditSubcategory}
            onSaveEditSubcategory={saveEditSubcategory}
            onCancelEditSubcategory={cancelEditSubcategory}
            onToggleSubcategory={confirmToggleSubcategory}
            onStartEditBoardingTax={startEditBoardingTax}
            onSaveEditBoardingTax={saveEditBoardingTax}
            onCancelEditBoardingTax={cancelEditBoardingTax}
            onToggleBoardingTax={confirmToggleBoardingTax}
          />
        )}

        {/* ===== MENSAGENS DOS OPERADORES ===== */}
        {show("mensagens") && (
          <AdminMessagesSection
            unreadCount={unreadCount}
            operatorMessages={operatorMessages}
            operatorBoothLinks={operatorBoothLinks}
            activeConversation={activeConversation}
            adminReply={adminReply}
            adminReplyAttachmentName={adminReplyAttachment?.name ?? null}
            adminReplyAttachmentKey={adminReplyAttachmentKey}
            isMounted={isMounted}
            onAdminReplyChange={setAdminReply}
            onAdminReplyAttachmentChange={handleAdminReplyAttachmentChange}
            onClearAdminReplyAttachment={resetAdminReplyAttachment}
            onRefresh={loadOperatorMessages}
            onMarkAllRead={markAllMessagesAsRead}
            onMarkAsRead={markMessageAsRead}
            onSelectConversation={openMessageConversation}
            onSendReply={sendAdminReply}
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
