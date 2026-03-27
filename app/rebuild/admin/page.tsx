"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";

const supabase = createClient();

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
type MenuSection = "dashboard"|"operadores"|"gestao"|"financeiro"|"relatorios"|"configuracoes";

function getCompanyPct(c: Company) { return Number(c.commission_percent ?? c.comission_percent ?? 0); }
function nameOf(x: { full_name: string }|{ full_name: string }[]|null) { return Array.isArray(x) ? x[0]?.full_name : x?.full_name; }
function boothOf(x: { name: string; code: string }|{ name: string; code: string }[]|null) { return Array.isArray(x) ? x[0] : x; }

// ── small helper components ───────────────────────────────────
function KpiCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rb-kpi-card" style={accent ? { borderColor: "rgba(245,158,11,0.3)", boxShadow: "var(--ds-glow-amber)" } : {}}>
      <p className="rb-kpi-label">{label}</p>
      <p className="rb-kpi-value" style={accent ? { color: "var(--ds-primary)" } : {}}>{value}</p>
      {hint && <p className="rb-kpi-hint">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rb-panel">
      <div className="rb-panel-head">
        <p className="rb-panel-title">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function DataTable({ heads, children, empty }: { heads: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="rb-table-wrap">
      <table className="rb-table">
        <thead><tr>{heads.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={heads.length} className="rb-table-empty">Nenhum registro encontrado.</td></tr> : children}</tbody>
      </table>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={active ? "rb-badge rb-badge-success" : "rb-badge rb-badge-neutral"}>{active ? "ATIVO" : "INATIVO"}</span>;
}

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rb-nav-item${active ? " active" : ""}`}>
      {label}
    </button>
  );
}

// ── main component ────────────────────────────────────────────
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

  // auth guard
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

  // computed summaries
  const summary = useMemo(() => ({
    totalDia:       rows.reduce((a,r) => a + Number(r.gross_amount||0), 0),
    totalComissao:  rows.reduce((a,r) => a + Number(r.commission_amount||0), 0),
    pendencias:     rows.reduce((a,r) => a + Number(r.missing_card_receipts||0), 0),
    abertos:        rows.filter(r => r.status === "open").length,
  }), [rows]);

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

  // mutations
  async function createCompany(e: FormEvent) {
    e.preventDefault();
    let { error } = await supabase.from("companies").insert({ name: companyName.trim(), commission_percent: Number(companyPct), active: true });
    if (error?.message?.toLowerCase().includes("commission_percent")) {
      const r = await supabase.from("companies").insert({ name: companyName.trim(), comission_percent: Number(companyPct), active: true } as any);
      error = r.error;
    }
    if (error) return setMessage(`Erro: ${error.message}`);
    setCompanyName(""); setCompanyPct("6");
    setMessage("Empresa cadastrada."); await refreshData();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("booths").insert({ code: boothCode.trim().toUpperCase(), name: boothName.trim(), active: true });
    if (error) return setMessage(`Erro: ${error.message}`);
    setBoothCode(""); setBoothName(""); setMessage("Guichê cadastrado."); await refreshData();
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("transaction_categories").insert({ name: categoryName.trim(), active: true });
    if (error) return setMessage(`Erro: ${error.message}`);
    setCategoryName(""); setMessage("Categoria cadastrada."); await refreshData();
  }

  async function createSubcategory(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("transaction_subcategories").insert({ category_id: subcategoryCategoryId, name: subcategoryName.trim(), active: true });
    if (error) return setMessage(`Erro: ${error.message}`);
    setSubcategoryName(""); setSubcategoryCategoryId(""); setMessage("Subcategoria cadastrada."); await refreshData();
  }

  async function linkOperatorToBooth(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("operator_booths").upsert({ operator_id: selectedOperatorId, booth_id: selectedBoothId, active: true });
    if (error) return setMessage(`Erro: ${error.message}`);
    setMessage("Operador vinculado."); await refreshData();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const uid = newProfileUserId.trim();
    const { error } = await supabase.from("profiles").upsert({ user_id: uid, full_name: newProfileName.trim(), cpf: newProfileCpf.trim()||null, address: newProfileAddress.trim()||null, phone: newProfilePhone.trim()||null, avatar_url: newProfileAvatarUrl.trim()||null, role: newProfileRole, active: newProfileActive });
    if (error) return setMessage(`Erro: ${error.message}`);
    setNewProfileUserId(""); setNewProfileName(""); setNewProfileCpf(""); setNewProfilePhone(""); setNewProfileAddress(""); setNewProfileAvatarUrl(""); setNewProfileRole("operator"); setNewProfileActive(true);
    await logAction("UPSERT_PROFILE","profiles",uid,{role:newProfileRole});
    setMessage("Perfil salvo."); await refreshData();
  }

  async function sendResetLink(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    if (error) return setMessage(`Erro: ${error.message}`);
    setResetEmail(""); setMessage("Link de reset enviado.");
  }

  async function toggleCompanyActive(c: Company) { await supabase.from("companies").update({ active: !c.active }).eq("id",c.id); await refreshData(); }
  async function toggleBoothActive(b: Booth) { await supabase.from("booths").update({ active: !b.active }).eq("id",b.id); await refreshData(); }
  async function toggleProfileActive(p: Profile) { await supabase.from("profiles").update({ active: !p.active }).eq("user_id",p.user_id); await refreshData(); }
  async function toggleCategoryActive(c: Category) { await supabase.from("transaction_categories").update({ active: !c.active }).eq("id",c.id); await refreshData(); }
  async function toggleSubcategoryActive(s: Subcategory) { await supabase.from("transaction_subcategories").update({ active: !s.active }).eq("id",s.id); await refreshData(); }

  async function approveAdjustment(adjId: string, txId: string) {
    await supabase.from("transactions").update({ status:"voided" }).eq("id",txId);
    const { data: a } = await supabase.auth.getUser();
    await supabase.from("adjustment_requests").update({ status:"approved", reviewed_by: a.user?.id??null, reviewed_at: new Date().toISOString() }).eq("id",adjId);
    await logAction("APPROVE_ADJUSTMENT","adjustment_requests",adjId,{transaction_id:txId});
    setMessage("Ajuste aprovado."); await refreshData();
  }

  async function rejectAdjustment(adjId: string) {
    const { data: a } = await supabase.auth.getUser();
    await supabase.from("adjustment_requests").update({ status:"rejected", reviewed_by: a.user?.id??null, reviewed_at: new Date().toISOString() }).eq("id",adjId);
    await logAction("REJECT_ADJUSTMENT","adjustment_requests",adjId);
    setMessage("Ajuste rejeitado."); await refreshData();
  }

  async function forceCloseShift(shiftId: string) {
    const { error } = await supabase.rpc("close_shift", { p_shift_id: shiftId, p_ip: null, p_notes: "Encerrado pelo admin" });
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("FORCE_CLOSE_SHIFT","shifts",shiftId);
    setMessage("Turno encerrado."); await refreshData();
  }

  const navSections: { key: MenuSection; label: string }[] = [
    { key:"dashboard", label:"Dashboard" }, { key:"operadores", label:"Operadores" },
    { key:"financeiro", label:"Financeiro" }, { key:"gestao", label:"Gestão" },
    { key:"relatorios", label:"Relatórios" }, { key:"configuracoes", label:"Configurações" },
  ];

  const show = (k: MenuSection) => menu === k;

  return (
    <RebuildShell>
      {/* ── topbar ── */}
      <div className="rb-topbar mb-5">
        <div>
          <p className="rb-topbar-overline">Central Viagem</p>
          <p className="rb-topbar-title">Painel Administrativo</p>
        </div>
        <div className="rb-topbar-actions">
          <button className="rb-btn-ghost" type="button" onClick={() => refreshData()} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <button className="rb-btn-ghost" type="button" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>

      {/* ── layout: sidebar nav + content ── */}
      <div style={{ display:"grid", gap:"1.25rem", gridTemplateColumns:"200px 1fr", alignItems:"start" }}>
        {/* nav sidebar */}
        <nav className="rb-panel" style={{ padding:"0.5rem" }}>
          {navSections.map(s => <NavBtn key={s.key} label={s.label} active={menu===s.key} onClick={()=>setMenu(s.key)} />)}
        </nav>

        {/* main content */}
        <div style={{ display:"grid", gap:"1.25rem" }}>

          {/* global message */}
          {message && (
            <div className="rb-panel" style={{ border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.06)", fontSize:"0.875rem", color:"var(--ds-text)" }}>
              <span style={{ color:"var(--ds-primary)", fontWeight:700 }}>⚡ </span>{message}
              <button type="button" onClick={() => setMessage(null)} style={{ marginLeft:"auto", float:"right", color:"var(--ds-muted)", fontSize:"0.75rem" }}>✕</button>
            </div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {show("dashboard") && (
            <>
              {loading ? (
                <div className="rb-panel rb-table-empty">Carregando indicadores...</div>
              ) : (
                <>
                  <div className="rb-kpi-grid">
                    <KpiCard label="Receita do período" value={`R$ ${summary.totalDia.toFixed(2)}`} hint={`${reportTxs.length} transações`} />
                    <KpiCard label="Comissão estimada"  value={`R$ ${summary.totalComissao.toFixed(2)}`} hint="Base por empresa" />
                    <KpiCard label="Turnos abertos"     value={String(summary.abertos)} accent={summary.abertos>0} hint={`${summary.pendencias} pendência(s)`} />
                    <KpiCard label="Ajustes pendentes"  value={String(adjustments.length)} accent={adjustments.length>0} hint="Aguardando revisão" />
                  </div>

                  {/* Shifts table */}
                  <SectionCard title="Controle de turnos">
                    <DataTable heads={["Guichê","Operador","Status","Receita","Pendências","⚙"]} empty={rows.length===0}>
                      {rows.slice(0,50).map(r => (
                        <tr key={r.shift_id}>
                          <td>{r.booth_name}</td>
                          <td>{r.operator_name}</td>
                          <td><span className={r.status==="open" ? "rb-badge rb-badge-success" : "rb-badge rb-badge-neutral"}>{r.status==="open"?"ABERTO":"FECHADO"}</span></td>
                          <td style={{ fontWeight:700 }}>R$ {Number(r.gross_amount||0).toFixed(2)}</td>
                          <td>{Number(r.missing_card_receipts||0)>0 ? <span className="rb-badge rb-badge-warning">{r.missing_card_receipts}</span> : "—"}</td>
                          <td>{r.status==="open" && <button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.25rem 0.6rem", fontSize:"0.75rem" }} onClick={() => forceCloseShift(r.shift_id)}>Encerrar</button>}</td>
                        </tr>
                      ))}
                    </DataTable>
                  </SectionCard>

                  {/* Adjustments */}
                  {adjustments.length > 0 && (
                    <SectionCard title={`Ajustes pendentes (${adjustments.length})`}>
                      <DataTable heads={["Operador","Motivo","Valor","Empresa","Ação"]} empty={adjustments.length===0}>
                        {adjustments.map(a => (
                          <tr key={a.id}>
                            <td>{nameOf(a.profiles) ?? "—"}</td>
                            <td style={{ maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.reason}</td>
                            <td>{a.transactions ? `R$ ${Number(a.transactions.amount).toFixed(2)}` : "—"}</td>
                            <td>{a.transactions ? nameOf(a.transactions.companies as any) ?? "—" : "—"}</td>
                            <td style={{ display:"flex", gap:"0.4rem" }}>
                              <button type="button" className="rb-btn-primary" style={{ minHeight:"auto", padding:"0.25rem 0.6rem", fontSize:"0.75rem" }} onClick={() => approveAdjustment(a.id, a.transaction_id)}>Aprovar</button>
                              <button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.25rem 0.6rem", fontSize:"0.75rem" }} onClick={() => rejectAdjustment(a.id)}>Rejeitar</button>
                            </td>
                          </tr>
                        ))}
                      </DataTable>
                    </SectionCard>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══ OPERADORES ═══ */}
          {show("operadores") && (
            <SectionCard title="Registro de ponto">
              <DataTable heads={["Data/Hora","Operador","Guichê","Tipo","Obs"]} empty={timePunchRows.length===0}>
                {timePunchRows.slice(0,100).map(p => {
                  const b = boothOf(p.booths);
                  return (
                    <tr key={p.id}>
                      <td>{new Date(p.punched_at).toLocaleString("pt-BR")}</td>
                      <td>{nameOf(p.profiles) ?? "—"}</td>
                      <td>{b ? `${b.code} - ${b.name}` : "—"}</td>
                      <td><span className="rb-badge rb-badge-neutral">{p.punch_type}</span></td>
                      <td>{p.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </DataTable>
            </SectionCard>
          )}

          {/* ═══ FINANCEIRO ═══ */}
          {show("financeiro") && (
            <>
              {/* date filter */}
              <div className="rb-panel">
                <form style={{ display:"flex", flexWrap:"wrap", gap:"0.75rem", alignItems:"flex-end" }} onSubmit={e => { e.preventDefault(); refreshData(); }}>
                  <div>
                    <label className="rb-form-label">Data inicial</label>
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rb-field" />
                  </div>
                  <div>
                    <label className="rb-form-label">Data final</label>
                    <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="rb-field" />
                  </div>
                  <button className="rb-btn-primary" type="submit">Filtrar</button>
                  <button className="rb-btn-ghost" type="button" onClick={() => { setDateFrom(""); setDateTo(""); refreshData("",""); }}>Limpar</button>
                </form>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem" }}>
                <KpiCard label="Suprimento" value={`R$ ${cashMovementTotals.suprimento.toFixed(2)}`} />
                <KpiCard label="Sangria"    value={`R$ ${cashMovementTotals.sangria.toFixed(2)}`} />
                <KpiCard label="Ajuste"     value={`R$ ${cashMovementTotals.ajuste.toFixed(2)}`} />
                <KpiCard label="Saldo caixa" value={`R$ ${cashMovementTotals.saldo.toFixed(2)}`} accent />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem" }}>
                <KpiCard label="Esperado (caixa)" value={`R$ ${cashClosingTotals.expected.toFixed(2)}`} />
                <KpiCard label="Declarado"          value={`R$ ${cashClosingTotals.declared.toFixed(2)}`} />
                <KpiCard label="Diferença"           value={`R$ ${cashClosingTotals.difference.toFixed(2)}`} accent={cashClosingTotals.difference !== 0} />
              </div>

              <SectionCard title="Movimentos de caixa">
                <DataTable heads={["Data","Operador","Guichê","Tipo","Valor","Obs"]} empty={cashMovementRows.length===0}>
                  {cashMovementRows.slice(0,100).map(m => {
                    const b = boothOf(m.booths);
                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                        <td>{nameOf(m.profiles) ?? "—"}</td>
                        <td>{b ? `${b.code} - ${b.name}` : "—"}</td>
                        <td><span className="rb-badge rb-badge-neutral">{m.movement_type}</span></td>
                        <td style={{ fontWeight:700 }}>R$ {Number(m.amount).toFixed(2)}</td>
                        <td>{m.note ?? "—"}</td>
                      </tr>
                    );
                  })}
                </DataTable>
              </SectionCard>

              <SectionCard title="Fechamento de caixa por turno">
                <DataTable heads={["Data","Operador","Guichê","Esperado","Declarado","Diferença","Obs"]} empty={shiftCashClosingRows.length===0}>
                  {shiftCashClosingRows.slice(0,100).map(r => {
                    const b = boothOf(r.booths);
                    const diff = Number(r.difference);
                    return (
                      <tr key={r.id}>
                        <td>{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                        <td>{nameOf(r.profiles) ?? "—"}</td>
                        <td>{b ? `${b.code} - ${b.name}` : "—"}</td>
                        <td>R$ {Number(r.expected_cash).toFixed(2)}</td>
                        <td>R$ {Number(r.declared_cash).toFixed(2)}</td>
                        <td style={{ color: diff===0 ? "var(--ds-success)" : "var(--ds-warning)", fontWeight:700 }}>R$ {diff.toFixed(2)}</td>
                        <td>{r.note ?? "—"}</td>
                      </tr>
                    );
                  })}
                </DataTable>
              </SectionCard>
            </>
          )}

          {/* ═══ RELATÓRIOS ═══ */}
          {show("relatorios") && (
            <SectionCard title="Log de auditoria">
              <DataTable heads={["Data","Usuário","Ação","Entidade"]} empty={auditLogs.length===0}>
                {auditLogs.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                    <td>{nameOf(a.profiles) ?? "—"}</td>
                    <td><span className="rb-badge rb-badge-info">{a.action}</span></td>
                    <td>{a.entity ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          )}

          {/* ═══ GESTÃO ═══ */}
          {show("gestao") && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
              <SectionCard title="Vínculos operador ↔ guichê" action={
                <form onSubmit={linkOperatorToBooth} style={{ display:"flex", gap:"0.5rem" }}>
                  <select className="rb-field" value={selectedOperatorId} onChange={e=>setSelectedOperatorId(e.target.value)} required style={{ minWidth:"140px" }}>
                    <option value="">Operador</option>
                    {profiles.filter(p=>p.role==="operator").map(p=><option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                  </select>
                  <select className="rb-field" value={selectedBoothId} onChange={e=>setSelectedBoothId(e.target.value)} required style={{ minWidth:"120px" }}>
                    <option value="">Guichê</option>
                    {booths.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                  </select>
                  <button className="rb-btn-primary" type="submit">Vincular</button>
                </form>
              }>
                <DataTable heads={["Operador","Guichê","Status","Ação"]} empty={operatorBoothLinks.length===0}>
                  {operatorBoothLinks.map(l => {
                    const b = boothOf(l.booths);
                    return (
                      <tr key={l.id}>
                        <td>{nameOf(l.profiles) ?? "—"}</td>
                        <td>{b ? `${b.code} - ${b.name}` : "—"}</td>
                        <td><StatusBadge active={l.active} /></td>
                        <td>
                          <button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }}
                            onClick={async()=>{ await supabase.from("operator_booths").update({active:!l.active}).eq("id",l.id); await refreshData(); }}>
                            {l.active ? "Desvincular" : "Reativar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              </SectionCard>

              <div style={{ display:"grid", gap:"1.25rem" }}>
                <SectionCard title="Categorias">
                  <form onSubmit={createCategory} style={{ display:"flex", gap:"0.5rem", marginBottom:"0.75rem" }}>
                    <input value={categoryName} onChange={e=>setCategoryName(e.target.value)} required placeholder="Nome da categoria" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">+</button>
                  </form>
                  <DataTable heads={["Nome","Status","Ação"]} empty={categories.length===0}>
                    {categories.map(c=>(
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td><StatusBadge active={c.active} /></td>
                        <td><button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }} onClick={()=>toggleCategoryActive(c)}>{c.active?"Inativar":"Ativar"}</button></td>
                      </tr>
                    ))}
                  </DataTable>
                </SectionCard>

                <SectionCard title="Subcategorias">
                  <form onSubmit={createSubcategory} style={{ display:"flex", gap:"0.5rem", marginBottom:"0.75rem" }}>
                    <select className="rb-field" value={subcategoryCategoryId} onChange={e=>setSubcategoryCategoryId(e.target.value)} required>
                      <option value="">Categoria</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={subcategoryName} onChange={e=>setSubcategoryName(e.target.value)} required placeholder="Subcategoria" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">+</button>
                  </form>
                  <DataTable heads={["Nome","Categoria","Status","Ação"]} empty={subcategories.length===0}>
                    {subcategories.slice(0,20).map(s=>{
                      const cName = Array.isArray(s.transaction_categories) ? s.transaction_categories[0]?.name : s.transaction_categories?.name;
                      return (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{cName ?? "—"}</td>
                          <td><StatusBadge active={s.active} /></td>
                          <td><button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }} onClick={()=>toggleSubcategoryActive(s)}>{s.active?"Inativar":"Ativar"}</button></td>
                        </tr>
                      );
                    })}
                  </DataTable>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ═══ CONFIGURAÇÕES ═══ */}
          {show("configuracoes") && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
              {/* Perfis */}
              <SectionCard title="Cadastrar / atualizar usuário">
                <form onSubmit={saveProfile} style={{ display:"grid", gap:"0.75rem" }}>
                  <input value={newProfileUserId} onChange={e=>setNewProfileUserId(e.target.value)} required placeholder="UUID do usuário (auth.users.id)" className="rb-field" />
                  <input value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} required placeholder="Nome completo" className="rb-field" />
                  <input value={newProfileCpf} onChange={e=>setNewProfileCpf(e.target.value)} placeholder="CPF" className="rb-field" />
                  <input value={newProfilePhone} onChange={e=>setNewProfilePhone(e.target.value)} placeholder="Telefone" className="rb-field" />
                  <input value={newProfileAddress} onChange={e=>setNewProfileAddress(e.target.value)} placeholder="Endereço" className="rb-field" />
                  <input value={newProfileAvatarUrl} onChange={e=>setNewProfileAvatarUrl(e.target.value)} placeholder="URL avatar" className="rb-field" />
                  <select value={newProfileRole} onChange={e=>setNewProfileRole(e.target.value as "admin"|"operator")} className="rb-field">
                    <option value="operator">Operador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontSize:"0.8125rem" }}>
                    <input type="checkbox" checked={newProfileActive} onChange={e=>setNewProfileActive(e.target.checked)} />
                    Usuário ativo
                  </label>
                  <button className="rb-btn-primary" type="submit">Salvar usuário</button>
                </form>
              </SectionCard>

              <div style={{ display:"grid", gap:"1.25rem" }}>
                {/* Reset Password */}
                <SectionCard title="Redefinição de senha">
                  <form onSubmit={sendResetLink} style={{ display:"grid", gap:"0.75rem" }}>
                    <input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} required type="email" placeholder="E-mail do usuário" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">Enviar link</button>
                  </form>
                </SectionCard>

                {/* Empresa */}
                <SectionCard title="Cadastrar empresa">
                  <form onSubmit={createCompany} style={{ display:"grid", gap:"0.75rem" }}>
                    <input value={companyName} onChange={e=>setCompanyName(e.target.value)} required placeholder="Nome da empresa" className="rb-field" />
                    <input value={companyPct} onChange={e=>setCompanyPct(e.target.value)} required type="number" min="0" step="0.001" placeholder="% Comissão" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">Salvar empresa</button>
                  </form>
                </SectionCard>

                {/* Guichê */}
                <SectionCard title="Cadastrar guichê">
                  <form onSubmit={createBooth} style={{ display:"grid", gap:"0.75rem" }}>
                    <input value={boothCode} onChange={e=>setBoothCode(e.target.value)} required placeholder="Código (ex: G02)" className="rb-field" />
                    <input value={boothName} onChange={e=>setBoothName(e.target.value)} required placeholder="Nome (ex: Guichê 02)" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">Salvar guichê</button>
                  </form>
                </SectionCard>
              </div>

              {/* Lista usuários */}
              <div style={{ gridColumn:"1/-1" }}>
                <SectionCard title="Usuários cadastrados">
                  <input value={profileSearch} onChange={e=>setProfileSearch(e.target.value)} placeholder="Buscar por nome, CPF ou perfil..." className="rb-field" style={{ marginBottom:"0.75rem" }} />
                  <DataTable heads={["Nome","CPF","Telefone","Perfil","Status","Ação"]} empty={filteredProfiles.length===0}>
                    {filteredProfiles.map(p=>(
                      <tr key={p.user_id}>
                        <td style={{ fontWeight:600 }}>{p.full_name}</td>
                        <td>{p.cpf ?? "—"}</td>
                        <td>{p.phone ?? "—"}</td>
                        <td><span className="rb-badge rb-badge-info">{p.role}</span></td>
                        <td><StatusBadge active={p.active} /></td>
                        <td><button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }} onClick={()=>toggleProfileActive(p)}>{p.active?"Inativar":"Ativar"}</button></td>
                      </tr>
                    ))}
                  </DataTable>
                </SectionCard>
              </div>

              {/* Lista empresas */}
              <SectionCard title="Empresas">
                <DataTable heads={["Nome","Comissão","Status","Ação"]} empty={companies.length===0}>
                  {companies.map(c=>(
                    <tr key={c.id}>
                      <td style={{ fontWeight:600 }}>{c.name}</td>
                      <td>{getCompanyPct(c).toFixed(3)}%</td>
                      <td><StatusBadge active={c.active} /></td>
                      <td><button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }} onClick={()=>toggleCompanyActive(c)}>{c.active?"Inativar":"Ativar"}</button></td>
                    </tr>
                  ))}
                </DataTable>
              </SectionCard>

              {/* Lista guichês */}
              <SectionCard title="Guichês">
                <input value={boothSearch} onChange={e=>setBoothSearch(e.target.value)} placeholder="Buscar guichê..." className="rb-field" style={{ marginBottom:"0.75rem" }} />
                <DataTable heads={["Código","Nome","Status","Ação"]} empty={filteredBooths.length===0}>
                  {filteredBooths.map(b=>(
                    <tr key={b.id}>
                      <td style={{ fontWeight:700 }}>{b.code}</td>
                      <td>{b.name}</td>
                      <td><StatusBadge active={b.active} /></td>
                      <td><button type="button" className="rb-btn-ghost" style={{ minHeight:"auto", padding:"0.2rem 0.5rem", fontSize:"0.75rem" }} onClick={()=>toggleBoothActive(b)}>{b.active?"Inativar":"Ativar"}</button></td>
                    </tr>
                  ))}
                </DataTable>
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </RebuildShell>
  );
}
