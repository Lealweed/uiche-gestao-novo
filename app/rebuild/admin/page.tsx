"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, ChartColumn, CircleDollarSign, Landmark, ShieldCheck, Store, UserCog, Users } from "lucide-react";
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

type SectionState = { loading: boolean; error: string | null };

function brl(value: number) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function dt(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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

  const operatorNameById = useMemo(() => new Map(operators.map((item) => [item.user_id, item.full_name])), [operators]);
  const boothNameById = useMemo(() => new Map(booths.map((item) => [item.id, item.name])), [booths]);
  const categoryNameById = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);

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

  async function loadAuthAndGuard() {
    setAuthLoading(true);

    const { data } = await supabase.auth.getUser();
    const authUserId = data.user?.id;

    if (!authUserId) {
      router.replace("/login");
      return;
    }

    const profileRes = await supabase.from("profiles").select("role,active").eq("user_id", authUserId).single();

    if (profileRes.error || !profileRes.data) {
      router.replace("/login");
      return;
    }

    const profile = profileRes.data as { role: "admin" | "operator"; active?: boolean | null };

    if (profile.role !== "admin") {
      router.replace("/rebuild/operator");
      return;
    }

    setUserId(authUserId);
    setAuthLoading(false);
  }

  async function loadCadastros() {
    setCadState({ loading: true, error: null });

    try {
      const [companiesRes, boothsRes, categoriesRes, subcategoriesRes, operatorsRes, linksRes] = await Promise.all([
        supabase.from("companies").select("id,name,commission_percent,active").order("name"),
        supabase.from("booths").select("id,code,name,location,active").order("name"),
        supabase.from("transaction_categories").select("id,name,active").order("name"),
        supabase.from("transaction_subcategories").select("id,category_id,name,active").order("name"),
        supabase.from("profiles").select("user_id,full_name,role,active").eq("role", "operator").order("full_name"),
        supabase.from("operator_booths").select("id,operator_id,booth_id,active").order("created_at", { ascending: false }),
      ]);

      if (companiesRes.error) throw new Error(`Empresas: ${companiesRes.error.message}`);
      if (boothsRes.error) throw new Error(`Guichês: ${boothsRes.error.message}`);
      if (categoriesRes.error) throw new Error(`Categorias: ${categoriesRes.error.message}`);
      if (subcategoriesRes.error) throw new Error(`Subcategorias: ${subcategoriesRes.error.message}`);
      if (operatorsRes.error) throw new Error(`Operadores: ${operatorsRes.error.message}`);
      if (linksRes.error) throw new Error(`Vínculos: ${linksRes.error.message}`);

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

      setCadState({ loading: false, error: null });
    } catch (e) {
      setCadState({ loading: false, error: e instanceof Error ? e.message : "Falha ao carregar cadastros." });
    }
  }

  async function loadDashboard() {
    setDashState({ loading: true, error: null });

    try {
      const [txRes, shiftRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,sold_at,amount,commission_amount,payment_method,status")
          .gte("sold_at", rangeStart)
          .order("sold_at", { ascending: false })
          .limit(1200),
        supabase.from("shifts").select("id,status,opened_at,operator_id,booth_id").order("opened_at", { ascending: false }).limit(120),
      ]);

      if (txRes.error) throw new Error(`Lançamentos: ${txRes.error.message}`);
      if (shiftRes.error) throw new Error(`Turnos: ${shiftRes.error.message}`);

      const txList = (txRes.data as TransactionBase[] | null) ?? [];
      const txIds = txList.map((tx) => tx.id);

      const receiptRes = txIds.length
        ? await supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id", txIds)
        : ({ data: [], error: null } as any);

      if (receiptRes.error) throw new Error(`Comprovantes: ${receiptRes.error.message}`);

      setTransactions(txList);
      setReceipts((receiptRes.data as Receipt[] | null) ?? []);
      setShifts((shiftRes.data as Shift[] | null) ?? []);

      setDashState({ loading: false, error: null });
    } catch (e) {
      setDashState({ loading: false, error: e instanceof Error ? e.message : "Falha ao carregar dashboard." });
    }
  }

  async function loadFinanceiro() {
    setFinState({ loading: true, error: null });

    try {
      const [adjRes, closingRes] = await Promise.all([
        supabase
          .from("adjustment_requests")
          .select("id,transaction_id,requested_by,reason,status,created_at")
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("shift_cash_closings")
          .select("id,shift_id,booth_id,user_id,expected_cash,declared_cash,difference,created_at")
          .order("created_at", { ascending: false })
          .limit(80),
      ]);

      if (adjRes.error) throw new Error(`Ajustes: ${adjRes.error.message}`);
      if (closingRes.error) throw new Error(`Fechamentos: ${closingRes.error.message}`);

      setAdjustments((adjRes.data as AdjustmentRequest[] | null) ?? []);
      setCashClosings((closingRes.data as CashClosing[] | null) ?? []);

      setFinState({ loading: false, error: null });
    } catch (e) {
      setFinState({ loading: false, error: e instanceof Error ? e.message : "Falha ao carregar financeiro." });
    }
  }

  async function refreshAllSections() {
    await Promise.all([loadCadastros(), loadDashboard(), loadFinanceiro()]);
  }

  useEffect(() => {
    loadAuthAndGuard();
  }, []);

  useEffect(() => {
    if (!authLoading && userId) {
      refreshAllSections();
    }
  }, [authLoading, userId]);

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    setBusyKey("company-create");
    setFeedback(null);

    const res = await supabase.from("companies").insert({
      name: companyName.trim(),
      commission_percent: Number(companyCommission || 0),
      active: true,
    });

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Não foi possível criar empresa: ${res.error.message}`);
      return;
    }

    setCompanyName("");
    setCompanyCommission("10");
    setFeedback("Empresa criada com sucesso.");
    await Promise.all([loadCadastros(), loadDashboard()]);
  }

  async function toggleCompany(item: Company) {
    setBusyKey(`company-${item.id}`);
    setFeedback(null);

    const res = await supabase.from("companies").update({ active: !item.active }).eq("id", item.id);

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar empresa: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    if (!boothCode.trim() || !boothName.trim()) return;

    setBusyKey("booth-create");
    setFeedback(null);

    const res = await supabase.from("booths").insert({
      code: boothCode.trim(),
      name: boothName.trim(),
      location: boothLocation.trim() || null,
      active: true,
    });

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Não foi possível criar guichê: ${res.error.message}`);
      return;
    }

    setBoothCode("");
    setBoothName("");
    setBoothLocation("");
    setFeedback("Guichê criado com sucesso.");
    await loadCadastros();
  }

  async function toggleBooth(item: Booth) {
    setBusyKey(`booth-${item.id}`);
    setFeedback(null);

    const res = await supabase.from("booths").update({ active: !item.active }).eq("id", item.id);

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar guichê: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setBusyKey("category-create");
    setFeedback(null);

    const res = await supabase.from("transaction_categories").insert({ name: categoryName.trim(), active: true });

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Não foi possível criar categoria: ${res.error.message}`);
      return;
    }

    setCategoryName("");
    setFeedback("Categoria criada com sucesso.");
    await loadCadastros();
  }

  async function createSubcategory(e: FormEvent) {
    e.preventDefault();
    if (!subCategoryName.trim() || !subCategoryParent) return;

    setBusyKey("subcategory-create");
    setFeedback(null);

    const res = await supabase.from("transaction_subcategories").insert({
      name: subCategoryName.trim(),
      category_id: subCategoryParent,
      active: true,
    });

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Não foi possível criar subcategoria: ${res.error.message}`);
      return;
    }

    setSubCategoryName("");
    setFeedback("Subcategoria criada com sucesso.");
    await loadCadastros();
  }

  async function toggleCategory(item: Category) {
    setBusyKey(`category-${item.id}`);
    setFeedback(null);
    const res = await supabase.from("transaction_categories").update({ active: !item.active }).eq("id", item.id);
    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar categoria: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function toggleSubcategory(item: Subcategory) {
    setBusyKey(`subcategory-${item.id}`);
    setFeedback(null);
    const res = await supabase.from("transaction_subcategories").update({ active: !item.active }).eq("id", item.id);
    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar subcategoria: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function toggleOperator(item: Profile) {
    setBusyKey(`operator-${item.user_id}`);
    setFeedback(null);
    const res = await supabase.from("profiles").update({ active: !item.active }).eq("user_id", item.user_id);
    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar operador: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function createLink(e: FormEvent) {
    e.preventDefault();
    if (!linkOperatorId || !linkBoothId) return;

    setBusyKey("link-create");
    setFeedback(null);

    const res = await supabase.from("operator_booths").upsert(
      {
        operator_id: linkOperatorId,
        booth_id: linkBoothId,
        active: true,
      },
      { onConflict: "operator_id,booth_id" }
    );

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Não foi possível criar vínculo: ${res.error.message}`);
      return;
    }

    setFeedback("Vínculo operador↔guichê salvo.");
    await loadCadastros();
  }

  async function toggleLink(item: OperatorBooth) {
    setBusyKey(`link-${item.id}`);
    setFeedback(null);

    const res = await supabase.from("operator_booths").update({ active: !item.active }).eq("id", item.id);

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao atualizar vínculo: ${res.error.message}`);
      return;
    }

    await loadCadastros();
  }

  async function reviewAdjustment(item: AdjustmentRequest, nextStatus: "approved" | "rejected") {
    if (!userId) return;

    setBusyKey(`adj-${item.id}-${nextStatus}`);
    setFeedback(null);

    const res = await supabase
      .from("adjustment_requests")
      .update({ status: nextStatus, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", item.id);

    setBusyKey(null);

    if (res.error) {
      setFeedback(`Falha ao revisar ajuste: ${res.error.message}`);
      return;
    }

    await Promise.all([loadFinanceiro(), loadDashboard()]);
  }

  if (authLoading) {
    return (
      <div className="rb-page">
        <SectionHeader title="Painel Administrativo" subtitle="Validando acesso e preparando módulos." />
        <LoadingState title="Verificando acesso" message="Confirmando sessão e permissões do administrador." />
      </div>
    );
  }

  return (
    <div className="rb-page">
      <SectionHeader
        title="Painel Administrativo"
        subtitle="Visão executiva, cadastros essenciais e financeiro em uma operação limpa e estável."
      />

      {feedback ? (
        <Card>
          <p className="rb-card-description" style={{ marginTop: 0 }}>{feedback}</p>
        </Card>
      ) : null}

      {dashState.loading ? (
        <LoadingState title="Carregando dashboard" message="Consolidando indicadores e alertas operacionais." />
      ) : dashState.error ? (
        <ErrorState title="Falha no dashboard" message={dashState.error} />
      ) : (
        <>
          <section className="rb-stat-grid" aria-label="Indicadores executivos">
            <StatCard label="Receita (30 dias)" value={brl(kpis.revenue)} delta="Base: transações postadas" icon={<CircleDollarSign size={16} />} />
            <StatCard label="Comissão estimada" value={brl(kpis.commission)} delta="Somatório de comissão registrada" icon={<Landmark size={16} />} />
            <StatCard label="Ticket médio" value={brl(kpis.averageTicket)} delta={`${postedTx.length} venda(s) no período`} icon={<ChartColumn size={16} />} />
            <StatCard label="Turnos abertos" value={String(kpis.openShifts)} delta={kpis.openShifts > 0 ? "Monitorar encerramento" : "Sem turnos em aberto"} icon={<Users size={16} />} />
            <StatCard label="Pendências de comprovante" value={String(pendingReceiptCount)} delta={pendingReceiptCount > 0 ? "Requer ação dos operadores" : "Tudo em dia"} icon={<ShieldCheck size={16} />} />
          </section>

          <section className="rb-grid-3" aria-label="Gráfico e alertas">
            <Card className="md:col-span-2">
              <CardTitle>Receita diária (últimos 7 dias)</CardTitle>
              <CardDescription>Evolução simples para leitura rápida da operação.</CardDescription>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {chartData.map((item) => (
                  <div key={item.key} className="flex flex-col items-center gap-2">
                    <div className="h-28 w-full rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-end">
                      <div
                        className="w-full rounded-lg bg-blue-500/90"
                        style={{ height: `${Math.max(6, item.ratio * 100)}%`, transition: "height 220ms ease" }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{brl(item.total)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>Alertas operacionais</CardTitle>
              <CardDescription>Foco no que precisa de atenção imediata.</CardDescription>
              <div className="mt-4 space-y-2">
                {alerts.map((item) => (
                  <div key={item} className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900 inline-flex items-start gap-2 w-full">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}

      {cadState.loading ? (
        <LoadingState title="Carregando cadastros" message="Sincronizando empresas, guichês, categorias e operadores." />
      ) : cadState.error ? (
        <ErrorState title="Falha nos cadastros" message={cadState.error} />
      ) : (
        <section className="rb-grid-3" aria-label="Cadastros principais">
          <Card>
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Cadastro comercial com comissão e status operacional.</CardDescription>
            <form className="mt-4 space-y-3" onSubmit={createCompany}>
              <input className="field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" required />
              <input className="field" type="number" min="0" max="100" step="0.001" value={companyCommission} onChange={(e) => setCompanyCommission(e.target.value)} placeholder="Comissão (%)" required />
              <button className="btn-primary" disabled={busyKey === "company-create"}>{busyKey === "company-create" ? "Salvando..." : "Criar empresa"}</button>
            </form>
            <div className="mt-4 space-y-2">
              {companies.length === 0 ? <EmptyState title="Sem empresas" message="Crie a primeira empresa para iniciar a operação." /> : companies.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-slate-500">Comissão: {Number(item.commission_percent || 0).toFixed(3)}%</p>
                  </div>
                  <button className="btn-ghost" disabled={busyKey === `company-${item.id}`} onClick={() => toggleCompany(item)}>
                    {item.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Guichês</CardTitle>
            <CardDescription>Cadastro de pontos de atendimento com controle de status.</CardDescription>
            <form className="mt-4 space-y-3" onSubmit={createBooth}>
              <input className="field" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} placeholder="Código" required />
              <input className="field" value={boothName} onChange={(e) => setBoothName(e.target.value)} placeholder="Nome do guichê" required />
              <input className="field" value={boothLocation} onChange={(e) => setBoothLocation(e.target.value)} placeholder="Localização (opcional)" />
              <button className="btn-primary" disabled={busyKey === "booth-create"}>{busyKey === "booth-create" ? "Salvando..." : "Criar guichê"}</button>
            </form>
            <div className="mt-4 space-y-2">
              {booths.length === 0 ? <EmptyState title="Sem guichês" message="Crie guichês para habilitar turnos de operação." /> : booths.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.name} <span className="text-slate-400">({item.code})</span></p>
                    <p className="text-xs text-slate-500">{item.location || "Sem localização informada"}</p>
                  </div>
                  <button className="btn-ghost" disabled={busyKey === `booth-${item.id}`} onClick={() => toggleBooth(item)}>{item.active ? "Desativar" : "Ativar"}</button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Categorias e Subcategorias</CardTitle>
            <CardDescription>Estrutura de classificação para lançamentos.</CardDescription>
            <form className="mt-4 space-y-3" onSubmit={createCategory}>
              <input className="field" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nova categoria" required />
              <button className="btn-primary" disabled={busyKey === "category-create"}>{busyKey === "category-create" ? "Salvando..." : "Criar categoria"}</button>
            </form>
            <form className="mt-4 space-y-3" onSubmit={createSubcategory}>
              <select className="field" value={subCategoryParent} onChange={(e) => setSubCategoryParent(e.target.value)} required>
                <option value="">Categoria da subcategoria</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input className="field" value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} placeholder="Nova subcategoria" required />
              <button className="btn-primary" disabled={busyKey === "subcategory-create"}>{busyKey === "subcategory-create" ? "Salvando..." : "Criar subcategoria"}</button>
            </form>
            <div className="mt-4 space-y-2">
              {categories.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <button className="btn-ghost" disabled={busyKey === `category-${item.id}`} onClick={() => toggleCategory(item)}>{item.active ? "Desativar" : "Ativar"}</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {subcategories.filter((sub) => sub.category_id === item.id).map((sub) => (
                      <div key={sub.id} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-700">{sub.name}</span>
                        <button className="text-xs text-blue-700" disabled={busyKey === `subcategory-${sub.id}`} onClick={() => toggleSubcategory(sub)}>
                          {sub.active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {categories.length === 0 ? <EmptyState title="Sem categorias" message="Cadastre categorias para organizar os lançamentos." /> : null}
            </div>
          </Card>

          <Card className="md:col-span-2">
            <CardTitle>Operadores</CardTitle>
            <CardDescription>Gestão de perfis operacionais e vínculo com guichês.</CardDescription>

            <div className="mt-4 overflow-auto">
              {operators.length === 0 ? (
                <EmptyState title="Sem operadores" message="Nenhum perfil de operador encontrado no momento." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2">Nome</th>
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((item) => (
                      <tr key={item.user_id} className="border-t border-slate-200">
                        <td className="py-2">{item.full_name}</td>
                        <td>{item.active ? "Ativo" : "Inativo"}</td>
                        <td>
                          <button className="btn-ghost" disabled={busyKey === `operator-${item.user_id}`} onClick={() => toggleOperator(item)}>
                            {item.active ? "Desativar" : "Ativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">Vínculo operador ↔ guichê</p>
              <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={createLink}>
                <select className="field" value={linkOperatorId} onChange={(e) => setLinkOperatorId(e.target.value)} required>
                  <option value="">Operador</option>
                  {operators.map((item) => <option key={item.user_id} value={item.user_id}>{item.full_name}</option>)}
                </select>
                <select className="field" value={linkBoothId} onChange={(e) => setLinkBoothId(e.target.value)} required>
                  <option value="">Guichê</option>
                  {booths.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button className="btn-primary" disabled={busyKey === "link-create"}>{busyKey === "link-create" ? "Salvando..." : "Salvar vínculo"}</button>
              </form>

              <div className="mt-3 space-y-2">
                {links.length === 0 ? (
                  <EmptyState title="Sem vínculos" message="Crie vínculos para liberar guichês aos operadores." />
                ) : (
                  links.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-700">
                        {(operatorNameById.get(item.operator_id) || item.operator_id)} → {(boothNameById.get(item.booth_id) || item.booth_id)}
                      </p>
                      <button className="btn-ghost" disabled={busyKey === `link-${item.id}`} onClick={() => toggleLink(item)}>
                        {item.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Resumo de cadastro</CardTitle>
            <CardDescription>Panorama rápido dos cadastros ativos.</CardDescription>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Building2 size={14} /> Empresas ativas</span><b>{companies.filter((i) => i.active).length}</b></div>
              <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Store size={14} /> Guichês ativos</span><b>{booths.filter((i) => i.active).length}</b></div>
              <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><UserCog size={14} /> Operadores ativos</span><b>{operators.filter((i) => i.active).length}</b></div>
            </div>
          </Card>
        </section>
      )}

      {finState.loading ? (
        <LoadingState title="Carregando financeiro" message="Buscando ajustes pendentes e fechamentos de caixa." />
      ) : finState.error ? (
        <ErrorState title="Falha no financeiro" message={finState.error} />
      ) : (
        <section className="rb-grid-3" aria-label="Financeiro e administração">
          <Card className="md:col-span-2">
            <CardTitle>Ajustes pendentes</CardTitle>
            <CardDescription>Aprovação ou rejeição de solicitações com status pendente.</CardDescription>
            {adjustments.filter((item) => item.status === "pending").length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Sem ajustes pendentes" message="Nenhuma solicitação aguardando análise neste momento." />
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {adjustments.filter((item) => item.status === "pending").map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold">Transação: {item.transaction_id}</p>
                    <p className="text-xs text-slate-500 mt-1">Solicitante: {operatorNameById.get(item.requested_by) || item.requested_by} • {dt(item.created_at)}</p>
                    <p className="text-sm text-slate-700 mt-2">{item.reason}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="btn-primary" disabled={busyKey === `adj-${item.id}-approved`} onClick={() => reviewAdjustment(item, "approved")}>Aprovar</button>
                      <button className="btn-ghost" disabled={busyKey === `adj-${item.id}-rejected`} onClick={() => reviewAdjustment(item, "rejected")}>Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Caixa / Fechamentos</CardTitle>
            <CardDescription>Leitura dos últimos fechamentos registrados.</CardDescription>
            {cashClosings.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Sem fechamentos" message="Os fechamentos de caixa aparecerão aqui quando forem registrados." />
              </div>
            ) : (
              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2">Data</th>
                      <th>Guichê</th>
                      <th>Operador</th>
                      <th>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashClosings.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="py-2">{dt(item.created_at)}</td>
                        <td>{(item.booth_id && boothNameById.get(item.booth_id)) || "-"}</td>
                        <td>{(item.user_id && operatorNameById.get(item.user_id)) || "-"}</td>
                        <td>{brl(Number(item.difference || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
