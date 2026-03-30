"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { Input, Select } from "@/components/rebuild/ui/input";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Card } from "@/components/rebuild/ui/card";
import { Toast, type ToastType } from "@/components/rebuild/ui/toast";
import { exportToCSV } from "@/lib/csv-export";


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
// KpiCard substituído por StatCard do kit

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


function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "ATIVO" : "INATIVO"}</Badge>;
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

  // sync shell menu clicks
  useEffect(() => {
    function handleSectionChange(e: Event) {
      const section = (e as CustomEvent).detail;
      const map: Record<string, MenuSection> = {
        "dashboard": "dashboard",
        "controle-turno": "dashboard",
        "financeiro": "financeiro",
        "relatorios": "relatorios",
        "usuarios": "gestao",
        "empresas": "gestao",
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

  // computed summaries
  const repassesComputed = useMemo(() => {
    let faturamento = 0;
    let central = 0;
    let repasse = 0;
    const comps = new Map<string, { id: string, name: string, amount: number, central: number, repasse: number }>();
    
    // pctMap to quickly get the commission percentage of each company
    const pctMap = new Map(companies.map(c => [c.id, getCompanyPct(c)]));

    // reportTxs is already filtered by date and status = 'posted'
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

  function handleExportCSV() {
    exportToCSV("repasses-viacao", repassesComputed.viacoes, [
      { key: "name", label: "Empresa / Viação" },
      { key: "amount", label: "Faturamento Bruto" },
      { key: "central", label: "Taxa Retida (Central)" },
      { key: "repasse", label: "Repasse Líquido" },
    ]);
  }

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
          <Toast message={message} type={toastType} onClose={() => setMessage(null)} />

          {/* ═══ DASHBOARD ═══ */}
          {show("dashboard") && (
            <>
              {loading ? (
                <div className="rb-panel rb-table-empty">Carregando indicadores...</div>
              ) : (
                <>
                  <div className="rb-panel mb-6">
                    <form style={{ display:"flex", flexWrap:"wrap", gap:"0.75rem", alignItems:"flex-end" }} onSubmit={e => { e.preventDefault(); refreshData(); }}>
                      <div>
                        <label className="rb-form-label">Data inicial</label>
                        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rb-field" />
                      </div>
                      <div>
                        <label className="rb-form-label">Data final</label>
                        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="rb-field" />
                      </div>
                      <button className="rb-btn-primary" type="submit">Filtrar período</button>
                      <button className="rb-btn-ghost" type="button" onClick={() => { setDateFrom(""); setDateTo(""); refreshData("",""); }}>Limpar</button>
                    </form>
                  </div>

                  <SectionHeader title="Auditoria e Repasses (Consolidado do período)" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-2">
                    <StatCard label="Faturamento Total" value={`R$ ${repassesComputed.faturamento.toFixed(2)}`} delta={`${reportTxs.length} transações`} />
                    <StatCard label="Caixa na Central" value={`R$ ${repassesComputed.central.toFixed(2)}`} delta="Lucro (taxas)" />
                    <StatCard label="Valor a Repassar" value={`R$ ${repassesComputed.repasse.toFixed(2)}`} delta="Para viações" />
                  </div>

                  <Card className="p-0 mb-6 relative">
                    <div className="absolute top-4 right-4 z-10">
                      <Button variant="ghost" size="sm" type="button" onClick={handleExportCSV}>Exportar CSV</Button>
                    </div>
                    <SectionHeader title="Consolidado por Viação" />
                    <DataTable
                      columns={[
                        { key: "empresa", header: "Empresa / Viação", render: (v) => <span className="font-semibold">{v.name}</span> },
                        { key: "faturamento", header: "Faturamento Bruto", render: (v) => `R$ ${v.amount.toFixed(2)}` },
                        { key: "central", header: "Taxa Retida (Central)", render: (v) => <span className="text-emerald-400 font-bold">R$ {v.central.toFixed(2)}</span> },
                        { key: "repasse", header: "Repasse Líquido", render: (v) => <span className="text-amber-500 font-bold">R$ {v.repasse.toFixed(2)}</span> },
                      ]}
                      rows={repassesComputed.viacoes}
                      emptyMessage="Nenhum faturamento registrado no período."
                    />
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-8">
                    <StatCard label="Turnos abertos" value={String(summary.abertos)} delta={`${summary.pendencias} pendência(s)`} />
                    <StatCard label="Ajustes pendentes" value={String(adjustments.length)} delta="Aguardando revisão" />
                    <StatCard label="Logs recentes" value={String(auditLogs.length)} delta="Registros de auditoria" />
                  </div>

                  {/* Shifts table */}
                  <Card className="p-0">
                    <SectionHeader title="Controle de turnos" />
                    <DataTable
                      columns={[
                        { key: "booth", header: "Guichê", render: (r) => r.booth_name },
                        { key: "operator", header: "Operador", render: (r) => r.operator_name },
                        { key: "status", header: "Status", render: (r) => <Badge variant={r.status==="open"?"success":"neutral"}>{r.status==="open"?"ABERTO":"FECHADO"}</Badge> },
                        { key: "receita", header: "Receita", render: (r) => <span className="font-bold">R$ {Number(r.gross_amount||0).toFixed(2)}</span> },
                        { key: "pendencias", header: "Pendências", render: (r) => Number(r.missing_card_receipts||0)>0 ? <Badge variant="warning">{r.missing_card_receipts}</Badge> : "—" },
                        { key: "acao", header: "⚙", render: (r) => r.status==="open" ? <Button variant="ghost" size="sm" onClick={()=>forceCloseShift(r.shift_id)}>Encerrar</Button> : null },
                      ]}
                      rows={rows.slice(0,50)}
                      emptyMessage="Nenhum turno encontrado."
                      className="mt-2"
                    />
                  </Card>

                  {/* Adjustments */}
                  {adjustments.length > 0 && (
                    <Card className="p-0">
                      <SectionHeader title={`Ajustes pendentes (${adjustments.length})`} />
                      <DataTable
                        columns={[
                          { key: "operador", header: "Operador", render: (a) => nameOf(a.profiles) ?? "—" },
                          { key: "motivo", header: "Motivo", render: (a) => <span className="truncate max-w-[200px]">{a.reason}</span> },
                          { key: "valor", header: "Valor", render: (a) => a.transactions ? `R$ ${Number(a.transactions.amount).toFixed(2)}` : "—" },
                          { key: "empresa", header: "Empresa", render: (a) => a.transactions ? nameOf(a.transactions.companies as any) ?? "—" : "—" },
                          { key: "acao", header: "Ação", render: (a) => (
                            <div className="flex gap-2">
                              <Button variant="primary" size="sm" onClick={()=>approveAdjustment(a.id, a.transaction_id)}>Aprovar</Button>
                              <Button variant="ghost" size="sm" onClick={()=>rejectAdjustment(a.id)}>Rejeitar</Button>
                            </div>
                          ) },
                        ]}
                        rows={adjustments}
                        emptyMessage="Nenhum ajuste pendente."
                        className="mt-2"
                      />
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══ OPERADORES ═══ */}
          {show("operadores") && (
            <Card className="p-0">
              <SectionHeader title="Registro de ponto" />
              <DataTable
                columns={[
                  { key: "data", header: "Data/Hora", render: (p) => new Date(p.punched_at).toLocaleString("pt-BR") },
                  { key: "operador", header: "Operador", render: (p) => nameOf(p.profiles) ?? "—" },
                  { key: "guiche", header: "Guichê", render: (p) => { const b = boothOf(p.booths); return b ? `${b.code} - ${b.name}` : "—"; } },
                  { key: "tipo", header: "Tipo", render: (p) => <Badge variant="neutral">{p.punch_type}</Badge> },
                  { key: "obs", header: "Obs", render: (p) => p.note ?? "—" },
                ]}
                rows={timePunchRows.slice(0,100)}
                emptyMessage="Nenhum registro de ponto."
                className="mt-2"
              />
            </Card>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Suprimento" value={`R$ ${cashMovementTotals.suprimento.toFixed(2)}`} />
                <StatCard label="Sangria" value={`R$ ${cashMovementTotals.sangria.toFixed(2)}`} />
                <StatCard label="Ajuste" value={`R$ ${cashMovementTotals.ajuste.toFixed(2)}`} />
                <StatCard label="Saldo caixa" value={`R$ ${cashMovementTotals.saldo.toFixed(2)}`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard label="Esperado (caixa)" value={`R$ ${cashClosingTotals.expected.toFixed(2)}`} />
                <StatCard label="Declarado" value={`R$ ${cashClosingTotals.declared.toFixed(2)}`} />
                <StatCard label="Diferença" value={`R$ ${cashClosingTotals.difference.toFixed(2)}`} />
              </div>

              <Card className="p-0">
                <SectionHeader title="Movimentos de caixa" />
                <DataTable
                  columns={[
                    { key: "data", header: "Data", render: (m) => new Date(m.created_at).toLocaleString("pt-BR") },
                    { key: "operador", header: "Operador", render: (m) => nameOf(m.profiles) ?? "—" },
                    { key: "guiche", header: "Guichê", render: (m) => { const b = boothOf(m.booths); return b ? `${b.code} - ${b.name}` : "—"; } },
                    { key: "tipo", header: "Tipo", render: (m) => <Badge variant="neutral">{m.movement_type}</Badge> },
                    { key: "valor", header: "Valor", render: (m) => <span className="font-bold">R$ {Number(m.amount).toFixed(2)}</span> },
                    { key: "obs", header: "Obs", render: (m) => m.note ?? "—" },
                  ]}
                  rows={cashMovementRows.slice(0,100)}
                  emptyMessage="Nenhum movimento de caixa."
                  className="mt-2"
                />
              </Card>

              <Card className="p-0">
                <SectionHeader title="Fechamento de caixa por turno" />
                <DataTable
                  columns={[
                    { key: "data", header: "Data", render: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
                    { key: "operador", header: "Operador", render: (r) => nameOf(r.profiles) ?? "—" },
                    { key: "guiche", header: "Guichê", render: (r) => { const b = boothOf(r.booths); return b ? `${b.code} - ${b.name}` : "—"; } },
                    { key: "esperado", header: "Esperado", render: (r) => `R$ ${Number(r.expected_cash).toFixed(2)}` },
                    { key: "declarado", header: "Declarado", render: (r) => `R$ ${Number(r.declared_cash).toFixed(2)}` },
                    { key: "diferenca", header: "Diferença", render: (r) => { const diff = Number(r.difference); return <span className={diff===0?"text-emerald-400":"text-amber-400 font-bold"}>{`R$ ${diff.toFixed(2)}`}</span>; } },
                    { key: "obs", header: "Obs", render: (r) => r.note ?? "—" },
                  ]}
                  rows={shiftCashClosingRows.slice(0,100)}
                  emptyMessage="Nenhum fechamento de caixa."
                  className="mt-2"
                />
              </Card>
            </>
          )}

          {/* ═══ RELATÓRIOS ═══ */}
          {show("relatorios") && (
            <Card className="p-0">
              <SectionHeader title="Log de auditoria" />
              <DataTable
                columns={[
                  { key: "data", header: "Data", render: (a) => new Date(a.created_at).toLocaleString("pt-BR") },
                  { key: "usuario", header: "Usuário", render: (a) => nameOf(a.profiles) ?? "—" },
                  { key: "acao", header: "Ação", render: (a) => <Badge variant="info">{a.action}</Badge> },
                  { key: "entidade", header: "Entidade", render: (a) => a.entity ?? "—" },
                ]}
                rows={auditLogs}
                emptyMessage="Nenhum log de auditoria."
                className="mt-2"
              />
            </Card>
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
                <DataTable
                  columns={[
                    { key: "operador", header: "Operador", render: (l) => nameOf(l.profiles) ?? "—" },
                    { key: "guiche", header: "Guichê", render: (l) => { const b = boothOf(l.booths); return b ? `${b.code} - ${b.name}` : "—"; } },
                    { key: "status", header: "Status", render: (l) => <StatusBadge active={l.active} /> },
                    { key: "acao", header: "Ação", render: (l) => (
                      <Button variant="ghost" size="sm" onClick={async()=>{ await supabase.from("operator_booths").update({active:!l.active}).eq("id",l.id); await refreshData(); }}>
                        {l.active ? "Desvincular" : "Reativar"}
                      </Button>
                    ) },
                  ]}
                  rows={operatorBoothLinks}
                  emptyMessage="Nenhum vínculo encontrado."
                  className="mt-2"
                />
              </SectionCard>

              <div style={{ display:"grid", gap:"1.25rem" }}>
                <SectionCard title="Categorias">
                  <form onSubmit={createCategory} style={{ display:"flex", gap:"0.5rem", marginBottom:"0.75rem" }}>
                    <input value={categoryName} onChange={e=>setCategoryName(e.target.value)} required placeholder="Nome da categoria" className="rb-field" />
                    <button className="rb-btn-primary" type="submit">+</button>
                  </form>
                  <DataTable
                    columns={[
                      { key: "nome", header: "Nome", render: (c) => c.name },
                      { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
                      { key: "acao", header: "Ação", render: (c) => (
                        <Button variant="ghost" size="sm" onClick={()=>toggleCategoryActive(c)}>{c.active?"Inativar":"Ativar"}</Button>
                      ) },
                    ]}
                    rows={categories}
                    emptyMessage="Nenhuma categoria encontrada."
                    className="mt-2"
                  />
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
                  <DataTable
                    columns={[
                      { key: "nome", header: "Nome", render: (s) => s.name },
                      { key: "categoria", header: "Categoria", render: (s) => { const cName = Array.isArray(s.transaction_categories) ? s.transaction_categories[0]?.name : s.transaction_categories?.name; return cName ?? "—"; } },
                      { key: "status", header: "Status", render: (s) => <StatusBadge active={s.active} /> },
                      { key: "acao", header: "Ação", render: (s) => (
                        <Button variant="ghost" size="sm" onClick={()=>toggleSubcategoryActive(s)}>{s.active?"Inativar":"Ativar"}</Button>
                      ) },
                    ]}
                    rows={subcategories.slice(0,20)}
                    emptyMessage="Nenhuma subcategoria encontrada."
                    className="mt-2"
                  />
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
                  <DataTable
                    columns={[
                      { key: "nome", header: "Nome", render: (p) => <span className="font-semibold">{p.full_name}</span> },
                      { key: "cpf", header: "CPF", render: (p) => p.cpf ?? "—" },
                      { key: "telefone", header: "Telefone", render: (p) => p.phone ?? "—" },
                      { key: "perfil", header: "Perfil", render: (p) => <Badge variant="info">{p.role}</Badge> },
                      { key: "status", header: "Status", render: (p) => <StatusBadge active={p.active} /> },
                      { key: "acao", header: "Ação", render: (p) => (
                        <Button variant="ghost" size="sm" onClick={()=>toggleProfileActive(p)}>{p.active?"Inativar":"Ativar"}</Button>
                      ) },
                    ]}
                    rows={filteredProfiles}
                    emptyMessage="Nenhum usuário encontrado."
                    className="mt-2"
                  />
                </SectionCard>
              </div>

              {/* Lista empresas */}
              <SectionCard title="Empresas">
                <DataTable
                  columns={[
                    { key: "nome", header: "Nome", render: (c) => <span className="font-semibold">{c.name}</span> },
                    { key: "comissao", header: "Comissão", render: (c) => `${getCompanyPct(c).toFixed(3)}%` },
                    { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
                    { key: "acao", header: "Ação", render: (c) => (
                      <Button variant="ghost" size="sm" onClick={()=>toggleCompanyActive(c)}>{c.active?"Inativar":"Ativar"}</Button>
                    ) },
                  ]}
                  rows={companies}
                  emptyMessage="Nenhuma empresa encontrada."
                  className="mt-2"
                />
              </SectionCard>

              {/* Lista guichês */}
              <SectionCard title="Guichês">
                <input value={boothSearch} onChange={e=>setBoothSearch(e.target.value)} placeholder="Buscar guichê..." className="rb-field" style={{ marginBottom:"0.75rem" }} />
                <DataTable
                  columns={[
                    { key: "codigo", header: "Código", render: (b) => <span className="font-bold">{b.code}</span> },
                    { key: "nome", header: "Nome", render: (b) => b.name },
                    { key: "status", header: "Status", render: (b) => <StatusBadge active={b.active} /> },
                    { key: "acao", header: "Ação", render: (b) => (
                      <Button variant="ghost" size="sm" onClick={()=>toggleBoothActive(b)}>{b.active?"Inativar":"Ativar"}</Button>
                    ) },
                  ]}
                  rows={filteredBooths}
                  emptyMessage="Nenhum guichê encontrado."
                  className="mt-2"
                />
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </RebuildShell>
  );
}
