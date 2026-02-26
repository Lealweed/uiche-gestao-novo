"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, ChartColumn, CircleDollarSign, Download, Landmark, Search, ShieldCheck, Store, UserCog, Users } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { LoadingState } from "@/components/rebuild/ui/loading-state";
import { Card, CardDescription, CardTitle } from "@/components/rebuild/ui/card";

type Profile = { user_id: string; full_name: string; role: "admin" | "operator"; active?: boolean | null };
type Company = { id: string; name: string; commission_percent: number | null; active: boolean };
type Booth = { id: string; code: string; name: string; location: string | null; active: boolean };
type Category = { id: string; name: string; active: boolean };
type Subcategory = { id: string; category_id: string; name: string; active: boolean };
type OperatorBooth = { id: string; operator_id: string; booth_id: string; active: boolean };
type Shift = { id: string; status: "open" | "closed"; opened_at: string; operator_id: string; booth_id: string };
type TransactionBase = {
  id: string;
  sold_at: string;
  amount: number;
  commission_amount: number | null;
  payment_method: "pix" | "credit" | "debit" | "cash";
  status: "posted" | "voided";
  operator_id?: string | null;
  booth_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
};
type Receipt = { id: string; transaction_id: string };
type AdjustmentRequest = {
  id: string;
  transaction_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
type CashClosing = {
  id: string;
  shift_id: string;
  booth_id: string | null;
  user_id: string | null;
  expected_cash: number | null;
  declared_cash: number | null;
  difference: number | null;
  created_at: string;
};

type SectionState = { loading: boolean; error: string | null; warning?: string | null };

function brl(value: number) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function dt(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function paymentMethodLabel(method: "pix" | "credit" | "debit" | "cash") {
  if (method === "credit") return "Crédito";
  if (method === "debit") return "Débito";
  if (method === "cash") return "Dinheiro";
  return "PIX";
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RebuildAdminPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);
  const [links, setLinks] = useState<OperatorBooth[]>([]);

  const [transactions, setTransactions] = useState<TransactionBase[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);

  const [cadState, setCadState] = useState<SectionState>({ loading: true, error: null });
  const [dashState, setDashState] = useState<SectionState>({ loading: true, error: null });
  const [finState, setFinState] = useState<SectionState>({ loading: true, error: null });
  const [relState, setRelState] = useState<SectionState>({ loading: true, error: null });

  const [companyName, setCompanyName] = useState("");
  const [companyCommission, setCompanyCommission] = useState("10");
  const [boothCode, setBoothCode] = useState("");
  const [boothName, setBoothName] = useState("");
  const [boothLocation, setBoothLocation] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [subCategoryParent, setSubCategoryParent] = useState("");
  const [linkOperatorId, setLinkOperatorId] = useState("");
  const [linkBoothId, setLinkBoothId] = useState("");

  const [cadSearch, setCadSearch] = useState("");
  const [finPeriodDays, setFinPeriodDays] = useState("30");
  const [finAdjustmentStatus, setFinAdjustmentStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));

  const operatorNameById = useMemo(() => new Map(operators.map((item) => [item.user_id, item.full_name])), [operators]);
  const boothNameById = useMemo(() => new Map(booths.map((item) => [item.id, `${item.code} - ${item.name}`])), [booths]);
  const categoryNameById = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const subcategoryNameById = useMemo(() => new Map(subcategories.map((item) => [item.id, item.name])), [subcategories]);

  const rangeStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, []);

  const postedTx = useMemo(() => transactions.filter((tx) => tx.status === "posted"), [transactions]);

  const pendingReceiptCount = useMemo(() => {
    const cardTxs = postedTx.filter((tx) => tx.payment_method === "credit" || tx.payment_method === "debit");
    const receiptByTx = new Set(receipts.map((r) => r.transaction_id));
    return cardTxs.filter((tx) => !receiptByTx.has(tx.id)).length;
  }, [postedTx, receipts]);

  const kpis = useMemo(() => {
    const revenue = postedTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const commission = postedTx.reduce((acc, tx) => acc + Number(tx.commission_amount || 0), 0);
    const averageTicket = postedTx.length ? revenue / postedTx.length : 0;
    const openShifts = shifts.filter((item) => item.status === "open").length;
    return { revenue, commission, averageTicket, openShifts };
  }, [postedTx, shifts]);

  const chartData = useMemo(() => {
    const days: Array<{ key: string; label: string; total: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString("pt-BR", { weekday: "short" }), total: 0 });
    }
    for (const tx of postedTx) {
      const key = tx.sold_at.slice(0, 10);
      const day = days.find((item) => item.key === key);
      if (day) day.total += Number(tx.amount || 0);
    }
    const max = Math.max(1, ...days.map((d) => d.total));
    return days.map((d) => ({ ...d, ratio: d.total / max }));
  }, [postedTx]);

  const alerts = useMemo(() => {
    const out: string[] = [];
    if (pendingReceiptCount > 0) out.push(`${pendingReceiptCount} comprovante(s) pendente(s) de cartão.`);
    const pendingAdjustments = adjustments.filter((a) => a.status === "pending").length;
    if (pendingAdjustments > 0) out.push(`${pendingAdjustments} solicitação(ões) de ajuste aguardando análise.`);
    if (kpis.openShifts > 0) out.push(`${kpis.openShifts} turno(s) aberto(s) no momento.`);
    if (out.length === 0) out.push("Operação estável. Nenhum alerta crítico agora.");
    return out;
  }, [adjustments, kpis.openShifts, pendingReceiptCount]);

  const searchNormalized = cadSearch.trim().toLowerCase();
  const filteredCompanies = useMemo(() => companies.filter((i) => !searchNormalized || `${i.name}`.toLowerCase().includes(searchNormalized)), [companies, searchNormalized]);
  const filteredBooths = useMemo(() => booths.filter((i) => !searchNormalized || `${i.code} ${i.name} ${i.location ?? ""}`.toLowerCase().includes(searchNormalized)), [booths, searchNormalized]);
  const filteredOperators = useMemo(() => operators.filter((i) => !searchNormalized || `${i.full_name}`.toLowerCase().includes(searchNormalized)), [operators, searchNormalized]);
  const filteredCategories = useMemo(() => categories.filter((i) => !searchNormalized || `${i.name}`.toLowerCase().includes(searchNormalized)), [categories, searchNormalized]);
  const filteredSubcategories = useMemo(() => subcategories.filter((i) => !searchNormalized || `${i.name} ${categoryNameById.get(i.category_id) ?? ""}`.toLowerCase().includes(searchNormalized)), [subcategories, searchNormalized, categoryNameById]);
  const filteredLinks = useMemo(
    () =>
      links.filter((i) => {
        if (!searchNormalized) return true;
        const op = operatorNameById.get(i.operator_id) ?? i.operator_id;
        const booth = boothNameById.get(i.booth_id) ?? i.booth_id;
        return `${op} ${booth}`.toLowerCase().includes(searchNormalized);
      }),
    [links, searchNormalized, operatorNameById, boothNameById]
  );

  const finDateStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - Number(finPeriodDays || 30));
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, [finPeriodDays]);

  const filteredAdjustments = useMemo(
    () => adjustments.filter((item) => item.created_at >= finDateStart && (finAdjustmentStatus === "all" || item.status === finAdjustmentStatus)),
    [adjustments, finDateStart, finAdjustmentStatus]
  );

  const filteredCashClosings = useMemo(() => cashClosings.filter((item) => item.created_at >= finDateStart), [cashClosings, finDateStart]);

  const reportPeriodTx = useMemo(() => {
    const start = new Date(`${reportFrom}T00:00:00`).toISOString();
    const end = new Date(`${reportTo}T23:59:59`).toISOString();
    return postedTx.filter((tx) => tx.sold_at >= start && tx.sold_at <= end);
  }, [postedTx, reportFrom, reportTo]);

  const reportSummary = useMemo(() => {
    const revenue = reportPeriodTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const commission = reportPeriodTx.reduce((acc, tx) => acc + Number(tx.commission_amount || 0), 0);
    const ticket = reportPeriodTx.length ? revenue / reportPeriodTx.length : 0;
    return { revenue, commission, ticket, count: reportPeriodTx.length };
  }, [reportPeriodTx]);

  function groupBy(items: TransactionBase[], keyFactory: (tx: TransactionBase) => string) {
    const map = new Map<string, { label: string; qty: number; total: number; commission: number }>();
    for (const tx of items) {
      const label = keyFactory(tx);
      const prev = map.get(label) ?? { label, qty: 0, total: 0, commission: 0 };
      prev.qty += 1;
      prev.total += Number(tx.amount || 0);
      prev.commission += Number(tx.commission_amount || 0);
      map.set(label, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  const reportByOperator = useMemo(() => groupBy(reportPeriodTx, (tx) => operatorNameById.get(tx.operator_id || "") ?? "Não informado"), [reportPeriodTx, operatorNameById]);
  const reportByBooth = useMemo(() => groupBy(reportPeriodTx, (tx) => boothNameById.get(tx.booth_id || "") ?? "Não informado"), [reportPeriodTx, boothNameById]);
  const reportByCategory = useMemo(
    () => groupBy(reportPeriodTx, (tx) => `${categoryNameById.get(tx.category_id || "") ?? "Sem categoria"} / ${subcategoryNameById.get(tx.subcategory_id || "") ?? "Sem subcategoria"}`),
    [reportPeriodTx, categoryNameById, subcategoryNameById]
  );

  async function loadAuthAndGuard() {
    setAuthLoading(true);
    const { data } = await supabase.auth.getUser();
    const authUserId = data.user?.id;
    if (!authUserId) return router.replace("/login");

    const profileRes = await supabase.from("profiles").select("role,active").eq("user_id", authUserId).single();
    if (profileRes.error || !profileRes.data) return router.replace("/login");

    const profile = profileRes.data as { role: "admin" | "operator" };
    if (profile.role !== "admin") return router.replace("/rebuild/operator");

    setUserId(authUserId);
    setAuthLoading(false);
  }

  async function loadCadastros() {
    setCadState({ loading: true, error: null, warning: null });
    try {
      const [companiesRes, boothsRes, categoriesRes, subcategoriesRes, operatorsRes, linksRes] = await Promise.all([
        supabase.from("companies").select("id,name,commission_percent,active").order("name"),
        supabase.from("booths").select("id,code,name,location,active").order("name"),
        supabase.from("transaction_categories").select("id,name,active").order("name"),
        supabase.from("transaction_subcategories").select("id,category_id,name,active").order("name"),
        supabase.from("profiles").select("user_id,full_name,role,active").eq("role", "operator").order("full_name"),
        supabase.from("operator_booths").select("id,operator_id,booth_id,active").order("created_at", { ascending: false }),
      ]);

      const warnings: string[] = [];
      if (companiesRes.error) warnings.push("Empresas indisponíveis no momento.");
      if (boothsRes.error) warnings.push("Guichês indisponíveis no momento.");
      if (categoriesRes.error) warnings.push("Categorias indisponíveis no momento.");
      if (subcategoriesRes.error) warnings.push("Subcategorias indisponíveis no momento.");
      if (operatorsRes.error) warnings.push("Operadores indisponíveis no momento.");
      if (linksRes.error) warnings.push("Vínculos indisponíveis no momento.");

      const loadedCategories = (categoriesRes.data as Category[] | null) ?? [];
      setCompanies((companiesRes.data as Company[] | null) ?? []);
      setBooths((boothsRes.data as Booth[] | null) ?? []);
      setCategories(loadedCategories);
      setSubcategories((subcategoriesRes.data as Subcategory[] | null) ?? []);
      setOperators((operatorsRes.data as Profile[] | null) ?? []);
      setLinks((linksRes.data as OperatorBooth[] | null) ?? []);

      setSubCategoryParent((prev) => prev || loadedCategories[0]?.id || "");
      setLinkOperatorId((prev) => prev || ((operatorsRes.data as Profile[] | null) ?? [])[0]?.user_id || "");
      setLinkBoothId((prev) => prev || ((boothsRes.data as Booth[] | null) ?? [])[0]?.id || "");
      setCadState({ loading: false, error: null, warning: warnings[0] ?? null });
    } catch {
      setCadState({ loading: false, error: "Falha ao carregar cadastros. Tente novamente.", warning: null });
    }
  }

  async function loadDashboardAndReports() {
    setDashState({ loading: true, error: null, warning: null });
    setRelState({ loading: true, error: null, warning: null });
    try {
      const [txRes, shiftRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,sold_at,amount,commission_amount,payment_method,status,operator_id,booth_id,category_id,subcategory_id")
          .gte("sold_at", rangeStart)
          .order("sold_at", { ascending: false })
          .limit(3000),
        supabase.from("shifts").select("id,status,opened_at,operator_id,booth_id").order("opened_at", { ascending: false }).limit(120),
      ]);

      const warnings: string[] = [];
      if (txRes.error) warnings.push("Lançamentos indisponíveis para parte dos indicadores.");
      if (shiftRes.error) warnings.push("Turnos indisponíveis no momento.");

      const txList = (txRes.data as TransactionBase[] | null) ?? [];
      const txIds = txList.map((tx) => tx.id);
      const receiptRes = txIds.length ? await supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id", txIds) : ({ data: [], error: null } as any);
      if (receiptRes.error) warnings.push("Comprovantes indisponíveis no momento.");

      setTransactions(txList);
      setReceipts((receiptRes.data as Receipt[] | null) ?? []);
      setShifts((shiftRes.data as Shift[] | null) ?? []);

      setDashState({ loading: false, error: null, warning: warnings[0] ?? null });
      setRelState({ loading: false, error: null, warning: warnings[0] ?? null });
    } catch {
      setDashState({ loading: false, error: "Falha ao carregar dashboard.", warning: null });
      setRelState({ loading: false, error: "Falha ao carregar relatórios.", warning: null });
    }
  }

  async function loadFinanceiro() {
    setFinState({ loading: true, error: null, warning: null });
    try {
      const [adjRes, closingRes] = await Promise.all([
        supabase.from("adjustment_requests").select("id,transaction_id,requested_by,reason,status,created_at").order("created_at", { ascending: false }).limit(120),
        supabase.from("shift_cash_closings").select("id,shift_id,booth_id,user_id,expected_cash,declared_cash,difference,created_at").order("created_at", { ascending: false }).limit(120),
      ]);
      const warnings: string[] = [];
      if (adjRes.error) warnings.push("Solicitações de ajuste indisponíveis no momento.");
      if (closingRes.error) warnings.push("Fechamentos de caixa indisponíveis no momento.");

      setAdjustments((adjRes.data as AdjustmentRequest[] | null) ?? []);
      setCashClosings((closingRes.data as CashClosing[] | null) ?? []);
      setFinState({ loading: false, error: null, warning: warnings[0] ?? null });
    } catch {
      setFinState({ loading: false, error: "Falha ao carregar financeiro.", warning: null });
    }
  }

  async function refreshAllSections() {
    await Promise.all([loadCadastros(), loadDashboardAndReports(), loadFinanceiro()]);
  }

  useEffect(() => {
    loadAuthAndGuard();
  }, []);

  useEffect(() => {
    if (!authLoading && userId) refreshAllSections();
  }, [authLoading, userId]);

  async function createCompany(e: FormEvent) { e.preventDefault(); if (!companyName.trim()) return; setBusyKey("company-create"); setFeedback(null); const res = await supabase.from("companies").insert({ name: companyName.trim(), commission_percent: Number(companyCommission || 0), active: true }); setBusyKey(null); if (res.error) return setFeedback(`Não foi possível criar empresa.`); setCompanyName(""); setCompanyCommission("10"); setFeedback("Empresa criada com sucesso."); await Promise.all([loadCadastros(), loadDashboardAndReports()]); }
  async function toggleCompany(item: Company) { setBusyKey(`company-${item.id}`); const res = await supabase.from("companies").update({ active: !item.active }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar empresa."); await loadCadastros(); }
  async function createBooth(e: FormEvent) { e.preventDefault(); if (!boothCode.trim() || !boothName.trim()) return; setBusyKey("booth-create"); const res = await supabase.from("booths").insert({ code: boothCode.trim(), name: boothName.trim(), location: boothLocation.trim() || null, active: true }); setBusyKey(null); if (res.error) return setFeedback("Não foi possível criar guichê."); setBoothCode(""); setBoothName(""); setBoothLocation(""); setFeedback("Guichê criado com sucesso."); await loadCadastros(); }
  async function toggleBooth(item: Booth) { setBusyKey(`booth-${item.id}`); const res = await supabase.from("booths").update({ active: !item.active }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar guichê."); await loadCadastros(); }
  async function createCategory(e: FormEvent) { e.preventDefault(); if (!categoryName.trim()) return; setBusyKey("category-create"); const res = await supabase.from("transaction_categories").insert({ name: categoryName.trim(), active: true }); setBusyKey(null); if (res.error) return setFeedback("Não foi possível criar categoria."); setCategoryName(""); setFeedback("Categoria criada com sucesso."); await loadCadastros(); }
  async function createSubcategory(e: FormEvent) { e.preventDefault(); if (!subCategoryName.trim() || !subCategoryParent) return; setBusyKey("subcategory-create"); const res = await supabase.from("transaction_subcategories").insert({ name: subCategoryName.trim(), category_id: subCategoryParent, active: true }); setBusyKey(null); if (res.error) return setFeedback("Não foi possível criar subcategoria."); setSubCategoryName(""); setFeedback("Subcategoria criada com sucesso."); await loadCadastros(); }
  async function toggleCategory(item: Category) { setBusyKey(`category-${item.id}`); const res = await supabase.from("transaction_categories").update({ active: !item.active }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar categoria."); await loadCadastros(); }
  async function toggleSubcategory(item: Subcategory) { setBusyKey(`subcategory-${item.id}`); const res = await supabase.from("transaction_subcategories").update({ active: !item.active }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar subcategoria."); await loadCadastros(); }
  async function toggleOperator(item: Profile) { setBusyKey(`operator-${item.user_id}`); const res = await supabase.from("profiles").update({ active: !item.active }).eq("user_id", item.user_id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar operador."); await loadCadastros(); }
  async function createLink(e: FormEvent) { e.preventDefault(); if (!linkOperatorId || !linkBoothId) return; setBusyKey("link-create"); const res = await supabase.from("operator_booths").upsert({ operator_id: linkOperatorId, booth_id: linkBoothId, active: true }, { onConflict: "operator_id,booth_id" }); setBusyKey(null); if (res.error) return setFeedback("Não foi possível criar vínculo."); setFeedback("Vínculo salvo com sucesso."); await loadCadastros(); }
  async function toggleLink(item: OperatorBooth) { setBusyKey(`link-${item.id}`); const res = await supabase.from("operator_booths").update({ active: !item.active }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao atualizar vínculo."); await loadCadastros(); }
  async function reviewAdjustment(item: AdjustmentRequest, nextStatus: "approved" | "rejected") { if (!userId) return; setBusyKey(`adj-${item.id}-${nextStatus}`); const res = await supabase.from("adjustment_requests").update({ status: nextStatus, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", item.id); setBusyKey(null); if (res.error) return setFeedback("Falha ao revisar ajuste."); await Promise.all([loadFinanceiro(), loadDashboardAndReports()]); }

  function exportConsolidadoCsv() {
    downloadCsv(`relatorio-consolidado-${reportFrom}-${reportTo}.csv`, ["Período", "Receita", "Comissão", "Ticket Médio", "Qtd Vendas"], [[`${reportFrom} a ${reportTo}`, reportSummary.revenue.toFixed(2), reportSummary.commission.toFixed(2), reportSummary.ticket.toFixed(2), reportSummary.count]]);
  }
  function exportGroupedCsv(title: string, rows: Array<{ label: string; qty: number; total: number; commission: number }>) {
    downloadCsv(`${title}-${reportFrom}-${reportTo}.csv`, ["Grupo", "Quantidade", "Receita", "Comissão"], rows.map((r) => [r.label, r.qty, r.total.toFixed(2), r.commission.toFixed(2)]));
  }

  if (authLoading) {
    return <div className="rb-page"><SectionHeader title="Painel Administrativo" subtitle="Validando acesso e preparando módulos." /><LoadingState title="Verificando acesso" message="Confirmando sessão e permissões do administrador." /></div>;
  }

  return (
    <div className="rb-page">
      <SectionHeader title="Painel Administrativo" subtitle="Cadastros, financeiro e relatórios executivos em uma visão unificada." className="rb-admin-header" />
      {feedback ? <Card><p className="rb-card-description" style={{ marginTop: 0 }}>{feedback}</p></Card> : null}

      {dashState.loading ? <LoadingState title="Carregando dashboard" message="Consolidando indicadores e alertas operacionais." /> : dashState.error ? <ErrorState title="Falha no dashboard" message={dashState.error} /> : (
        <>
          {dashState.warning ? <Card><p className="text-sm text-amber-700">{dashState.warning}</p></Card> : null}
          <section className="rb-stat-grid" aria-label="Indicadores executivos">
            <StatCard label="Receita (30 dias)" value={brl(kpis.revenue)} delta="Base: transações postadas" icon={<CircleDollarSign size={16} />} />
            <StatCard label="Comissão estimada" value={brl(kpis.commission)} delta="Somatório de comissão registrada" icon={<Landmark size={16} />} />
            <StatCard label="Ticket médio" value={brl(kpis.averageTicket)} delta={`${postedTx.length} venda(s) no período`} icon={<ChartColumn size={16} />} />
            <StatCard label="Turnos abertos" value={String(kpis.openShifts)} delta={kpis.openShifts > 0 ? "Monitorar encerramento" : "Sem turnos em aberto"} icon={<Users size={16} />} />
            <StatCard label="Pendências de comprovante" value={String(pendingReceiptCount)} delta={pendingReceiptCount > 0 ? "Requer ação dos operadores" : "Tudo em dia"} icon={<ShieldCheck size={16} />} />
          </section>
          <section className="rb-grid-3" aria-label="Gráfico e alertas">
            <Card className="md:col-span-2"><CardTitle>Receita diária (últimos 7 dias)</CardTitle><CardDescription>Evolução simples para leitura rápida da operação.</CardDescription><div className="mt-4 grid grid-cols-7 gap-2">{chartData.map((item) => <div key={item.key} className="flex flex-col items-center gap-2"><div className="h-28 w-full rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-end"><div className="w-full rounded-lg bg-blue-500/90" style={{ height: `${Math.max(6, item.ratio * 100)}%`, transition: "height 220ms ease" }} /></div><span className="text-xs text-slate-500">{item.label}</span><span className="text-xs font-semibold text-slate-700">{brl(item.total)}</span></div>)}</div></Card>
            <Card><CardTitle>Alertas operacionais</CardTitle><CardDescription>Foco no que precisa de atenção imediata.</CardDescription><div className="mt-4 space-y-2">{alerts.map((item) => <div key={item} className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 inline-flex items-start gap-2 w-full"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{item}</span></div>)}</div></Card>
          </section>

          <Card className="rb-admin-transactions">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Últimas transações</CardTitle>
                <CardDescription>Movimento recente da operação com dados reais.</CardDescription>
              </div>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="rb-table w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2">Data/Hora</th>
                    <th>Operador</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {postedTx.slice(0, 8).map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-200">
                      <td className="py-2">{dt(tx.sold_at)}</td>
                      <td>{operatorNameById.get(tx.operator_id || "") || "Não informado"}</td>
                      <td>{paymentMethodLabel(tx.payment_method)}</td>
                      <td>
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700">Confirmado</span>
                      </td>
                      <td className="text-right font-semibold">{brl(Number(tx.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {postedTx.length === 0 ? <div className="pt-4"><EmptyState title="Sem transações" message="As transações aparecerão aqui conforme os lançamentos." /></div> : null}
            </div>
          </Card>
        </>
      )}

      {cadState.loading ? <LoadingState title="Carregando cadastros" message="Sincronizando empresas, guichês, categorias e operadores." /> : cadState.error ? <ErrorState title="Falha nos cadastros" message={cadState.error} /> : (
        <section className="rb-grid-3" aria-label="Cadastros principais">
          <Card className="md:col-span-3"><div className="flex items-center gap-3"><Search size={16} /><input className="field" value={cadSearch} onChange={(e) => setCadSearch(e.target.value)} placeholder="Buscar em empresas, guichês, operadores, categorias, subcategorias e vínculos" /></div>{cadState.warning ? <p className="text-xs text-amber-700 mt-2">{cadState.warning}</p> : null}</Card>

          <Card><CardTitle>Empresas</CardTitle><CardDescription>Cadastro comercial com comissão e status operacional.</CardDescription><form className="mt-4 space-y-3" onSubmit={createCompany}><input className="field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" required /><input className="field" type="number" min="0" max="100" step="0.001" value={companyCommission} onChange={(e) => setCompanyCommission(e.target.value)} placeholder="Comissão (%)" required /><button className="btn-primary" disabled={busyKey === "company-create"}>{busyKey === "company-create" ? "Salvando..." : "Criar empresa"}</button></form><div className="mt-4 space-y-2">{filteredCompanies.length === 0 ? <EmptyState title="Sem empresas" message="Nenhum resultado para a busca atual." /> : filteredCompanies.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-slate-500">Comissão: {Number(item.commission_percent || 0).toFixed(3)}%</p></div><button className="btn-ghost" disabled={busyKey === `company-${item.id}`} onClick={() => toggleCompany(item)}>{item.active ? "Desativar" : "Ativar"}</button></div>)}</div></Card>

          <Card><CardTitle>Guichês</CardTitle><CardDescription>Cadastro de pontos de atendimento com controle de status.</CardDescription><form className="mt-4 space-y-3" onSubmit={createBooth}><input className="field" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} placeholder="Código" required /><input className="field" value={boothName} onChange={(e) => setBoothName(e.target.value)} placeholder="Nome do guichê" required /><input className="field" value={boothLocation} onChange={(e) => setBoothLocation(e.target.value)} placeholder="Localização (opcional)" /><button className="btn-primary" disabled={busyKey === "booth-create"}>{busyKey === "booth-create" ? "Salvando..." : "Criar guichê"}</button></form><div className="mt-4 space-y-2">{filteredBooths.length === 0 ? <EmptyState title="Sem guichês" message="Nenhum resultado para a busca atual." /> : filteredBooths.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{item.name} <span className="text-slate-400">({item.code})</span></p><p className="text-xs text-slate-500">{item.location || "Sem localização informada"}</p></div><button className="btn-ghost" disabled={busyKey === `booth-${item.id}`} onClick={() => toggleBooth(item)}>{item.active ? "Desativar" : "Ativar"}</button></div>)}</div></Card>

          <Card><CardTitle>Categorias e Subcategorias</CardTitle><CardDescription>Estrutura de classificação para lançamentos.</CardDescription><form className="mt-4 space-y-3" onSubmit={createCategory}><input className="field" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nova categoria" required /><button className="btn-primary" disabled={busyKey === "category-create"}>{busyKey === "category-create" ? "Salvando..." : "Criar categoria"}</button></form><form className="mt-4 space-y-3" onSubmit={createSubcategory}><select className="field" value={subCategoryParent} onChange={(e) => setSubCategoryParent(e.target.value)} required><option value="">Categoria da subcategoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className="field" value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} placeholder="Nova subcategoria" required /><button className="btn-primary" disabled={busyKey === "subcategory-create"}>{busyKey === "subcategory-create" ? "Salvando..." : "Criar subcategoria"}</button></form><div className="mt-4 space-y-2">{filteredCategories.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{item.name}</p><button className="btn-ghost" disabled={busyKey === `category-${item.id}`} onClick={() => toggleCategory(item)}>{item.active ? "Desativar" : "Ativar"}</button></div><div className="mt-2 space-y-2">{filteredSubcategories.filter((sub) => sub.category_id === item.id).map((sub) => <div key={sub.id} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 flex items-center justify-between gap-2"><span className="text-xs text-slate-700">{sub.name}</span><button className="text-xs text-blue-700" disabled={busyKey === `subcategory-${sub.id}`} onClick={() => toggleSubcategory(sub)}>{sub.active ? "Desativar" : "Ativar"}</button></div>)}</div></div>)}{filteredCategories.length === 0 ? <EmptyState title="Sem categorias" message="Nenhum resultado para a busca atual." /> : null}</div></Card>

          <Card className="md:col-span-2"><CardTitle>Operadores</CardTitle><CardDescription>Gestão de perfis operacionais e vínculo com guichês.</CardDescription><div className="mt-4 overflow-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="py-2">Nome</th><th>Status</th><th>Ação</th></tr></thead><tbody>{filteredOperators.map((item) => <tr key={item.user_id} className="border-t border-slate-200"><td className="py-2">{item.full_name}</td><td>{item.active ? "Ativo" : "Inativo"}</td><td><button className="btn-ghost" disabled={busyKey === `operator-${item.user_id}`} onClick={() => toggleOperator(item)}>{item.active ? "Desativar" : "Ativar"}</button></td></tr>)}</tbody></table>{filteredOperators.length === 0 ? <EmptyState title="Sem operadores" message="Nenhum resultado para a busca atual." /> : null}</div><div className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Vínculo operador ↔ guichê</p><form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={createLink}><select className="field" value={linkOperatorId} onChange={(e) => setLinkOperatorId(e.target.value)} required><option value="">Operador</option>{operators.map((item) => <option key={item.user_id} value={item.user_id}>{item.full_name}</option>)}</select><select className="field" value={linkBoothId} onChange={(e) => setLinkBoothId(e.target.value)} required><option value="">Guichê</option>{booths.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="btn-primary" disabled={busyKey === "link-create"}>{busyKey === "link-create" ? "Salvando..." : "Salvar vínculo"}</button></form><div className="mt-3 space-y-2">{filteredLinks.length === 0 ? <EmptyState title="Sem vínculos" message="Nenhum resultado para a busca atual." /> : filteredLinks.map((item) => <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"><p className="text-sm text-slate-700">{(operatorNameById.get(item.operator_id) || item.operator_id)} → {(boothNameById.get(item.booth_id) || item.booth_id)}</p><button className="btn-ghost" disabled={busyKey === `link-${item.id}`} onClick={() => toggleLink(item)}>{item.active ? "Desativar" : "Ativar"}</button></div>)}</div></div></Card>

          <Card><CardTitle>Resumo de cadastro</CardTitle><CardDescription>Panorama rápido dos cadastros ativos.</CardDescription><div className="mt-4 space-y-2 text-sm"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Building2 size={14} /> Empresas ativas</span><b>{companies.filter((i) => i.active).length}</b></div><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Store size={14} /> Guichês ativos</span><b>{booths.filter((i) => i.active).length}</b></div><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><UserCog size={14} /> Operadores ativos</span><b>{operators.filter((i) => i.active).length}</b></div></div></Card>
        </section>
      )}

      {finState.loading ? <LoadingState title="Carregando financeiro" message="Buscando ajustes e fechamentos de caixa." /> : finState.error ? <ErrorState title="Falha no financeiro" message={finState.error} /> : (
        <section className="rb-grid-3" aria-label="Financeiro e administração">
          <Card className="md:col-span-3"><div className="grid md:grid-cols-3 gap-3"><div><p className="text-sm text-slate-600">Período (dias)</p><select className="field mt-1" value={finPeriodDays} onChange={(e) => setFinPeriodDays(e.target.value)}><option value="7">Últimos 7 dias</option><option value="15">Últimos 15 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div><div><p className="text-sm text-slate-600">Status dos ajustes</p><select className="field mt-1" value={finAdjustmentStatus} onChange={(e) => setFinAdjustmentStatus(e.target.value as any)}><option value="all">Todos</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option></select></div></div>{finState.warning ? <p className="text-xs text-amber-700 mt-2">{finState.warning}</p> : null}</Card>
          <Card className="md:col-span-2"><CardTitle>Ajustes</CardTitle><CardDescription>Gestão por período e status, com ações rápidas.</CardDescription><div className="mt-4 space-y-2">{filteredAdjustments.length === 0 ? <EmptyState title="Sem ajustes no filtro" message="Não há solicitações de ajuste para os filtros atuais." /> : filteredAdjustments.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-semibold">Transação: {item.transaction_id}</p><p className="text-xs text-slate-500 mt-1">Solicitante: {operatorNameById.get(item.requested_by) || item.requested_by} • {dt(item.created_at)} • {item.status.toUpperCase()}</p><p className="text-sm text-slate-700 mt-2">{item.reason}</p>{item.status === "pending" ? <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={busyKey === `adj-${item.id}-approved`} onClick={() => reviewAdjustment(item, "approved")}>Aprovar</button><button className="btn-ghost" disabled={busyKey === `adj-${item.id}-rejected`} onClick={() => reviewAdjustment(item, "rejected")}>Rejeitar</button></div> : null}</div>)}</div></Card>
          <Card><CardTitle>Caixa / Fechamentos</CardTitle><CardDescription>Últimos fechamentos no período selecionado.</CardDescription>{filteredCashClosings.length === 0 ? <div className="mt-4"><EmptyState title="Sem fechamentos" message="Nenhum fechamento encontrado para o período selecionado." /></div> : <div className="mt-4 overflow-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="py-2">Data</th><th>Guichê</th><th>Operador</th><th>Diferença</th></tr></thead><tbody>{filteredCashClosings.map((item) => <tr key={item.id} className="border-t border-slate-200"><td className="py-2">{dt(item.created_at)}</td><td>{(item.booth_id && boothNameById.get(item.booth_id)) || "-"}</td><td>{(item.user_id && operatorNameById.get(item.user_id)) || "-"}</td><td>{brl(Number(item.difference || 0))}</td></tr>)}</tbody></table></div>}</Card>
        </section>
      )}

      {relState.loading ? <LoadingState title="Carregando relatórios" message="Consolidando análises por período, operador, guichê e categoria." /> : relState.error ? <ErrorState title="Falha nos relatórios" message={relState.error} /> : (
        <section className="rb-grid-3" aria-label="Relatórios e exportações">
          <Card className="md:col-span-3"><div className="grid md:grid-cols-3 gap-3"><div><p className="text-sm text-slate-600">Data inicial</p><input className="field mt-1" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} /></div><div><p className="text-sm text-slate-600">Data final</p><input className="field mt-1" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} /></div><div className="flex items-end"><button className="btn-primary w-full inline-flex justify-center items-center gap-2" onClick={exportConsolidadoCsv}><Download size={16} /> Exportar consolidado CSV</button></div></div></Card>

          <Card><CardTitle>Consolidado do período</CardTitle><CardDescription>Receita, comissão e ticket médio.</CardDescription><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Receita</span><b>{brl(reportSummary.revenue)}</b></div><div className="flex justify-between"><span>Comissão</span><b>{brl(reportSummary.commission)}</b></div><div className="flex justify-between"><span>Ticket médio</span><b>{brl(reportSummary.ticket)}</b></div><div className="flex justify-between"><span>Vendas</span><b>{reportSummary.count}</b></div></div></Card>

          <Card><div className="flex items-center justify-between gap-2"><div><CardTitle>Por operador</CardTitle><CardDescription>Ranking por receita.</CardDescription></div><button className="btn-ghost inline-flex items-center gap-2" onClick={() => exportGroupedCsv("relatorio-por-operador", reportByOperator)}><Download size={14} /> CSV</button></div><div className="mt-4 space-y-2">{reportByOperator.slice(0, 7).map((r) => <div key={r.label} className="rounded-lg border border-slate-200 p-2 text-sm"><div className="flex justify-between gap-2"><span className="truncate">{r.label}</span><b>{brl(r.total)}</b></div><div className="text-xs text-slate-500">{r.qty} venda(s)</div></div>)}{reportByOperator.length === 0 ? <EmptyState title="Sem dados" message="Não há vendas no período selecionado." /> : null}</div></Card>

          <Card><div className="flex items-center justify-between gap-2"><div><CardTitle>Por guichê</CardTitle><CardDescription>Desempenho por ponto de atendimento.</CardDescription></div><button className="btn-ghost inline-flex items-center gap-2" onClick={() => exportGroupedCsv("relatorio-por-guiche", reportByBooth)}><Download size={14} /> CSV</button></div><div className="mt-4 space-y-2">{reportByBooth.slice(0, 7).map((r) => <div key={r.label} className="rounded-lg border border-slate-200 p-2 text-sm"><div className="flex justify-between gap-2"><span className="truncate">{r.label}</span><b>{brl(r.total)}</b></div><div className="text-xs text-slate-500">{r.qty} venda(s)</div></div>)}{reportByBooth.length === 0 ? <EmptyState title="Sem dados" message="Não há vendas no período selecionado." /> : null}</div></Card>

          <Card className="md:col-span-2"><div className="flex items-center justify-between gap-2"><div><CardTitle>Por categoria / subcategoria</CardTitle><CardDescription>Visão analítica por tipo de venda.</CardDescription></div><button className="btn-ghost inline-flex items-center gap-2" onClick={() => exportGroupedCsv("relatorio-por-categoria", reportByCategory)}><Download size={14} /> CSV</button></div><div className="mt-4 overflow-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="py-2">Grupo</th><th>Qtd</th><th>Receita</th><th>Comissão</th></tr></thead><tbody>{reportByCategory.slice(0, 60).map((r) => <tr key={r.label} className="border-t border-slate-200"><td className="py-2">{r.label}</td><td>{r.qty}</td><td>{brl(r.total)}</td><td>{brl(r.commission)}</td></tr>)}</tbody></table>{reportByCategory.length === 0 ? <EmptyState title="Sem dados" message="Não há vendas no período selecionado." /> : null}</div></Card>
        </section>
      )}
    </div>
  );
}
