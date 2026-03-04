"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type AdminSection = "dashboard" | "controle-turno" | "historico" | "relatorios" | "usuarios" | "configuracoes";

type Profile = { user_id: string; full_name: string; role: "tenant_admin" | "operator" | "financeiro" | "admin"; active?: boolean | null; tenant_id?: string | null };
type Shift = { id: string; status: "open" | "closed"; opened_at: string; closed_at?: string | null; operator_id?: string | null; booth_id?: string | null };
type BoardingFeeCity = "belem" | "goiania";

type Tx = {
  id: string;
  sold_at: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  status: "posted" | "voided";
  operator_id?: string | null;
  booth_id?: string | null;
  category_id?: string | null;
  boarding_fee_amount?: number | null;
  boarding_fee_city?: BoardingFeeCity | null;
};
type Company = { id: string; name: string; active: boolean; commission_percent?: number | null; payout_days?: number | null; account_manager?: string | null; whatsapp?: string | null; rating?: "alta" | "boa" | "media" | "ruim" | null };
type Booth = { id: string; code: string; name: string; active: boolean };
type Category = { id: string; name: string; active: boolean };
type OperatorBooth = { id: string; operator_id: string; booth_id: string; active: boolean };
type TimePunch = { id: string; user_id?: string | null; booth_id?: string | null; punch_type: string; punched_at: string; note?: string | null };
type CashMovement = { id: string; user_id?: string | null; booth_id?: string | null; movement_type: string; amount: number; created_at: string; note?: string | null };
type TxReceipt = { transaction_id: string };

type UiState = { loading: boolean; error: string | null };
type SectionWarning = { section: string; message: string };

const sections: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  "controle-turno": "Controle de Turno",
  historico: "Histórico",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
};

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function boardingFeeLabel(city?: BoardingFeeCity | null) {
  if (city === "belem") return "Belém";
  if (city === "goiania") return "Goiânia";
  return "Sem taxa";
}

function mapDbError(raw: string, fallback: string) {
  const msg = raw.toLowerCase();
  if (msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("23505")) {
    return `${fallback} (registro duplicado).`;
  }
  if (msg.includes("violates foreign key") || msg.includes("23503")) {
    return "Referência inválida. Verifique os dados relacionados antes de salvar.";
  }
  if (msg.includes("invalid input syntax for type uuid") || msg.includes("22p02")) {
    return "Identificador inválido. Confira os dados informados e tente novamente.";
  }
  return raw || fallback;
}

function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

export default function RebuildAdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");

  const [authLoading, setAuthLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState("");
  const [ui, setUi] = useState<UiState>({ loading: true, error: null });
  const [notice, setNotice] = useState<string | null>(null);
  const [sectionWarnings, setSectionWarnings] = useState<SectionWarning[]>([]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<OperatorBooth[]>([]);
  const [timePunches, setTimePunches] = useState<TimePunch[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [txReceipts, setTxReceipts] = useState<TxReceipt[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [companyCommission, setCompanyCommission] = useState("10");
  const [companyPayoutDays, setCompanyPayoutDays] = useState("30");
  const [companyManager, setCompanyManager] = useState("");
  const [companyWhatsapp, setCompanyWhatsapp] = useState("");
  const [companyRating, setCompanyRating] = useState<"alta" | "boa" | "media" | "ruim">("boa");
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState("");
  const [editingCompanyCommission, setEditingCompanyCommission] = useState("0");
  const [editingCompanyPayoutDays, setEditingCompanyPayoutDays] = useState("0");
  const [editingCompanyManager, setEditingCompanyManager] = useState("");
  const [editingCompanyWhatsapp, setEditingCompanyWhatsapp] = useState("");
  const [editingCompanyRating, setEditingCompanyRating] = useState<"alta" | "boa" | "media" | "ruim">("boa");
  const [boothCode, setBoothCode] = useState("");
  const [boothName, setBoothName] = useState("");
  const [linkOperatorId, setLinkOperatorId] = useState("");
  const [linkBoothId, setLinkBoothId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"" | "operator" | "financeiro" | "tenant_admin">("operator");
  const [newUserActive, setNewUserActive] = useState(true);

  const [historicoOperatorFilter, setHistoricoOperatorFilter] = useState("");
  const [historicoStatusFilter, setHistoricoStatusFilter] = useState("");
  const [historicoDateFilter, setHistoricoDateFilter] = useState("");
  const [historicoDateFrom, setHistoricoDateFrom] = useState("");
  const [historicoDateTo, setHistoricoDateTo] = useState("");
  const [historicoMethodFilter, setHistoricoMethodFilter] = useState<"" | "pix" | "credit" | "debit" | "cash">("");
  const [historicoBoothFilter, setHistoricoBoothFilter] = useState("");
  const [historicoCategoryFilter, setHistoricoCategoryFilter] = useState("");
  const [reportBoothFilter, setReportBoothFilter] = useState("");
  const [reportCategoryFilter, setReportCategoryFilter] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  useEffect(() => {
    const syncSectionFromHash = () => {
      const raw = window.location.hash.replace("#", "") as AdminSection | "";
      const nextSection: AdminSection = raw && raw in sections ? (raw as AdminSection) : "dashboard";
      setActiveSection(nextSection);
    };

    const onSectionChange = (event: Event) => {
      const custom = event as CustomEvent<string>;
      const next = custom.detail as AdminSection | undefined;
      if (next && next in sections) setActiveSection(next);
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("rebuild:section-change", onSectionChange as EventListener);
    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("rebuild:section-change", onSectionChange as EventListener);
    };
  }, []);

  const operatorMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p.full_name])), [profiles]);
  const boothMap = useMemo(() => new Map(booths.map((b) => [b.id, `${b.code} - ${b.name}`])), [booths]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const operators = useMemo(() => profiles.filter((p) => p.role === "operator"), [profiles]);
  const canManageUsers = useMemo(() => profiles.some((p) => p.user_id === sessionUserId && (p.role === "tenant_admin" || p.role === "admin")), [profiles, sessionUserId]);
  const users = useMemo(() => profiles, [profiles]);
  const openShifts = useMemo(() => shifts.filter((s) => s.status === "open"), [shifts]);
  const closedShifts = useMemo(() => shifts.filter((s) => s.status === "closed"), [shifts]);
  const pendingByOperator = useMemo(() => {
    const map = new Map<string, number>();
    openShifts.forEach((s) => {
      const key = s.operator_id || "sem-operador";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([operatorId, total]) => ({ operatorId, total })).sort((a, b) => b.total - a.total);
  }, [openShifts]);

  const postedTxs = useMemo(() => txs.filter((t) => t.status === "posted"), [txs]);
  const receiptTxSet = useMemo(() => new Set(txReceipts.map((r) => r.transaction_id)), [txReceipts]);
  const operatorLinkSummary = useMemo(() => {
    const activeMap = new Map<string, number>();
    links.filter((link) => link.active).forEach((link) => {
      activeMap.set(link.operator_id, (activeMap.get(link.operator_id) || 0) + 1);
    });
    return operators
      .map((op) => ({ operatorId: op.user_id, operatorName: op.full_name, activeBooths: activeMap.get(op.user_id) || 0 }))
      .sort((a, b) => b.activeBooths - a.activeBooths || a.operatorName.localeCompare(b.operatorName, "pt-BR"));
  }, [links, operators]);

  const operatorsWithBooths = useMemo(() => {
    const activeLinks = links.filter((link) => link.active);
    return operators
      .map((operator) => {
        const linkedBooths = activeLinks
          .filter((link) => link.operator_id === operator.user_id)
          .map((link) => boothMap.get(link.booth_id) || "Guichê não encontrado");

        return {
          userId: operator.user_id,
          name: operator.full_name || "Sem nome",
          role: operator.role,
          active: operator.active !== false,
          boothCount: linkedBooths.length,
          boothList: linkedBooths,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [operators, links, boothMap]);

  const boothStatusCards = useMemo(() => {
    const activeLinks = links.filter((link) => link.active);

    return booths
      .filter((booth) => booth.active)
      .map((booth) => {
        const open = openShifts.filter((shift) => shift.booth_id === booth.id).length;
        const closed = closedShifts.filter((shift) => shift.booth_id === booth.id).length;
        const operatorsLinked = activeLinks.filter((link) => link.booth_id === booth.id).length;
        const cashToday = cashMovements.filter((move) => move.booth_id === booth.id && move.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
        const boothTx = postedTxs.filter((tx) => tx.booth_id === booth.id);
        const pendingReceipts = boothTx.filter((tx) => (tx.payment_method === "credit" || tx.payment_method === "debit") && !receiptTxSet.has(tx.id)).length;
        const cashIn = cashMovements.filter((move) => move.booth_id === booth.id && move.movement_type !== "sangria").reduce((acc, move) => acc + Number(move.amount || 0), 0);
        const cashOut = cashMovements.filter((move) => move.booth_id === booth.id && move.movement_type === "sangria").reduce((acc, move) => acc + Number(move.amount || 0), 0);
        const cashSales = boothTx.filter((tx) => tx.payment_method === "cash").reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
        const estimatedCash = cashSales + cashIn - cashOut;

        return {
          id: booth.id,
          code: booth.code,
          name: booth.name,
          open,
          closed,
          operatorsLinked,
          cashToday,
          pendingReceipts,
          estimatedCash,
          negativeCashRisk: estimatedCash < 0,
          status: open > 0 ? "em-atendimento" : "sem-turno",
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code, "pt-BR"));
  }, [booths, openShifts, closedShifts, links, cashMovements, postedTxs, receiptTxSet]);

  const dashboardCards = useMemo(() => {
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const monthRevenue = postedTxs.reduce((sum, tx) => {
      const soldAt = new Date(tx.sold_at);
      if (soldAt >= startMonth && soldAt < endMonth) return sum + Number(tx.amount || 0);
      return sum;
    }, 0);

    return [
      { label: "Receita do mês", value: brl(monthRevenue), hint: "Mês atual" },
      { label: "Transações hoje", value: String(txs.filter((tx) => tx.sold_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length), hint: "Últimas 24 horas" },
      { label: "Turnos abertos", value: String(openShifts.length), hint: `${closedShifts.length} fechados` },
      { label: "Operadores ativos", value: String(operators.length), hint: `${booths.filter((b) => b.active).length} guichês ativos` },
    ];
  }, [postedTxs, txs, openShifts.length, closedShifts.length, operators.length, booths]);

  const revenueSeries7d = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDate = new Map<string, number>();

    postedTxs.forEach((tx) => {
      const key = tx.sold_at.slice(0, 10);
      byDate.set(key, (byDate.get(key) || 0) + Number(tx.amount || 0));
    });

    const points = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: byDate.get(key) || 0,
      };
    });

    return points;
  }, [postedTxs]);

  const dashboardAlerts = useMemo(() => {
    const alerts: Array<{ title: string; detail: string; level: "alta" | "media" | "baixa" }> = [];

    if (openShifts.length > 0) {
      alerts.push({
        title: "Turnos em aberto",
        detail: `${openShifts.length} turno(s) aguardando fechamento.`,
        level: openShifts.length >= 3 ? "alta" : "media",
      });
    }

    const voidedCount = txs.filter((tx) => tx.status === "voided").length;
    if (voidedCount > 0) {
      alerts.push({
        title: "Transações canceladas",
        detail: `${voidedCount} registro(s) cancelado(s) no período carregado.`,
        level: voidedCount >= 10 ? "alta" : "media",
      });
    }

    const unlinkedOperators = operators.filter((op) => !links.some((link) => link.operator_id === op.user_id && link.active));
    if (unlinkedOperators.length > 0) {
      alerts.push({
        title: "Operadores sem vínculo",
        detail: `${unlinkedOperators.length} operador(es) sem guichê ativo.`,
        level: "baixa",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        title: "Tudo sob controle",
        detail: "Nenhum alerta crítico no momento.",
        level: "baixa",
      });
    }

    return alerts.slice(0, 4);
  }, [openShifts.length, txs, operators, links]);

  const latestTransactions = useMemo(() => {
    return [...txs]
      .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
      .slice(0, 7);
  }, [txs]);

  const filteredHistorico = useMemo(() => {
    return txs.filter((t) => {
      if (historicoOperatorFilter && t.operator_id !== historicoOperatorFilter) return false;
      if (historicoStatusFilter && t.status !== historicoStatusFilter) return false;
      if (historicoBoothFilter && t.booth_id !== historicoBoothFilter) return false;
      if (historicoCategoryFilter && t.category_id !== historicoCategoryFilter) return false;
      if (historicoMethodFilter && t.payment_method !== historicoMethodFilter) return false;
      if (historicoDateFilter && !t.sold_at.startsWith(historicoDateFilter)) return false;
      const soldDate = new Date(t.sold_at);
      if (historicoDateFrom) {
        const from = new Date(`${historicoDateFrom}T00:00:00`);
        if (soldDate < from) return false;
      }
      if (historicoDateTo) {
        const to = new Date(`${historicoDateTo}T23:59:59`);
        if (soldDate > to) return false;
      }
      return true;
    });
  }, [txs, historicoOperatorFilter, historicoStatusFilter, historicoBoothFilter, historicoCategoryFilter, historicoDateFilter, historicoMethodFilter, historicoDateFrom, historicoDateTo]);

  const historicoFeeTotals = useMemo(() => {
    return filteredHistorico.reduce(
      (acc, tx) => {
        const fee = Number(tx.boarding_fee_amount || 0);
        acc.total += fee;
        if (tx.boarding_fee_city === "belem") acc.belem += fee;
        if (tx.boarding_fee_city === "goiania") acc.goiania += fee;
        return acc;
      },
      { total: 0, belem: 0, goiania: 0 }
    );
  }, [filteredHistorico]);

  const filteredReportTx = useMemo(() => {
    return txs.filter((t) => {
      if (reportBoothFilter && t.booth_id !== reportBoothFilter) return false;
      if (reportCategoryFilter && t.category_id !== reportCategoryFilter) return false;

      const soldDate = new Date(t.sold_at);
      if (reportStartDate) {
        const start = new Date(`${reportStartDate}T00:00:00`);
        if (soldDate < start) return false;
      }
      if (reportEndDate) {
        const end = new Date(`${reportEndDate}T23:59:59`);
        if (soldDate > end) return false;
      }

      return t.status === "posted";
    });
  }, [txs, reportBoothFilter, reportCategoryFilter, reportStartDate, reportEndDate]);

  const reportTotals = useMemo(() => {
    const total = filteredReportTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const feeTotals = filteredReportTx.reduce(
      (acc, tx) => {
        const fee = Number(tx.boarding_fee_amount || 0);
        acc.total += fee;
        if (tx.boarding_fee_city === "belem") acc.belem += fee;
        if (tx.boarding_fee_city === "goiania") acc.goiania += fee;
        return acc;
      },
      { total: 0, belem: 0, goiania: 0 }
    );
    const byOperator = new Map<string, { name: string; qty: number; total: number }>();
    const byBooth = new Map<string, { name: string; qty: number; total: number }>();
    const byCategory = new Map<string, { name: string; qty: number; total: number }>();

    filteredReportTx.forEach((tx) => {
      const opName = operatorMap.get(tx.operator_id || "") || "Sem operador";
      const boothName = boothMap.get(tx.booth_id || "") || "Sem guichê";
      const categoryName = categoryMap.get(tx.category_id || "") || "Sem categoria";

      const opPrev = byOperator.get(opName) || { name: opName, qty: 0, total: 0 };
      opPrev.qty += 1;
      opPrev.total += Number(tx.amount || 0);
      byOperator.set(opName, opPrev);

      const boothPrev = byBooth.get(boothName) || { name: boothName, qty: 0, total: 0 };
      boothPrev.qty += 1;
      boothPrev.total += Number(tx.amount || 0);
      byBooth.set(boothName, boothPrev);

      const catPrev = byCategory.get(categoryName) || { name: categoryName, qty: 0, total: 0 };
      catPrev.qty += 1;
      catPrev.total += Number(tx.amount || 0);
      byCategory.set(categoryName, catPrev);
    });

    return {
      total,
      qty: filteredReportTx.length,
      feeTotals,
      byOperator: Array.from(byOperator.values()).sort((a, b) => b.total - a.total),
      byBooth: Array.from(byBooth.values()).sort((a, b) => b.total - a.total),
      byCategory: Array.from(byCategory.values()).sort((a, b) => b.total - a.total),
    };
  }, [filteredReportTx, operatorMap, boothMap, categoryMap]);

  useEffect(() => {
    async function guard() {
      setAuthLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return router.replace("/login");

        const profileRes = await supabase.from("profiles").select("role,active").eq("user_id", userId).single();
        setSessionUserId(userId);
        if (profileRes.error || !profileRes.data || profileRes.data.active === false) {
          await supabase.auth.signOut();
          return router.replace("/login");
        }
        if (!["tenant_admin", "admin", "financeiro"].includes(profileRes.data.role)) return router.replace("/rebuild/operator");
      } finally {
        setAuthLoading(false);
      }
    }

    guard();
  }, [router]);

  async function loadAll() {
    setUi({ loading: true, error: null });
    setNotice(null);

    const warnings: SectionWarning[] = [];

    async function loadChunk<T>(section: string, request: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
      try {
        const res = await request;
        if (res.error) {
          warnings.push({ section, message: res.error.message });
          return [] as T[];
        }
        return (res.data ?? []) as T[];
      } catch (error) {
        warnings.push({ section, message: error instanceof Error ? error.message : "Erro inesperado." });
        return [] as T[];
      }
    }

    try {
      const txRequestWithFee = supabase.from("transactions").select("id,sold_at,amount,payment_method,status,operator_id,booth_id,category_id,boarding_fee_amount,boarding_fee_city").order("sold_at", { ascending: false }).limit(400);
      const txRequestWithoutFee = supabase.from("transactions").select("id,sold_at,amount,payment_method,status,operator_id,booth_id,category_id").order("sold_at", { ascending: false }).limit(400);

      const [nextProfiles, nextShifts, nextTxsRaw, nextCompanies, nextBooths, nextCategories, nextLinks, nextPunches, nextCash] = await Promise.all([
        loadChunk<Profile>("Usuários", supabase.from("profiles").select("user_id,full_name,role,active,tenant_id").order("full_name")),
        loadChunk<Shift>("Controle de turno", supabase.from("shifts").select("id,status,opened_at,closed_at,operator_id,booth_id").order("opened_at", { ascending: false }).limit(120)),
        loadChunk<Tx>("Histórico", txRequestWithFee),
        loadChunk<Company>("Empresas", supabase.from("companies").select("id,name,active,commission_percent,payout_days,account_manager,whatsapp,rating").order("name")),
        loadChunk<Booth>("Guichês", supabase.from("booths").select("id,code,name,active").order("name")),
        loadChunk<Category>("Categorias", supabase.from("transaction_categories").select("id,name,active").order("name")),
        loadChunk<OperatorBooth>("Vínculos operador-guichê", supabase.from("operator_booths").select("id,operator_id,booth_id,active").order("id", { ascending: false }).limit(250)),
        loadChunk<TimePunch>("Ponto", supabase.from("time_punches").select("id,user_id,booth_id,punch_type,punched_at,note").order("punched_at", { ascending: false }).limit(300)),
        loadChunk<CashMovement>("Caixa PDV", supabase.from("cash_movements").select("id,user_id,booth_id,movement_type,amount,created_at,note").order("created_at", { ascending: false }).limit(300)),
      ]);

      let nextTxs = nextTxsRaw;
      if (!nextTxs.length) {
        const fallbackTxs = await loadChunk<Tx>("Histórico", txRequestWithoutFee);
        if (fallbackTxs.length) {
          warnings.push({ section: "Histórico", message: "Campos de taxa de embarque ainda não disponíveis. Exibindo sem taxa." });
          nextTxs = fallbackTxs.map((tx) => ({ ...tx, boarding_fee_amount: 0, boarding_fee_city: null }));
        }
      }

      setProfiles(nextProfiles);
      setShifts(nextShifts);
      setTxs(nextTxs);
      setCompanies(nextCompanies);
      setBooths(nextBooths);
      setCategories(nextCategories);
      setLinks(nextLinks);
      setTimePunches(nextPunches);
      setCashMovements(nextCash);
      const txIds = nextTxs.map((tx) => tx.id);
      if (txIds.length > 0) {
        const receiptsRes = await supabase.from("transaction_receipts").select("transaction_id").in("transaction_id", txIds);
        if (receiptsRes.error) {
          warnings.push({ section: "Comprovantes", message: receiptsRes.error.message });
          setTxReceipts([]);
        } else {
          setTxReceipts((receiptsRes.data as TxReceipt[] | null) ?? []);
        }
      } else {
        setTxReceipts([]);
      }
      setSectionWarnings(warnings);
      setUi({ loading: false, error: null });
    } catch {
      setUi({ loading: false, error: "Falha inesperada ao carregar os dados administrativos." });
    }
  }

  useEffect(() => {
    if (!authLoading) loadAll();
  }, [authLoading]);

  async function toggleRow(table: string, idField: string, id: string, current: boolean, okMsg: string) {
    const res = await supabase.from(table).update({ active: !current }).eq(idField, id);
    if (res.error) return setNotice(`Não foi possível atualizar o status: ${mapDbError(res.error.message, "Falha ao atualizar status")}`);
    setNotice(okMsg);
    await loadAll();
  }

  async function updateUserRole(userId: string, role: "tenant_admin" | "operator" | "financeiro") {
    const res = await supabase.from("profiles").update({ role }).eq("user_id", userId);
    if (res.error) return setNotice(`Não foi possível atualizar o papel do usuário: ${mapDbError(res.error.message, "Falha ao atualizar papel")}`);
    setNotice("Papel de usuário atualizado com sucesso.");
    await loadAll();
  }


  async function createUserProfile() {
    const userId = newUserId.trim();
    const fullName = newUserName.trim();
    if (!userId || !fullName) return setNotice("Informe ID do usuário e nome completo.");
    if (!newUserRole) return setNotice("Selecione um papel obrigatório para o usuário.");

    const res = await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: fullName,
      role: newUserRole,
      active: newUserActive,
    });

    if (res.error) return setNotice(`Não foi possível criar o usuário: ${mapDbError(res.error.message, "Falha ao criar usuário")}`);
    setNewUserId("");
    setNewUserName("");
    setNewUserRole("operator");
    setNewUserActive(true);
    setNotice("Operador/usuário salvo com sucesso.");
    await loadAll();
  }

  async function createCompany() {
    if (!companyName.trim()) return setNotice("Informe o nome da empresa.");
    const sanitizedWhatsapp = normalizeWhatsapp(companyWhatsapp);
    if (sanitizedWhatsapp && sanitizedWhatsapp.length < 10) return setNotice("Informe um WhatsApp válido com DDD.");
    const commission = Number(companyCommission || 0);
    const payoutDays = Number(companyPayoutDays || 0);
    const res = await supabase.from("companies").insert({
      name: companyName.trim(),
      commission_percent: Number.isFinite(commission) ? Math.min(100, commission) : 0,
      payout_days: Number.isFinite(payoutDays) ? payoutDays : null,
      account_manager: companyManager.trim() || null,
      whatsapp: sanitizedWhatsapp || null,
      rating: companyRating || null,
      active: true,
    });
    if (res.error) return setNotice(`Não foi possível cadastrar a empresa: ${mapDbError(res.error.message, "Falha ao cadastrar empresa")}`);
    setCompanyName("");
    setCompanyCommission("10");
    setCompanyPayoutDays("30");
    setCompanyManager("");
    setCompanyWhatsapp("");
    setCompanyRating("boa");
    setNotice("Empresa cadastrada com sucesso.");
    await loadAll();
  }

  async function createBooth() {
    if (!boothCode.trim() || !boothName.trim()) return setNotice("Informe código e nome do guichê.");
    const res = await supabase.from("booths").insert({ code: boothCode.trim(), name: boothName.trim(), active: true });
    if (res.error) return setNotice(`Não foi possível cadastrar o guichê: ${mapDbError(res.error.message, "Falha ao cadastrar guichê")}`);
    setBoothCode("");
    setBoothName("");
    setNotice("Guichê cadastrado com sucesso.");
    await loadAll();
  }


  async function createLink() {
    if (!linkOperatorId || !linkBoothId) return setNotice("Selecione operador e guichê para vincular.");

    const existingLink = links.find((l) => l.operator_id === linkOperatorId && l.booth_id === linkBoothId);
    if (existingLink?.active) return setNotice("Esse vínculo já existe e está ativo.");

    if (existingLink && !existingLink.active) {
      const reactivate = await supabase.from("operator_booths").update({ active: true }).eq("id", existingLink.id);
      if (reactivate.error) return setNotice(`Não foi possível reativar o vínculo: ${mapDbError(reactivate.error.message, "Falha ao reativar vínculo")}`);
      setLinkOperatorId("");
      setLinkBoothId("");
      setNotice("Vínculo reativado com sucesso.");
      await loadAll();
      return;
    }

    const res = await supabase.from("operator_booths").insert({ operator_id: linkOperatorId, booth_id: linkBoothId, active: true });
    if (res.error) return setNotice(`Não foi possível criar o vínculo: ${mapDbError(res.error.message, "Falha ao criar vínculo")}`);
    setLinkOperatorId("");
    setLinkBoothId("");
    setNotice("Vínculo criado com sucesso.");
    await loadAll();
  }

  

  async function createOperatorAndLink() {
    const userId = newUserId.trim();
    const fullName = newUserName.trim();

    if (!userId || !fullName) return setNotice("Preencha o identificador do usuário e o nome do operador.");
    if (!newUserRole) return setNotice("Selecione o perfil (role) do operador.");

    const profileRes = await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: fullName,
      role: newUserRole,
      active: newUserActive,
    });

    if (profileRes.error) {
      return setNotice(`Não foi possível salvar o perfil: ${mapDbError(profileRes.error.message, "Falha ao salvar perfil")}`);
    }

    if (linkBoothId) {
      const existingLink = links.find((l) => l.operator_id === userId && l.booth_id === linkBoothId);

      if (!existingLink) {
        const createLinkRes = await supabase.from("operator_booths").insert({ operator_id: userId, booth_id: linkBoothId, active: true });
        if (createLinkRes.error) {
          return setNotice(`Perfil salvo, mas não foi possível criar vínculo: ${mapDbError(createLinkRes.error.message, "Falha ao criar vínculo")}`);
        }
      } else if (!existingLink.active) {
        const reactivateRes = await supabase.from("operator_booths").update({ active: true }).eq("id", existingLink.id);
        if (reactivateRes.error) {
          return setNotice(`Perfil salvo, mas não foi possível reativar vínculo: ${mapDbError(reactivateRes.error.message, "Falha ao reativar vínculo")}`);
        }
      }
    }

    setNewUserId("");
    setNewUserName("");
    setNewUserRole("operator");
    setNewUserActive(true);
    setLinkBoothId("");
    setNotice(linkBoothId ? "Operador e vínculo salvos com sucesso." : "Operador salvo com sucesso.");
    await loadAll();
  }

  function startEditCompany(company: Company) {
    setEditingCompanyId(company.id);
    setEditingCompanyName(company.name || "");
    setEditingCompanyCommission(String(company.commission_percent ?? 0));
    setEditingCompanyPayoutDays(String(company.payout_days ?? 0));
    setEditingCompanyManager(company.account_manager || "");
    setEditingCompanyWhatsapp(company.whatsapp || "");
    setEditingCompanyRating((company.rating as "alta" | "boa" | "media" | "ruim" | null) || "boa");
  }

  function cancelEditCompany() {
    setEditingCompanyId(null);
    setEditingCompanyName("");
    setEditingCompanyCommission("0");
    setEditingCompanyPayoutDays("0");
    setEditingCompanyManager("");
    setEditingCompanyWhatsapp("");
    setEditingCompanyRating("boa");
  }

  async function saveCompanyEdit(companyId: string) {
    if (!editingCompanyName.trim()) return setNotice("Informe o nome da empresa.");

    const commission = Number(editingCompanyCommission || 0);
    const payoutDays = Number(editingCompanyPayoutDays || 0);
    const sanitizedWhatsapp = normalizeWhatsapp(editingCompanyWhatsapp);

    if (!Number.isFinite(commission) || commission < 0 || commission > 100) return setNotice("Comissão inválida. Informe um percentual entre 0 e 100.");
    if (!Number.isFinite(payoutDays) || payoutDays < 0) return setNotice("Repasse inválido. Informe a quantidade de dias igual ou maior que zero.");
    if (sanitizedWhatsapp && sanitizedWhatsapp.length < 10) return setNotice("WhatsApp inválido. Informe DDD + número.");

    const res = await supabase.from("companies").update({
      name: editingCompanyName.trim(),
      commission_percent: Number.isFinite(commission) ? Math.min(100, commission) : 0,
      payout_days: Number.isFinite(payoutDays) ? payoutDays : null,
      account_manager: editingCompanyManager.trim() || null,
      whatsapp: sanitizedWhatsapp || null,
      rating: editingCompanyRating || null,
    }).eq("id", companyId);

    if (res.error) return setNotice(`Não foi possível atualizar a empresa: ${mapDbError(res.error.message, "Falha ao atualizar empresa")}`);
    setNotice("Empresa atualizada com sucesso.");
    cancelEditCompany();
    await loadAll();
  }
function downloadCsv(name: string, headers: string[], rows: Array<Array<string | number>>) {
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCsvDetalhado() {
    const headers = ["data", "operador", "guiche", "categoria", "valor", "taxa_embarque", "cidade_taxa", "status", "metodo"];
    const rows = filteredReportTx.map((tx) => [
      new Date(tx.sold_at).toLocaleString("pt-BR"),
      operatorMap.get(tx.operator_id || "") || "Sem operador",
      boothMap.get(tx.booth_id || "") || "Sem guichê",
      categoryMap.get(tx.category_id || "") || "Sem categoria",
      String(Number(tx.amount || 0).toFixed(2)).replace(".", ","),
      String(Number(tx.boarding_fee_amount || 0).toFixed(2)).replace(".", ","),
      boardingFeeLabel(tx.boarding_fee_city),
      tx.status,
      tx.payment_method.toUpperCase(),
    ]);
    downloadCsv(`relatorio-admin-detalhado-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportCsvPorOperador() {
    const headers = ["operador", "qtd_transacoes", "total"];
    const rows = reportTotals.byOperator.map((item) => [item.name, item.qty, String(item.total.toFixed(2)).replace(".", ",")]);
    downloadCsv(`relatorio-operador-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportCsvPorGuiche() {
    const headers = ["guiche", "qtd_transacoes", "total"];
    const rows = reportTotals.byBooth.map((item) => [item.name, item.qty, String(item.total.toFixed(2)).replace(".", ",")]);
    downloadCsv(`relatorio-guiche-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  if (authLoading || ui.loading) return <div className="text-sm text-slate-500">Carregando dados administrativos...</div>;
  if (ui.error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{ui.error}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {notice ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{notice}</div> : null}
      {sectionWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Algumas seções carregaram com limitações:</p>
          <ul className="mt-1 list-disc pl-5">
            {sectionWarnings.map((warning) => (
              <li key={`${warning.section}-${warning.message}`}>{warning.section}: {warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeSection === "dashboard" && (
        <div className="rb-dashboard-stack">
          <div className="rb-kpi-grid">
            {dashboardCards.map((card) => (
              <div key={card.label} className="rb-kpi-card">
                <p className="rb-kpi-label">{card.label}</p>
                <p className="rb-kpi-value">{card.value}</p>
                <p className="rb-kpi-hint">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="rb-dashboard-main-grid">
            <section className="rb-panel rb-chart-panel">
              <div className="rb-panel-head">
                <div>
                  <h3 className="rb-panel-title">Evolução de Receita</h3>
                  <p className="rb-panel-subtitle">Últimos 7 dias</p>
                </div>
                <span className="rb-panel-total">{brl(revenueSeries7d.reduce((sum, point) => sum + point.value, 0))}</span>
              </div>
              <RevenueChart points={revenueSeries7d} />
              {revenueSeries7d.some((point) => "fallback" in point) ? (
                <p className="rb-chart-fallback">Exibindo curva visual padrão porque não há dados recentes suficientes.</p>
              ) : null}
            </section>

            <section className="rb-panel rb-alert-panel">
              <h3 className="rb-panel-title">Atenção Necessária</h3>
              <ul className="rb-alert-list">
                {dashboardAlerts.map((alert, index) => (
                  <li key={`${alert.title}-${index}`} className="rb-alert-item">
                    <span className={`rb-alert-dot rb-alert-dot-${alert.level}`}></span>
                    <div>
                      <p className="rb-alert-title">{alert.title}</p>
                      <p className="rb-alert-detail">{alert.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rb-panel rb-transactions-panel">
            <div className="rb-panel-head">
              <h3 className="rb-panel-title">Últimas Transações</h3>
              <p className="rb-panel-subtitle">Movimentações mais recentes</p>
            </div>
            <div className="rb-dashboard-table-wrap">
              <table className="rb-dashboard-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Operador</th>
                    <th>Guichê</th>
                    <th>Pagamento</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="rb-table-empty">Sem transações para exibir.</td>
                    </tr>
                  ) : (
                    latestTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                        <td>{operatorMap.get(tx.operator_id || "") || "Sem operador"}</td>
                        <td>{boothMap.get(tx.booth_id || "") || "Sem guichê"}</td>
                        <td><span className={`rb-payment-badge rb-payment-${tx.payment_method}`}>{tx.payment_method.toUpperCase()}</span></td>
                        <td className="text-right font-semibold">{brl(Number(tx.amount || 0))}</td>
                        <td>
                          <span className={`rb-badge ${tx.status === "posted" ? "rb-badge-success" : "rb-badge-warning"}`}>
                            {tx.status === "posted" ? "Lançado" : "Cancelado"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeSection === "controle-turno" && (
        <SectionBox title="Controle de Turno" subtitle="Visão por guichê com status rápido, seguida das listas de turnos, ponto e caixa.">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {boothStatusCards.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500 col-span-full">Nenhum guichê ativo encontrado para montar o painel.</div>
            ) : boothStatusCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">{card.code}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${card.status === "em-atendimento" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{card.status === "em-atendimento" ? "Em atendimento" : "Sem turno"}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{card.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white border p-2"><p className="text-slate-500">Abertos</p><p className="font-semibold">{card.open}</p></div>
                  <div className="rounded-md bg-white border p-2"><p className="text-slate-500">Fechados</p><p className="font-semibold">{card.closed}</p></div>
                  <div className="rounded-md bg-white border p-2"><p className="text-slate-500">Operadores</p><p className="font-semibold">{card.operatorsLinked}</p></div>
                  <div className="rounded-md bg-white border p-2"><p className="text-slate-500">Mov. caixa hoje</p><p className="font-semibold">{card.cashToday}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border p-3">
              <p className="font-semibold text-slate-800 mb-2">Turnos abertos</p>
              {openShifts.length === 0 ? <p className="text-sm text-slate-500">Nenhum turno aberto.</p> : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {openShifts.slice(0, 20).map((s) => <li key={s.id}>{operatorMap.get(s.operator_id || "") || "Sem operador"} • {boothMap.get(s.booth_id || "") || "Sem guichê"} • {new Date(s.opened_at).toLocaleString("pt-BR")}</li>)}
                </ul>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold text-slate-800 mb-2">Turnos fechados recentes</p>
              {closedShifts.length === 0 ? <p className="text-sm text-slate-500">Nenhum turno fechado recente.</p> : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {closedShifts.slice(0, 20).map((s) => <li key={s.id}>{operatorMap.get(s.operator_id || "") || "Sem operador"} • {boothMap.get(s.booth_id || "") || "Sem guichê"} • {new Date(s.closed_at || s.opened_at).toLocaleString("pt-BR")}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="font-semibold text-slate-800 mb-2">Ponto de todos os operadores</p>
              {timePunches.length === 0 ? <Empty text="Sem registros de ponto." /> : (
                <div className="max-h-64 overflow-auto space-y-1 text-sm">
                  {timePunches.slice(0, 80).map((p) => (
                    <div key={p.id} className="flex justify-between border-b py-1">
                      <span>{operatorMap.get(p.user_id || "") || "Sem operador"} • {p.punch_type}</span>
                      <span className="text-slate-500">{new Date(p.punched_at).toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold text-slate-800 mb-2">Caixa PDV por operador</p>
              {cashMovements.length === 0 ? <Empty text="Sem movimentos de caixa." /> : (
                <div className="max-h-64 overflow-auto space-y-1 text-sm">
                  {cashMovements.slice(0, 80).map((c) => (
                    <div key={c.id} className="flex justify-between border-b py-1">
                      <span>{operatorMap.get(c.user_id || "") || "Sem operador"} • {c.movement_type}</span>
                      <span className="text-slate-500">{brl(Number(c.amount || 0))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionBox>
      )}

{activeSection === "historico" && (
        <SectionBox title="Histórico" subtitle="Tabela de transações com filtros e painel de operação avançada.">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-3 mb-4">
            <select className="border rounded-lg px-3 py-2" value={historicoOperatorFilter} onChange={(e) => setHistoricoOperatorFilter(e.target.value)}>
              <option value="">Todos operadores</option>
              {operators.map((op) => <option key={op.user_id} value={op.user_id}>{op.full_name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2" value={historicoStatusFilter} onChange={(e) => setHistoricoStatusFilter(e.target.value)}>
              <option value="">Todos status</option>
              <option value="posted">Lançado</option>
              <option value="voided">Cancelado</option>
            </select>
            <select className="border rounded-lg px-3 py-2" value={historicoBoothFilter} onChange={(e) => setHistoricoBoothFilter(e.target.value)}><option value="">Todos guichês</option>{booths.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select>
            <select className="border rounded-lg px-3 py-2" value={historicoCategoryFilter} onChange={(e) => setHistoricoCategoryFilter(e.target.value)}><option value="">Todas categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input className="border rounded-lg px-3 py-2" type="date" value={historicoDateFilter} onChange={(e) => setHistoricoDateFilter(e.target.value)} />
            <select className="border rounded-lg px-3 py-2" value={historicoMethodFilter} onChange={(e) => setHistoricoMethodFilter(e.target.value as "" | "pix" | "credit" | "debit" | "cash")}>
              <option value="">Todos métodos</option>
              <option value="pix">PIX</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="cash">Dinheiro</option>
            </select>
            <input className="border rounded-lg px-3 py-2" type="date" value={historicoDateFrom} onChange={(e) => setHistoricoDateFrom(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" type="date" value={historicoDateTo} onChange={(e) => setHistoricoDateTo(e.target.value)} />
          </div>
          <div className="rounded-xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Operação avançada</p>
                <p className="text-xs text-slate-500">Transações lançadas por dia (últimos 7 dias do filtro atual)</p>
              </div>
            </div>
            <AdvancedOpsChart txs={filteredHistorico} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Card title="Total de taxas no acerto" value={brl(historicoFeeTotals.total)} />
            <Card title="Taxas Belém" value={brl(historicoFeeTotals.belem)} />
            <Card title="Taxas Goiânia" value={brl(historicoFeeTotals.goiania)} />
          </div>
          {filteredHistorico.length === 0 ? <Empty text="Sem transações para os filtros selecionados." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">Operador</th><th className="p-2 text-left">Guichê</th><th className="p-2 text-left">Categoria</th><th className="p-2 text-left">Pagamento</th><th className="p-2 text-right">Valor</th><th className="p-2 text-right">Taxa</th><th className="p-2 text-left">Cidade taxa</th><th className="p-2 text-left">Status</th></tr></thead>
                <tbody>
                  {filteredHistorico.slice(0, 160).map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="p-2">{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2">{operatorMap.get(tx.operator_id || "") || "Sem operador"}</td>
                      <td className="p-2">{boothMap.get(tx.booth_id || "") || "Sem guichê"}</td>
                      <td className="p-2">{categoryMap.get(tx.category_id || "") || "Sem categoria"}</td>
                      <td className="p-2">{tx.payment_method.toUpperCase()}</td>
                      <td className="p-2 text-right">{brl(Number(tx.amount || 0))}</td>
                      <td className="p-2 text-right">{brl(Number(tx.boarding_fee_amount || 0))}</td>
                      <td className="p-2">{boardingFeeLabel(tx.boarding_fee_city)}</td>
                      <td className="p-2">{tx.status === "posted" ? "Lançado" : "Cancelado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionBox>
      )}

      {activeSection === "relatorios" && (
        <SectionBox title="Relatórios" subtitle="Consolidado por operador, guichê e categoria com exportação CSV.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <select className="border rounded-lg px-3 py-2" value={reportBoothFilter} onChange={(e) => setReportBoothFilter(e.target.value)}>
              <option value="">Todos guichês</option>
              {booths.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2" value={reportCategoryFilter} onChange={(e) => setReportCategoryFilter(e.target.value)}>
              <option value="">Todas categorias</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2" type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
            <button className="rounded-lg bg-[#0da2e7] text-white px-3 py-2 font-semibold" onClick={exportCsvDetalhado}>CSV detalhado</button>
            <button className="rounded-lg bg-slate-700 text-white px-3 py-2 font-semibold" onClick={exportCsvPorOperador}>CSV por operador</button>
            <button className="rounded-lg bg-slate-700 text-white px-3 py-2 font-semibold" onClick={exportCsvPorGuiche}>CSV por guichê</button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700"
              onClick={() => {
                setReportBoothFilter("");
                setReportCategoryFilter("");
                setReportStartDate("");
                setReportEndDate("");
              }}
            >
              Limpar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Card title="Receita consolidada" value={brl(reportTotals.total)} />
            <Card title="Total de transações" value={String(reportTotals.qty)} />
            <Card title="Ticket médio" value={brl(reportTotals.qty ? reportTotals.total / reportTotals.qty : 0)} />
            <Card title="Total de taxas" value={brl(reportTotals.feeTotals.total)} />
            <Card title="Taxas Belém / Goiânia" value={`${brl(reportTotals.feeTotals.belem)} / ${brl(reportTotals.feeTotals.goiania)}`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {reportTotals.byBooth.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500 col-span-full">Sem dados por guichê para o período selecionado.</div>
            ) : reportTotals.byBooth.slice(0, 8).map((item) => (
              <div key={`booth-card-${item.name}`} className="rounded-xl border p-3 bg-slate-50">
                <p className="text-xs uppercase text-slate-500">Guichê</p>
                <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                <p className="text-sm text-slate-600 mt-2">Transações: <span className="font-semibold">{item.qty}</span></p>
                <p className="text-sm text-slate-600">Total: <span className="font-semibold">{brl(item.total)}</span></p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniTable title="Por operador" rows={reportTotals.byOperator} />
            <MiniTable title="Por guichê" rows={reportTotals.byBooth} />
            <MiniTable title="Por categoria" rows={reportTotals.byCategory} />
          </div>
        </SectionBox>
      )}

      {activeSection === "usuarios" && canManageUsers && (
        <SectionBox title="Usuários" subtitle="Gestão de perfis com foco em cadastro de operador (papel e status ativos).">
          <div className="rounded-lg border p-3 mb-4">
            <p className="font-semibold text-slate-800 mb-1">Cadastro de operador / usuário</p>
            <p className="text-xs text-slate-500 mb-2">Use o ID interno do login, nome, perfil e status inicial.</p>
            <div className="grid md:grid-cols-5 gap-2">
              <input className="border rounded-lg px-3 py-2" placeholder="ID interno do usuário" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
              <input className="border rounded-lg px-3 py-2" placeholder="Nome completo" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              <select className="border rounded-lg px-3 py-2" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "" | "tenant_admin" | "operator" | "financeiro")} required>
                <option value="operator">Operador</option>
                <option value="financeiro">Financeiro</option>
                <option value="tenant_admin">Admin do Tenant</option>
              </select>
              <select className="border rounded-lg px-3 py-2" value={newUserActive ? "1" : "0"} onChange={(e) => setNewUserActive(e.target.value === "1")}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
              <button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createUserProfile}>Salvar cadastro</button>
            </div>
          </div>
          {users.length === 0 ? <Empty text="Nenhum usuário cadastrado." /> : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.user_id} className="rounded-lg border p-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{u.full_name || "Sem nome"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      value={u.role}
                      onChange={(e) => updateUserRole(u.user_id, e.target.value as "tenant_admin" | "operator" | "financeiro")}
                    >
                      <option value="operator">Operador</option>
                      <option value="tenant_admin">Admin do Tenant</option>
                      <option value="financeiro">Financeiro</option>
                    </select>
                    <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => toggleRow("profiles", "user_id", u.user_id, u.active !== false, `Usuário ${u.active === false ? "ativado" : "inativado"} com sucesso.`)}>
                      {u.active === false ? "Ativar" : "Inativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBox>
      )}

{activeSection === "configuracoes" && canManageUsers && (
        <SectionBox title="Configurações" subtitle="Fluxo unificado no topo para cadastro de operador com vínculo inicial e gestão completa abaixo.">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 mb-4">
            <div className="flex flex-col gap-1 mb-3">
              <p className="font-semibold text-slate-900">Cadastro de Operador e Vínculo</p>
              <p className="text-xs text-slate-600">Use o identificador do usuário e, se quiser, já vincule um guichê inicial no mesmo fluxo.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Identificador do usuário" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
              <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Nome do operador" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              <select className="border rounded-lg px-3 py-2" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "" | "tenant_admin" | "operator" | "financeiro")}>
                <option value="operator">Operador</option>
                <option value="financeiro">Financeiro</option>
                <option value="tenant_admin">Admin do Tenant</option>
              </select>
              <select className="border rounded-lg px-3 py-2" value={newUserActive ? "1" : "0"} onChange={(e) => setNewUserActive(e.target.value === "1")}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
              <select className="border rounded-lg px-3 py-2 md:col-span-3" value={linkBoothId} onChange={(e) => setLinkBoothId(e.target.value)}>
                <option value="">Guichê inicial (opcional)</option>
                {booths.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
              </select>
              <button className="rounded-lg bg-[#0da2e7] text-white px-3 py-2 font-semibold md:col-span-3" onClick={createOperatorAndLink}>Salvar operador e vínculo</button>
            </div>
          </div>

          <div className="rounded-lg border p-3 mb-4 overflow-auto">
            <p className="font-semibold text-slate-800 mb-2">Operadores e seus guichês</p>
            {operatorsWithBooths.length === 0 ? <Empty text="Sem operadores para consolidar." /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="text-left py-2">Nome</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Qtd guichês</th>
                    <th className="text-left py-2">Guichês</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorsWithBooths.map((row) => (
                    <tr key={row.userId} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-800">{row.name}</td>
                      <td className="py-2">{row.role === "tenant_admin" ? "Admin do Tenant" : row.role === "financeiro" ? "Financeiro" : "Operador"}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${row.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {row.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold">{row.boothCount}</td>
                      <td className="py-2">{row.boothCount > 0 ? row.boothList.join(" • ") : "Sem vínculo ativo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
<div className="rounded-lg border p-3 space-y-3">
              <p className="font-semibold text-slate-800">Empresas</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="border rounded-lg px-3 py-2" placeholder="Nova empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.1" placeholder="Comissão (%)" value={companyCommission} onChange={(e) => setCompanyCommission(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" type="number" min="0" placeholder="Repasse (dias)" value={companyPayoutDays} onChange={(e) => setCompanyPayoutDays(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Responsável" value={companyManager} onChange={(e) => setCompanyManager(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="WhatsApp" value={companyWhatsapp} onChange={(e) => setCompanyWhatsapp(e.target.value)} />
                <select className="border rounded-lg px-3 py-2" value={companyRating} onChange={(e) => setCompanyRating(e.target.value as "alta" | "boa" | "media" | "ruim")}>
                  <option value="alta">Alta</option>
                  <option value="boa">Boa</option>
                  <option value="media">Média</option>
                  <option value="ruim">Ruim</option>
                </select>
              </div>
              <button className="rounded-lg bg-[#0da2e7] text-white px-3 py-2" onClick={createCompany}>Cadastrar empresa</button>

              {companies.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
                <div className="max-h-72 overflow-auto space-y-2">
                  {companies.map((c) => {
                    const editing = editingCompanyId === c.id;
                    return (
                      <div key={c.id} className="rounded-lg border p-2 space-y-2">
                        {editing ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input className="border rounded-lg px-3 py-2" value={editingCompanyName} onChange={(e) => setEditingCompanyName(e.target.value)} placeholder="Nome da empresa" />
                            <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.1" value={editingCompanyCommission} onChange={(e) => setEditingCompanyCommission(e.target.value)} placeholder="Comissão (%)" />
                            <input className="border rounded-lg px-3 py-2" type="number" min="0" value={editingCompanyPayoutDays} onChange={(e) => setEditingCompanyPayoutDays(e.target.value)} placeholder="Repasse (dias)" />
                            <input className="border rounded-lg px-3 py-2" value={editingCompanyManager} onChange={(e) => setEditingCompanyManager(e.target.value)} placeholder="Responsável" />
                            <input className="border rounded-lg px-3 py-2" value={editingCompanyWhatsapp} onChange={(e) => setEditingCompanyWhatsapp(e.target.value)} placeholder="WhatsApp" />
                            <select className="border rounded-lg px-3 py-2" value={editingCompanyRating} onChange={(e) => setEditingCompanyRating(e.target.value as "alta" | "boa" | "media" | "ruim")}>
                              <option value="alta">Alta</option>
                              <option value="boa">Boa</option>
                              <option value="media">Média</option>
                              <option value="ruim">Ruim</option>
                            </select>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700">
                            <p className="font-medium text-slate-900">{c.name}</p>
                            <p>Comissão: <span className="font-semibold">{Number(c.commission_percent || 0).toFixed(1)}%</span> • Repasse: <span className="font-semibold">{c.payout_days ?? 0} dias</span></p>
                            <p>Responsável: {c.account_manager || "-"} • WhatsApp: {c.whatsapp || "-"} • Classificação: {c.rating ? c.rating[0].toUpperCase() + c.rating.slice(1) : "-"}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {editing ? (
                            <>
                              <button className="rounded-lg bg-[#0da2e7] text-white px-3 py-1.5 text-xs" onClick={() => saveCompanyEdit(c.id)}>Salvar edição</button>
                              <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={cancelEditCompany}>Cancelar</button>
                            </>
                          ) : (
                            <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => startEditCompany(c)}>Editar</button>
                          )}
                          <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => toggleRow("companies", "id", c.id, c.active, "Empresa atualizada com sucesso.")}>{c.active ? "Inativar" : "Ativar"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <CrudPanel title="Guichês" createForm={<div className="flex gap-2 flex-wrap"><input className="border rounded-lg px-3 py-2 w-28" placeholder="Código (ex.: G01)" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} /><input className="border rounded-lg px-3 py-2 flex-1 min-w-40" placeholder="Nome do guichê (ex.: Guichê Principal)" value={boothName} onChange={(e) => setBoothName(e.target.value)} /><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createBooth}>Cadastrar guichê</button></div>} items={booths.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}`, active: b.active, onToggle: () => toggleRow("booths", "id", b.id, b.active, "Guichê atualizado com sucesso.") }))} />

            <CrudPanel title="Vínculos operador↔guichê" createForm={<div className="flex gap-2 flex-wrap"><select className="border rounded-lg px-3 py-2" value={linkOperatorId} onChange={(e) => setLinkOperatorId(e.target.value)}><option value="">Operador</option>{operators.map((o) => <option key={o.user_id} value={o.user_id}>{o.full_name}</option>)}</select><select className="border rounded-lg px-3 py-2" value={linkBoothId} onChange={(e) => setLinkBoothId(e.target.value)}><option value="">Guichê</option>{booths.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createLink}>Vincular</button></div>} items={links.map((l) => ({ id: l.id, label: `${operatorMap.get(l.operator_id) || "Sem operador"} ↔ ${boothMap.get(l.booth_id) || "Sem guichê"}`, active: l.active, onToggle: () => toggleRow("operator_booths", "id", l.id, l.active, "Vínculo atualizado com sucesso.") }))} />
          </div>
          <div className="rounded-lg border p-3 mt-4">
            <p className="font-semibold text-slate-800 mb-2">Consolidado de vínculos por operador</p>
            {operatorLinkSummary.length === 0 ? <Empty text="Sem operadores para consolidar vínculos." /> : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-500"><th className="text-left py-2">Operador</th><th className="text-right">Guichês ativos</th></tr></thead>
                  <tbody>
                    {operatorLinkSummary.map((item) => (
                      <tr key={item.operatorId} className="border-t"><td className="py-2">{item.operatorName}</td><td className="text-right font-semibold">{item.activeBooths}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionBox>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="bg-white rounded-xl border border-slate-100 p-4"><p className="text-xs uppercase text-slate-500 font-semibold">{title}</p><p className="text-2xl font-bold text-slate-900 mt-1">{value}</p></div>;
}

function SectionBox({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-100 bg-white p-5"><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500 mb-4">{subtitle}</p>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">{text}</div>;
}

function RevenueChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const width = 700;
  const height = 240;
  const padding = 28;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : width - padding * 2;

  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

  return (
    <div className="rb-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="rb-chart-svg" preserveAspectRatio="none" role="img" aria-label="Evolução da receita nos últimos 7 dias">
        <defs>
          <linearGradient id="rbRevenueArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + ((height - padding * 2) / 3) * line;
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} className="rb-chart-grid" />;
        })}
        <path d={areaPath} fill="url(#rbRevenueArea)" />
        <path d={linePath} className="rb-chart-line" />
        {coords.map((coord) => (
          <circle key={coord.label} cx={coord.x} cy={coord.y} r="4.4" className="rb-chart-dot" />
        ))}
      </svg>
      <div className="rb-chart-labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="font-semibold text-slate-800 mb-2">{title}</p>
      {items.length === 0 ? <p className="text-sm text-slate-500">Sem dados.</p> : <ul className="space-y-1 text-sm text-slate-600">{items.map((item, i) => <li key={`${title}-${i}`}>{item}</li>)}</ul>}
    </div>
  );
}

function MiniTable({ title, rows }: { title: string; rows: Array<{ name: string; qty: number; total: number }> }) {
  return (
    <div className="rounded-lg border p-3 overflow-x-auto">
      <p className="font-semibold text-slate-800 mb-2">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-slate-500">Sem dados.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500"><th className="text-left">Nome</th><th className="text-right">Qtd</th><th className="text-right">Total</th></tr></thead>
          <tbody>{rows.slice(0, 10).map((r) => <tr key={`${title}-${r.name}`} className="border-t"><td className="py-1">{r.name}</td><td className="py-1 text-right">{r.qty}</td><td className="py-1 text-right">{brl(r.total)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

function CrudPanel({ title, createForm, items }: { title: string; createForm: React.ReactNode; items: Array<{ id: string; label: string; active: boolean; onToggle: () => void }> }) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <p className="font-semibold text-slate-800">{title}</p>
      {createForm}
      {items.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
        <div className="max-h-64 overflow-auto space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-2 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-700">{item.label}</p>
              <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={item.onToggle}>{item.active ? "Inativar" : "Ativar"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function AdvancedOpsChart({ txs }: { txs: Tx[] }) {
  const points = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDay = new Map<string, number>();

    txs.filter((tx) => tx.status === "posted").forEach((tx) => {
      const key = tx.sold_at.slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    });

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      const key = d.toISOString().slice(0, 10);
      return { label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), value: byDay.get(key) || 0 };
    });
  }, [txs]);

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="grid grid-cols-7 gap-2 items-end h-36">
      {points.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-1">
          <div className="w-full max-w-10 rounded-t bg-sky-500/80" style={{ height: `${Math.max((p.value / max) * 100, 6)}%` }}></div>
          <span className="text-[10px] text-slate-500">{p.label}</span>
          <span className="text-[11px] font-semibold text-slate-700">{p.value}</span>
        </div>
      ))}
    </div>
  );
}














