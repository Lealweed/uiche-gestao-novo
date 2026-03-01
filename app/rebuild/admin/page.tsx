"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type AdminSection = "dashboard" | "controle-turno" | "historico" | "relatorios" | "usuarios" | "configuracoes";

type Profile = { user_id: string; full_name: string; role: "tenant_admin" | "operator" | "financeiro" | "admin"; active?: boolean | null; tenant_id?: string | null };
type Shift = { id: string; status: "open" | "closed"; opened_at: string; closed_at?: string | null; operator_id?: string | null; booth_id?: string | null };
type Tx = {
  id: string;
  sold_at: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  status: "posted" | "voided";
  operator_id?: string | null;
  booth_id?: string | null;
  category_id?: string | null;
};
type Company = { id: string; name: string; active: boolean };
type Booth = { id: string; code: string; name: string; active: boolean };
type Category = { id: string; name: string; active: boolean };
type Subcategory = { id: string; name: string; category_id: string; active: boolean };
type OperatorBooth = { id: string; operator_id: string; booth_id: string; active: boolean };

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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [links, setLinks] = useState<OperatorBooth[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [boothCode, setBoothCode] = useState("");
  const [boothName, setBoothName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [subCategoryParentId, setSubCategoryParentId] = useState("");
  const [linkOperatorId, setLinkOperatorId] = useState("");
  const [linkBoothId, setLinkBoothId] = useState("");

  const [historicoOperatorFilter, setHistoricoOperatorFilter] = useState("");
  const [historicoStatusFilter, setHistoricoStatusFilter] = useState("");
  const [historicoDateFilter, setHistoricoDateFilter] = useState("");
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

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
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

  const filteredHistorico = useMemo(() => {
    return txs.filter((t) => {
      if (historicoOperatorFilter && t.operator_id !== historicoOperatorFilter) return false;
      if (historicoStatusFilter && t.status !== historicoStatusFilter) return false;
      if (historicoDateFilter && !t.sold_at.startsWith(historicoDateFilter)) return false;
      return true;
    });
  }, [txs, historicoOperatorFilter, historicoStatusFilter, historicoDateFilter]);

  const filteredReportTx = useMemo(() => {
    return txs.filter((t) => {
      if (reportBoothFilter && t.booth_id !== reportBoothFilter) return false;
      if (reportCategoryFilter && t.category_id !== reportCategoryFilter) return false;
      return t.status === "posted";
    });
  }, [txs, reportBoothFilter, reportCategoryFilter, reportStartDate, reportEndDate]);

  const reportTotals = useMemo(() => {
    const total = filteredReportTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
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
      const [nextProfiles, nextShifts, nextTxs, nextCompanies, nextBooths, nextCategories, nextSubcategories, nextLinks] = await Promise.all([
        loadChunk<Profile>("Usuários", supabase.from("profiles").select("user_id,full_name,role,active,tenant_id").order("full_name")),
        loadChunk<Shift>("Controle de turno", supabase.from("shifts").select("id,status,opened_at,closed_at,operator_id,booth_id").order("opened_at", { ascending: false }).limit(120)),
        loadChunk<Tx>("Histórico", supabase.from("transactions").select("id,sold_at,amount,payment_method,status,operator_id,booth_id,category_id").order("sold_at", { ascending: false }).limit(400)),
        loadChunk<Company>("Empresas", supabase.from("companies").select("id,name,active").order("name")),
        loadChunk<Booth>("Guichês", supabase.from("booths").select("id,code,name,active").order("name")),
        loadChunk<Category>("Categorias", supabase.from("transaction_categories").select("id,name,active").order("name")),
        loadChunk<Subcategory>("Subcategorias", supabase.from("transaction_subcategories").select("id,name,category_id,active").order("name")),
        loadChunk<OperatorBooth>("Vínculos operador↔guichê", supabase.from("operator_booths").select("id,operator_id,booth_id,active").order("id", { ascending: false }).limit(250)),
      ]);

      setProfiles(nextProfiles);
      setShifts(nextShifts);
      setTxs(nextTxs);
      setCompanies(nextCompanies);
      setBooths(nextBooths);
      setCategories(nextCategories);
      setSubcategories(nextSubcategories);
      setLinks(nextLinks);
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
    if (res.error) return setNotice(`Não foi possível atualizar o status: ${res.error.message}`);
    setNotice(okMsg);
    await loadAll();
  }

  async function updateUserRole(userId: string, role: "tenant_admin" | "operator" | "financeiro") {
    const res = await supabase.from("profiles").update({ role }).eq("user_id", userId);
    if (res.error) return setNotice(`Não foi possível atualizar o papel do usuário: ${res.error.message}`);
    setNotice("Papel de usuário atualizado com sucesso.");
    await loadAll();
  }

  async function createCompany() {
    if (!companyName.trim()) return setNotice("Informe o nome da empresa.");
    const res = await supabase.from("companies").insert({ name: companyName.trim(), active: true });
    if (res.error) return setNotice(`Não foi possível cadastrar a empresa: ${res.error.message}`);
    setCompanyName("");
    setNotice("Empresa cadastrada com sucesso.");
    await loadAll();
  }

  async function createBooth() {
    if (!boothCode.trim() || !boothName.trim()) return setNotice("Informe código e nome do guichê.");
    const res = await supabase.from("booths").insert({ code: boothCode.trim(), name: boothName.trim(), active: true });
    if (res.error) return setNotice(`Não foi possível cadastrar o guichê: ${res.error.message}`);
    setBoothCode("");
    setBoothName("");
    setNotice("Guichê cadastrado com sucesso.");
    await loadAll();
  }

  async function createCategory() {
    if (!categoryName.trim()) return setNotice("Informe o nome da categoria.");
    const res = await supabase.from("transaction_categories").insert({ name: categoryName.trim(), active: true });
    if (res.error) return setNotice(`Não foi possível cadastrar a categoria: ${res.error.message}`);
    setCategoryName("");
    setNotice("Categoria cadastrada com sucesso.");
    await loadAll();
  }

  async function createSubcategory() {
    if (!subCategoryName.trim() || !subCategoryParentId) return setNotice("Informe a categoria e o nome da subcategoria.");
    const res = await supabase.from("transaction_subcategories").insert({ name: subCategoryName.trim(), category_id: subCategoryParentId, active: true });
    if (res.error) return setNotice(`Não foi possível cadastrar a subcategoria: ${res.error.message}`);
    setSubCategoryName("");
    setSubCategoryParentId("");
    setNotice("Subcategoria cadastrada com sucesso.");
    await loadAll();
  }

  async function createLink() {
    if (!linkOperatorId || !linkBoothId) return setNotice("Selecione operador e guichê para vincular.");

    const existingLink = links.find((l) => l.operator_id === linkOperatorId && l.booth_id === linkBoothId);
    if (existingLink?.active) return setNotice("Esse vínculo já existe e está ativo.");

    if (existingLink && !existingLink.active) {
      const reactivate = await supabase.from("operator_booths").update({ active: true }).eq("id", existingLink.id);
      if (reactivate.error) return setNotice(`Não foi possível reativar o vínculo: ${reactivate.error.message}`);
      setLinkOperatorId("");
      setLinkBoothId("");
      setNotice("Vínculo reativado com sucesso.");
      await loadAll();
      return;
    }

    const res = await supabase.from("operator_booths").insert({ operator_id: linkOperatorId, booth_id: linkBoothId, active: true });
    if (res.error) return setNotice(`Não foi possível criar o vínculo: ${res.error.message}`);
    setLinkOperatorId("");
    setLinkBoothId("");
    setNotice("Vínculo criado com sucesso.");
    await loadAll();
  }

  function exportCsv() {
    const headers = ["data", "operador", "guiche", "categoria", "valor", "status"];
    const rows = filteredReportTx.map((tx) => [
      new Date(tx.sold_at).toLocaleString("pt-BR"),
      operatorMap.get(tx.operator_id || "") || "Sem operador",
      boothMap.get(tx.booth_id || "") || "Sem guichê",
      categoryMap.get(tx.category_id || "") || "Sem categoria",
      String(Number(tx.amount || 0).toFixed(2)).replace(".", ","),
      tx.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Operadores" value={String(operators.length)} />
          <Card title="Turnos abertos" value={String(openShifts.length)} />
          <Card title="Transações (90d)" value={String(txs.length)} />
          <Card title="Receita lançada" value={brl(txs.filter((t) => t.status === "posted").reduce((a, t) => a + Number(t.amount || 0), 0))} />
        </div>
      )}

      {activeSection === "controle-turno" && (
        <SectionBox title="Controle de Turno" subtitle="Visão de turnos abertos, fechados recentes e pendências por operador.">
          {shifts.length === 0 ? <Empty text="Nenhum turno encontrado." /> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniList title="Turnos abertos" items={openShifts.slice(0, 12).map((s) => `${operatorMap.get(s.operator_id || "") || "Sem operador"} • ${boothMap.get(s.booth_id || "") || "Sem guichê"}`)} />
              <MiniList title="Turnos fechados recentes" items={closedShifts.slice(0, 12).map((s) => `${operatorMap.get(s.operator_id || "") || "Sem operador"} • ${new Date(s.opened_at).toLocaleString("pt-BR")}`)} />
              <MiniList title="Pendências" items={pendingByOperator.slice(0, 12).map((p) => `${operatorMap.get(p.operatorId) || "Sem operador"}: ${p.total} turno(s) aberto(s)`)} />
            </div>
          )}
        </SectionBox>
      )}

      {activeSection === "historico" && (
        <SectionBox title="Histórico" subtitle="Tabela de transações com filtros básicos.">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select className="border rounded-lg px-3 py-2" value={historicoOperatorFilter} onChange={(e) => setHistoricoOperatorFilter(e.target.value)}>
              <option value="">Todos operadores</option>
              {operators.map((op) => <option key={op.user_id} value={op.user_id}>{op.full_name}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2" value={historicoStatusFilter} onChange={(e) => setHistoricoStatusFilter(e.target.value)}>
              <option value="">Todos status</option>
              <option value="posted">Lançado</option>
              <option value="voided">Cancelado</option>
            </select>
            <input className="border rounded-lg px-3 py-2" type="date" value={historicoDateFilter} onChange={(e) => setHistoricoDateFilter(e.target.value)} />
          </div>
          {filteredHistorico.length === 0 ? <Empty text="Sem transações para os filtros selecionados." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">Operador</th><th className="p-2 text-left">Guichê</th><th className="p-2 text-right">Valor</th><th className="p-2 text-left">Status</th></tr></thead>
                <tbody>
                  {filteredHistorico.slice(0, 160).map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="p-2">{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2">{operatorMap.get(tx.operator_id || "") || "Sem operador"}</td>
                      <td className="p-2">{boothMap.get(tx.booth_id || "") || "Sem guichê"}</td>
                      <td className="p-2 text-right">{brl(Number(tx.amount || 0))}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
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
            <button className="rounded-lg bg-[#0da2e7] text-white px-3 py-2 font-semibold" onClick={exportCsv}>Exportar CSV</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card title="Receita consolidada" value={brl(reportTotals.total)} />
            <Card title="Total de transações" value={String(reportTotals.qty)} />
            <Card title="Ticket médio" value={brl(reportTotals.qty ? reportTotals.total / reportTotals.qty : 0)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniTable title="Por operador" rows={reportTotals.byOperator} />
            <MiniTable title="Por guichê" rows={reportTotals.byBooth} />
            <MiniTable title="Por categoria" rows={reportTotals.byCategory} />
          </div>
        </SectionBox>
      )}

      {activeSection === "usuarios" && canManageUsers && (
        <SectionBox title="Usuários" subtitle="Gestão de perfis ativos/inativos e papel de acesso.">
          {users.length === 0 ? <Empty text="Nenhum usuário cadastrado." /> : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.user_id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{u.full_name || "Sem nome"}</p>
                    <p className="text-xs text-slate-500">{u.user_id}</p>
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
        <SectionBox title="Configurações" subtitle="Gestão de empresas, guichês, categorias, subcategorias e vínculos operador↔guichê.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CrudPanel title="Empresas" createForm={<div className="flex gap-2"><input className="border rounded-lg px-3 py-2 flex-1" placeholder="Nova empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createCompany}>Cadastrar</button></div>} items={companies.map((c) => ({ id: c.id, label: c.name, active: c.active, onToggle: () => toggleRow("companies", "id", c.id, c.active, "Empresa atualizada com sucesso.") }))} />

            <CrudPanel title="Guichês" createForm={<div className="flex gap-2"><input className="border rounded-lg px-3 py-2 w-28" placeholder="Código" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} /><input className="border rounded-lg px-3 py-2 flex-1" placeholder="Nome" value={boothName} onChange={(e) => setBoothName(e.target.value)} /><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createBooth}>Cadastrar</button></div>} items={booths.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}`, active: b.active, onToggle: () => toggleRow("booths", "id", b.id, b.active, "Guichê atualizado com sucesso.") }))} />

            <CrudPanel title="Categorias" createForm={<div className="flex gap-2"><input className="border rounded-lg px-3 py-2 flex-1" placeholder="Nova categoria" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createCategory}>Cadastrar</button></div>} items={categories.map((c) => ({ id: c.id, label: c.name, active: c.active, onToggle: () => toggleRow("transaction_categories", "id", c.id, c.active, "Categoria atualizada com sucesso.") }))} />

            <CrudPanel title="Subcategorias" createForm={<div className="flex gap-2 flex-wrap"><select className="border rounded-lg px-3 py-2" value={subCategoryParentId} onChange={(e) => setSubCategoryParentId(e.target.value)}><option value="">Categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="border rounded-lg px-3 py-2 flex-1" placeholder="Nova subcategoria" value={subCategoryName} onChange={(e) => setSubCategoryName(e.target.value)} /><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createSubcategory}>Cadastrar</button></div>} items={subcategories.map((s) => ({ id: s.id, label: `${s.name} (${categoryMap.get(s.category_id) || "Sem categoria"})`, active: s.active, onToggle: () => toggleRow("transaction_subcategories", "id", s.id, s.active, "Subcategoria atualizada com sucesso.") }))} />

            <CrudPanel title="Vínculos operador↔guichê" createForm={<div className="flex gap-2 flex-wrap"><select className="border rounded-lg px-3 py-2" value={linkOperatorId} onChange={(e) => setLinkOperatorId(e.target.value)}><option value="">Operador</option>{operators.map((o) => <option key={o.user_id} value={o.user_id}>{o.full_name}</option>)}</select><select className="border rounded-lg px-3 py-2" value={linkBoothId} onChange={(e) => setLinkBoothId(e.target.value)}><option value="">Guichê</option>{booths.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select><button className="rounded-lg bg-[#0da2e7] text-white px-3" onClick={createLink}>Vincular</button></div>} items={links.map((l) => ({ id: l.id, label: `${operatorMap.get(l.operator_id) || "Sem operador"} ↔ ${boothMap.get(l.booth_id) || "Sem guichê"}`, active: l.active, onToggle: () => toggleRow("operator_booths", "id", l.id, l.active, "Vínculo atualizado com sucesso.") }))} />
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




