"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type ShiftTotal = {
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

type Company = { id: string; name: string; commission_percent: number; active: boolean };
type Booth = { id: string; code: string; name: string; active: boolean };
type Category = { id: string; name: string; active: boolean };
type Subcategory = { id: string; name: string; active: boolean; category_id: string; transaction_categories?: { name: string } | { name: string }[] | null };
type Adjustment = {
  id: string;
  transaction_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  transactions: { amount: number; payment_method: string; companies: { name: string } | { name: string }[] | null } | null;
};

type TxForReport = {
  amount: number;
  sold_at?: string;
  operator_id?: string;
  booth_id?: string;
  profiles?: { full_name: string } | { full_name: string }[] | null;
  booths?: { name: string; code: string } | { name: string; code: string }[] | null;
  transaction_categories: { name: string } | { name: string }[] | null;
  transaction_subcategories: { name: string } | { name: string }[] | null;
};

type Profile = { user_id: string; full_name: string; role: "admin" | "operator"; active: boolean };
type OperatorBoothLink = {
  id: string;
  active: boolean;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { name: string; code: string } | { name: string; code: string }[] | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string | null;
  details: Record<string, unknown>;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ShiftTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [operatorBoothLinks, setOperatorBoothLinks] = useState<OperatorBoothLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportTxs, setReportTxs] = useState<TxForReport[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companyPct, setCompanyPct] = useState("6");
  const [boothCode, setBoothCode] = useState("");
  const [boothName, setBoothName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [selectedBoothId, setSelectedBoothId] = useState("");
  const [newProfileUserId, setNewProfileUserId] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileRole, setNewProfileRole] = useState<"admin" | "operator">("operator");
  const [newProfileActive, setNewProfileActive] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (profile?.role !== "admin") return router.push("/operator");

      await refreshData();
      setLoading(false);
    })();
  }, [router]);

  async function refreshData() {
    const startIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : null;
    const endIso = dateTo ? `${dateTo}T23:59:59.999Z` : null;

    let shiftQuery = supabase.from("v_shift_totals").select("*").order("opened_at", { ascending: false }).limit(200);
    let txQuery = supabase
      .from("transactions")
      .select("amount,sold_at,operator_id,booth_id,profiles(full_name),booths(name,code),transaction_categories(name),transaction_subcategories(name)")
      .eq("status", "posted")
      .order("sold_at", { ascending: false })
      .limit(5000);

    if (startIso) {
      shiftQuery = shiftQuery.gte("opened_at", startIso);
      txQuery = txQuery.gte("sold_at", startIso);
    }
    if (endIso) {
      shiftQuery = shiftQuery.lte("opened_at", endIso);
      txQuery = txQuery.lte("sold_at", endIso);
    }

    const [shiftRes, companyRes, boothRes, catRes, subRes, profileRes, linkRes, auditRes, txRes, adjRes] = await Promise.all([
      shiftQuery,
      supabase.from("companies").select("id,name,commission_percent,active").order("name"),
      supabase.from("booths").select("id,code,name,active").order("name"),
      supabase.from("transaction_categories").select("id,name,active").order("name"),
      supabase.from("transaction_subcategories").select("id,name,active,category_id,transaction_categories(name)").order("name"),
      supabase.from("profiles").select("user_id,full_name,role,active").order("full_name"),
      supabase.from("operator_booths").select("id,active,profiles(full_name),booths(name,code)").order("created_at", { ascending: false }).limit(200),
      supabase.from("audit_logs").select("id,action,entity,details,created_at,profiles(full_name)").order("created_at", { ascending: false }).limit(50),
      txQuery,
      supabase
        .from("adjustment_requests")
        .select("id,transaction_id,reason,status,created_at,profiles(full_name),transactions(amount,payment_method,companies(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    setRows((shiftRes.data as ShiftTotal[]) ?? []);
    setCompanies((companyRes.data as Company[]) ?? []);
    setBooths((boothRes.data as Booth[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setSubcategories(((subRes.data ?? []) as unknown as Subcategory[]) ?? []);
    setProfiles((profileRes.data as Profile[]) ?? []);
    setOperatorBoothLinks(((linkRes.data ?? []) as unknown as OperatorBoothLink[]) ?? []);
    setAuditLogs(((auditRes.data ?? []) as unknown as AuditLog[]) ?? []);
    setReportTxs(((txRes.data ?? []) as unknown as TxForReport[]) ?? []);
    setAdjustments(((adjRes.data ?? []) as unknown) as Adjustment[]);
  }

  const summary = useMemo(() => {
    const totalDia = rows.reduce((acc, r) => acc + Number(r.gross_amount || 0), 0);
    const totalComissao = rows.reduce((acc, r) => acc + Number(r.commission_amount || 0), 0);
    const pendencias = rows.reduce((acc, r) => acc + Number(r.missing_card_receipts || 0), 0);
    const abertos = rows.filter((r) => r.status === "open").length;
    return { totalDia, totalComissao, pendencias, abertos };
  }, [rows]);

  const reportByCategory = useMemo(() => {
    const map = new Map<string, { category: string; subcategory: string; total: number; qty: number }>();

    for (const tx of reportTxs) {
      const cat = Array.isArray(tx.transaction_categories) ? tx.transaction_categories[0]?.name : tx.transaction_categories?.name;
      const sub = Array.isArray(tx.transaction_subcategories) ? tx.transaction_subcategories[0]?.name : tx.transaction_subcategories?.name;
      const category = cat ?? "Sem categoria";
      const subcategory = sub ?? "Sem subcategoria";
      const key = `${category}::${subcategory}`;

      const prev = map.get(key) ?? { category, subcategory, total: 0, qty: 0 };
      prev.total += Number(tx.amount || 0);
      prev.qty += 1;
      map.set(key, prev);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportTxs]);

  const reportByOperator = useMemo(() => {
    const map = new Map<string, { operator: string; qty: number; total: number }>();
    for (const tx of reportTxs) {
      const op = Array.isArray(tx.profiles) ? tx.profiles[0]?.full_name : tx.profiles?.full_name;
      const operator = op ?? "Sem operador";
      const prev = map.get(operator) ?? { operator, qty: 0, total: 0 };
      prev.qty += 1;
      prev.total += Number(tx.amount || 0);
      map.set(operator, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportTxs]);

  const reportByBooth = useMemo(() => {
    const map = new Map<string, { booth: string; qty: number; total: number }>();
    for (const tx of reportTxs) {
      const boothObj = Array.isArray(tx.booths) ? tx.booths[0] : tx.booths;
      const booth = boothObj ? `${boothObj.code} - ${boothObj.name}` : "Sem guichê";
      const prev = map.get(booth) ?? { booth, qty: 0, total: 0 };
      prev.qty += 1;
      prev.total += Number(tx.amount || 0);
      map.set(booth, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportTxs]);

  const auditTimeline = useMemo(() => {
    return rows.slice(0, 20).map((r) => ({
      when: r.status === "closed" ? "Turno fechado" : "Turno em andamento",
      at: r.status === "closed" ? r.shift_id : r.shift_id,
      text: `${r.booth_name} • ${r.operator_name} • R$ ${Number(r.gross_amount).toFixed(2)}`,
      status: r.status,
    }));
  }, [rows]);

  async function applyPeriodFilter(e: FormEvent) {
    e.preventDefault();
    await refreshData();
  }

  async function clearPeriodFilter() {
    setDateFrom("");
    setDateTo("");
    setTimeout(() => {
      refreshData();
    }, 0);
  }

  function downloadCsv(filename: string, header: string[], lines: string[][]) {
    const csv = [header, ...lines]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCategoryCsv() {
    const header = ["Categoria", "Subcategoria", "Quantidade", "Total"];
    const lines = reportByCategory.map((r) => [r.category, r.subcategory, String(r.qty), r.total.toFixed(2)]);
    downloadCsv(`relatorio-categorias-${new Date().toISOString().slice(0, 10)}.csv`, header, lines);
  }

  function exportOperatorCsv() {
    const header = ["Operador", "Quantidade", "Total"];
    const lines = reportByOperator.map((r) => [r.operator, String(r.qty), r.total.toFixed(2)]);
    downloadCsv(`relatorio-operadores-${new Date().toISOString().slice(0, 10)}.csv`, header, lines);
  }

  function exportBoothCsv() {
    const header = ["Guichê", "Quantidade", "Total"];
    const lines = reportByBooth.map((r) => [r.booth, String(r.qty), r.total.toFixed(2)]);
    downloadCsv(`relatorio-guiches-${new Date().toISOString().slice(0, 10)}.csv`, header, lines);
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("companies").insert({
      name: companyName.trim(),
      commission_percent: Number(companyPct),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar empresa: ${error.message}`);
    setCompanyName("");
    setCompanyPct("6");
    await logAction("CREATE_COMPANY", "companies", undefined, { name: companyName.trim(), pct: Number(companyPct) });
    setMessage("Empresa cadastrada com sucesso.");
    await refreshData();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("booths").insert({
      code: boothCode.trim().toUpperCase(),
      name: boothName.trim(),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar guichê: ${error.message}`);
    setBoothCode("");
    setBoothName("");
    await logAction("CREATE_BOOTH", "booths", undefined, { code: boothCode.trim().toUpperCase(), name: boothName.trim() });
    setMessage("Guichê cadastrado com sucesso.");
    await refreshData();
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("transaction_categories").insert({
      name: categoryName.trim(),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar categoria: ${error.message}`);
    setCategoryName("");
    await logAction("CREATE_CATEGORY", "transaction_categories", undefined, { name: categoryName.trim() });
    setMessage("Categoria cadastrada com sucesso.");
    await refreshData();
  }

  async function createSubcategory(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("transaction_subcategories").insert({
      category_id: subcategoryCategoryId,
      name: subcategoryName.trim(),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar subcategoria: ${error.message}`);
    setSubcategoryName("");
    setSubcategoryCategoryId("");
    await logAction("CREATE_SUBCATEGORY", "transaction_subcategories", undefined, { name: subcategoryName.trim(), category_id: subcategoryCategoryId });
    setMessage("Subcategoria cadastrada com sucesso.");
    await refreshData();
  }

  async function linkOperatorToBooth(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("operator_booths").upsert({
      operator_id: selectedOperatorId,
      booth_id: selectedBoothId,
      active: true,
    });

    if (error) return setMessage(`Erro ao vincular operador: ${error.message}`);
    await logAction("LINK_OPERATOR_BOOTH", "operator_booths", undefined, { operator_id: selectedOperatorId, booth_id: selectedBoothId });
    setMessage("Operador vinculado ao guichê com sucesso.");
    await refreshData();
  }

  async function toggleProfileActive(profile: Profile) {
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ active: !profile.active })
      .eq("user_id", profile.user_id);

    if (error) return setMessage(`Erro ao atualizar usuário: ${error.message}`);
    await logAction("TOGGLE_PROFILE_ACTIVE", "profiles", profile.user_id, { active: !profile.active });
    setMessage("Status do usuário atualizado.");
    await refreshData();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("profiles").upsert({
      user_id: newProfileUserId.trim(),
      full_name: newProfileName.trim(),
      role: newProfileRole,
      active: newProfileActive,
    });

    if (error) return setMessage(`Erro ao salvar usuário: ${error.message}`);
    await logAction("UPSERT_PROFILE", "profiles", newProfileUserId.trim(), { role: newProfileRole, active: newProfileActive });
    setMessage("Usuário salvo com sucesso (perfil).\nObs: login/auth deve existir no Supabase Auth.");
    setNewProfileUserId("");
    setNewProfileName("");
    setNewProfileRole("operator");
    setNewProfileActive(true);
    await refreshData();
  }

  async function sendResetLink(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    if (error) return setMessage(`Erro ao enviar reset: ${error.message}`);
    await logAction("SEND_PASSWORD_RESET", "auth", undefined, { email: resetEmail.trim() });
    setMessage("Link de redefinição enviado para o e-mail informado.");
    setResetEmail("");
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    await supabase.from("audit_logs").insert({
      created_by: authData.user.id,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      details: details ?? {},
    });
  }

  async function approveAdjustment(adjId: string, txId: string) {
    setMessage(null);

    const { error: txErr } = await supabase
      .from("transactions")
      .update({ status: "voided" })
      .eq("id", txId);

    if (txErr) return setMessage(`Erro ao estornar transação: ${txErr.message}`);

    const { data: authData } = await supabase.auth.getUser();
    const { error: adjErr } = await supabase
      .from("adjustment_requests")
      .update({ status: "approved", reviewed_by: authData.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", adjId);

    if (adjErr) return setMessage(`Erro ao aprovar ajuste: ${adjErr.message}`);

    await logAction("APPROVE_ADJUSTMENT", "adjustment_requests", adjId, { transaction_id: txId });
    setMessage("Ajuste aprovado e transação estornada.");
    await refreshData();
  }

  async function rejectAdjustment(adjId: string) {
    setMessage(null);
    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("adjustment_requests")
      .update({ status: "rejected", reviewed_by: authData.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", adjId);

    if (error) return setMessage(`Erro ao rejeitar ajuste: ${error.message}`);
    await logAction("REJECT_ADJUSTMENT", "adjustment_requests", adjId);
    setMessage("Solicitação rejeitada.");
    await refreshData();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs mb-2">● Produção</div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
            <p className="muted">Gestão central de guichês, empresas e fechamento.</p>
          </div>
          <button onClick={logout} className="btn-ghost">Sair</button>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Receita do período" value={`R$ ${summary.totalDia.toFixed(2)}`} />
          <Card label="Comissão estimada" value={`R$ ${summary.totalComissao.toFixed(2)}`} />
          <Card label="Turnos abertos" value={String(summary.abertos)} />
          <Card label="Pendências" value={String(summary.pendencias)} />
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Financeiro</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">PIX</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_pix||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Crédito</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_credit||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Débito</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_debit||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Dinheiro</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_cash||0),0).toFixed(2)}</span></div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Cadastros</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="Guichês" value={String(booths.length)} />
              <MiniStat label="Empresas" value={String(companies.length)} />
              <MiniStat label="Usuários" value={String(profiles.length)} />
              <MiniStat label="Categorias" value={String(categories.length)} />
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">CRM Operacional</h2>
            <p className="text-sm text-slate-400">Central de guichês, colaboradores e auditoria em tempo real.</p>
            <div className="mt-3 text-xs text-slate-500">Use os blocos abaixo para gerenciar cadastros, vínculos e relatórios.</div>
          </div>
        </section>

        <form onSubmit={applyPeriodFilter} className="glass-card p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-slate-400">Data inicial</label>
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Data final</label>
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="field mt-1" />
          </div>
          <button className="btn-primary" type="submit">Aplicar filtro</button>
          <button className="btn-ghost" type="button" onClick={clearPeriodFilter}>Limpar</button>
          <button className="btn-ghost" type="button" onClick={exportCategoryCsv}>CSV Categorias</button>
          <button className="btn-ghost" type="button" onClick={exportOperatorCsv}>CSV Operadores</button>
          <button className="btn-ghost" type="button" onClick={exportBoothCsv}>CSV Guichês</button>
        </form>

        <section className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={saveProfile} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar/Atualizar usuário (perfil)</h2>
            <input value={newProfileUserId} onChange={(e)=>setNewProfileUserId(e.target.value)} required placeholder="UUID do usuário (auth.users.id)" className="field" />
            <input value={newProfileName} onChange={(e)=>setNewProfileName(e.target.value)} required placeholder="Nome completo" className="field" />
            <select value={newProfileRole} onChange={(e)=>setNewProfileRole(e.target.value as "admin"|"operator")} className="field">
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={newProfileActive} onChange={(e)=>setNewProfileActive(e.target.checked)} />
              Usuário ativo
            </label>
            <button className="btn-primary">Salvar usuário</button>
          </form>

          <form onSubmit={sendResetLink} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Enviar link de redefinição de senha</h2>
            <input value={resetEmail} onChange={(e)=>setResetEmail(e.target.value)} required placeholder="E-mail do usuário" className="field" type="email" />
            <button className="btn-primary">Enviar reset</button>
          </form>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={createCompany} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Empresa</h2>
            <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} required placeholder="Nome da empresa" className="field" />
            <input value={companyPct} onChange={(e)=>setCompanyPct(e.target.value)} required type="number" min="0" step="0.001" placeholder="% comissão" className="field" />
            <button className="btn-primary">Salvar empresa</button>
          </form>

          <form onSubmit={createBooth} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Guichê</h2>
            <input value={boothCode} onChange={(e)=>setBoothCode(e.target.value)} required placeholder="Código (ex: G02)" className="field" />
            <input value={boothName} onChange={(e)=>setBoothName(e.target.value)} required placeholder="Nome (ex: Guichê 02)" className="field" />
            <button className="btn-primary">Salvar guichê</button>
          </form>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={createCategory} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Categoria</h2>
            <input value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} required placeholder="Ex: Venda de Passagem" className="field" />
            <button className="btn-primary">Salvar categoria</button>
          </form>

          <form onSubmit={createSubcategory} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Subcategoria</h2>
            <select value={subcategoryCategoryId} onChange={(e)=>setSubcategoryCategoryId(e.target.value)} required className="field">
              <option value="">Selecione a categoria</option>
              {categories.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={subcategoryName} onChange={(e)=>setSubcategoryName(e.target.value)} required placeholder="Ex: Interestadual" className="field" />
            <button className="btn-primary">Salvar subcategoria</button>
          </form>
        </section>

        {message && (
          <section className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-3 text-blue-300 text-sm">
            {message}
          </section>
        )}

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Empresas</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Nome</th><th>%</th><th>Status</th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2">{c.name}</td>
                    <td>{Number(c.commission_percent).toFixed(3)}%</td>
                    <td>{c.active ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Guichês</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Código</th><th>Nome</th><th>Status</th></tr>
              </thead>
              <tbody>
                {booths.map((b) => (
                  <tr key={b.id} className="border-t border-slate-800">
                    <td className="py-2">{b.code}</td>
                    <td>{b.name}</td>
                    <td>{b.active ? "Ativo" : "Inativo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Categorias</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Categoria</th><th>Status</th></tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2">{c.name}</td>
                    <td>{c.active ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Subcategorias</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Subcategoria</th><th>Categoria</th><th>Status</th></tr>
              </thead>
              <tbody>
                {subcategories.map((s) => {
                  const cName = Array.isArray(s.transaction_categories) ? s.transaction_categories[0]?.name : s.transaction_categories?.name;
                  return (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="py-2">{s.name}</td>
                      <td>{cName ?? "-"}</td>
                      <td>{s.active ? "Ativa" : "Inativa"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={linkOperatorToBooth} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Vincular operador ao guichê</h2>
            <select className="field" value={selectedOperatorId} onChange={(e)=>setSelectedOperatorId(e.target.value)} required>
              <option value="">Selecione operador</option>
              {profiles.filter((p)=>p.role === "operator").map((p)=>(
                <option key={p.user_id} value={p.user_id}>{p.full_name} {p.active ? "" : "(inativo)"}</option>
              ))}
            </select>
            <select className="field" value={selectedBoothId} onChange={(e)=>setSelectedBoothId(e.target.value)} required>
              <option value="">Selecione guichê</option>
              {booths.filter((b)=>b.active).map((b)=>(
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
            <button className="btn-primary">Vincular</button>
          </form>

          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Usuários</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Nome</th><th>Perfil</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.user_id} className="border-t border-slate-800">
                    <td className="py-2">{p.full_name}</td>
                    <td>{p.role}</td>
                    <td>{p.active ? "Ativo" : "Inativo"}</td>
                    <td>
                      <button className="text-blue-300 hover:underline" onClick={() => toggleProfileActive(p)}>
                        {p.active ? "Inativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Vínculos operador ↔ guichê</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="py-2">Operador</th><th>Guichê</th><th>Status</th></tr>
            </thead>
            <tbody>
              {operatorBoothLinks.map((l) => {
                const op = Array.isArray(l.profiles) ? l.profiles[0]?.full_name : l.profiles?.full_name;
                const booth = Array.isArray(l.booths) ? l.booths[0] : l.booths;
                return (
                  <tr key={l.id} className="border-t border-slate-800">
                    <td className="py-2">{op ?? "-"}</td>
                    <td>{booth ? `${booth.code} - ${booth.name}` : "-"}</td>
                    <td>{l.active ? "Ativo" : "Inativo"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="glass-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Relatório por categoria/subcategoria</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="py-2">Categoria</th><th>Subcategoria</th><th>Qtd</th><th>Total</th></tr>
            </thead>
            <tbody>
              {reportByCategory.map((r) => (
                <tr key={`${r.category}-${r.subcategory}`} className="border-t border-slate-800">
                  <td className="py-2">{r.category}</td>
                  <td>{r.subcategory}</td>
                  <td>{r.qty}</td>
                  <td>R$ {r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Relatório por operador</h2>
            <div className="space-y-3">
              {reportByOperator.slice(0, 8).map((r) => (
                <BarRow key={r.operator} label={r.operator} value={r.total} max={reportByOperator[0]?.total ?? 1} />
              ))}
            </div>
          </div>

          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Relatório por guichê</h2>
            <div className="space-y-3">
              {reportByBooth.slice(0, 8).map((r) => (
                <BarRow key={r.booth} label={r.booth} value={r.total} max={reportByBooth[0]?.total ?? 1} />
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Timeline operacional (auditoria)</h2>
          <ul className="space-y-2 text-sm">
            {auditLogs.map((log) => {
              const who = Array.isArray(log.profiles) ? log.profiles[0]?.full_name : log.profiles?.full_name;
              return (
                <li key={log.id} className="border-b border-slate-800 pb-2">
                  <span className="text-cyan-300">{log.action}</span>
                  <span className="text-slate-300"> — {who ?? "Usuário"} • {new Date(log.created_at).toLocaleString("pt-BR")}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Solicitações de ajuste</h2>
          {adjustments.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma solicitação pendente.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Hora</th><th>Operador</th><th>Empresa</th><th>Método</th><th>Valor</th><th>Motivo</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {adjustments.map((a) => {
                  const op = Array.isArray(a.profiles) ? a.profiles[0]?.full_name : a.profiles?.full_name;
                  const comp = Array.isArray(a.transactions?.companies) ? a.transactions?.companies[0]?.name : a.transactions?.companies?.name;
                  return (
                    <tr key={a.id} className="border-t border-slate-800">
                      <td className="py-2">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                      <td>{op ?? "-"}</td>
                      <td>{comp ?? "-"}</td>
                      <td>{a.transactions?.payment_method ?? "-"}</td>
                      <td>R$ {Number(a.transactions?.amount ?? 0).toFixed(2)}</td>
                      <td>{a.reason}</td>
                      <td className="space-x-3">
                        <button onClick={() => approveAdjustment(a.id, a.transaction_id)} className="text-green-300 hover:underline">Aprovar</button>
                        <button onClick={() => rejectAdjustment(a.id)} className="text-red-300 hover:underline">Rejeitar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Últimos turnos</h2>
          {loading ? <p className="text-slate-400">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2">Guichê</th><th>Operador</th><th>Status</th><th>Total</th><th>PIX</th><th>Crédito</th><th>Débito</th><th>Pendências</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.shift_id} className="border-t border-slate-800">
                    <td className="py-2">{r.booth_name}</td>
                    <td>{r.operator_name}</td>
                    <td>{r.status}</td>
                    <td>R$ {Number(r.gross_amount).toFixed(2)}</td>
                    <td>R$ {Number(r.total_pix).toFixed(2)}</td>
                    <td>R$ {Number(r.total_credit).toFixed(2)}</td>
                    <td>R$ {Number(r.total_debit).toFixed(2)}</td>
                    <td>{r.missing_card_receipts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-slate-400">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / (max || 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 truncate max-w-[70%]">{label}</span>
        <span className="text-slate-400">R$ {value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
