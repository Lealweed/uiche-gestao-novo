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

type Profile = {
  user_id: string;
  full_name: string;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "admin" | "operator";
  active: boolean;
};
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

type TimePunchRow = {
  id: string;
  punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim";
  punched_at: string;
  note: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type BoothDetailTx = {
  id: string;
  sold_at: string;
  amount: number;
  payment_method: string;
  ticket_reference: string | null;
  note: string | null;
  companies: { name: string } | { name: string }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  transaction_categories: { name: string } | { name: string }[] | null;
  transaction_subcategories: { name: string } | { name: string }[] | null;
};

type BoothDetailShift = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type BoothDetailPunch = {
  id: string;
  punch_type: string;
  punched_at: string;
  note: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type MenuSection = "agenda" | "tarefas" | "financeiro" | "relatorios" | "portal" | "configuracoes";

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
  const [timePunchRows, setTimePunchRows] = useState<TimePunchRow[]>([]);
  const [reportTxs, setReportTxs] = useState<TxForReport[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [boothDetailTxs, setBoothDetailTxs] = useState<BoothDetailTx[]>([]);
  const [boothDetailShifts, setBoothDetailShifts] = useState<BoothDetailShift[]>([]);
  const [boothDetailPunches, setBoothDetailPunches] = useState<BoothDetailPunch[]>([]);
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
  const [newProfileCpf, setNewProfileCpf] = useState("");
  const [newProfileAddress, setNewProfileAddress] = useState("");
  const [newProfilePhone, setNewProfilePhone] = useState("");
  const [newProfileAvatarUrl, setNewProfileAvatarUrl] = useState("");
  const [newProfileActive, setNewProfileActive] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [menu, setMenu] = useState<MenuSection>("financeiro");

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

    const [shiftRes, companyRes, boothRes, catRes, subRes, profileRes, linkRes, auditRes, punchRes, txRes, adjRes] = await Promise.all([
      shiftQuery,
      supabase.from("companies").select("id,name,commission_percent,active").order("name"),
      supabase.from("booths").select("id,code,name,active").order("name"),
      supabase.from("transaction_categories").select("id,name,active").order("name"),
      supabase.from("transaction_subcategories").select("id,name,active,category_id,transaction_categories(name)").order("name"),
      supabase.from("profiles").select("user_id,full_name,cpf,address,phone,avatar_url,role,active").order("full_name"),
      supabase.from("operator_booths").select("id,active,profiles(full_name),booths(name,code)").order("created_at", { ascending: false }).limit(200),
      supabase.from("audit_logs").select("id,action,entity,details,created_at,profiles(full_name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("time_punches").select("id,punch_type,punched_at,note,profiles(full_name),booths(code,name)").order("punched_at", { ascending: false }).limit(200),
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
    setTimePunchRows(((punchRes.data ?? []) as unknown as TimePunchRow[]) ?? []);
    setReportTxs(((txRes.data ?? []) as unknown as TxForReport[]) ?? []);
    setAdjustments(((adjRes.data ?? []) as unknown) as Adjustment[]);
  }

  async function openBoothDetail(booth: Booth) {
    setSelectedBooth(booth);
    const startIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : null;
    const endIso = dateTo ? `${dateTo}T23:59:59.999Z` : null;

    let txQ = supabase
      .from("transactions")
      .select("id,sold_at,amount,payment_method,ticket_reference,note,companies(name),profiles(full_name),transaction_categories(name),transaction_subcategories(name)")
      .eq("booth_id", booth.id)
      .eq("status", "posted")
      .order("sold_at", { ascending: false })
      .limit(300);

    let shiftQ = supabase
      .from("shifts")
      .select("id,opened_at,closed_at,status,profiles(full_name)")
      .eq("booth_id", booth.id)
      .order("opened_at", { ascending: false })
      .limit(100);

    let punchQ = supabase
      .from("time_punches")
      .select("id,punch_type,punched_at,note,profiles(full_name)")
      .eq("booth_id", booth.id)
      .order("punched_at", { ascending: false })
      .limit(300);

    if (startIso) {
      txQ = txQ.gte("sold_at", startIso);
      shiftQ = shiftQ.gte("opened_at", startIso);
      punchQ = punchQ.gte("punched_at", startIso);
    }
    if (endIso) {
      txQ = txQ.lte("sold_at", endIso);
      shiftQ = shiftQ.lte("opened_at", endIso);
      punchQ = punchQ.lte("punched_at", endIso);
    }

    const [txRes, shiftRes, punchRes] = await Promise.all([txQ, shiftQ, punchQ]);

    setBoothDetailTxs(((txRes.data ?? []) as unknown as BoothDetailTx[]) ?? []);
    setBoothDetailShifts(((shiftRes.data ?? []) as unknown as BoothDetailShift[]) ?? []);
    setBoothDetailPunches(((punchRes.data ?? []) as unknown as BoothDetailPunch[]) ?? []);
  }

  const summary = useMemo(() => {
    const totalDia = rows.reduce((acc, r) => acc + Number(r.gross_amount || 0), 0);
    const totalComissao = rows.reduce((acc, r) => acc + Number(r.commission_amount || 0), 0);
    const pendencias = rows.reduce((acc, r) => acc + Number(r.missing_card_receipts || 0), 0);
    const abertos = rows.filter((r) => r.status === "open").length;
    return { totalDia, totalComissao, pendencias, abertos };
  }, [rows]);

  const adminHealth = useMemo(() => {
    const inactiveUsers = profiles.filter((p) => !p.active).length;
    const inactiveBooths = booths.filter((b) => !b.active).length;
    const inactiveCompanies = companies.filter((c) => !c.active).length;
    const pendingAdjustments = adjustments.length;
    return { inactiveUsers, inactiveBooths, inactiveCompanies, pendingAdjustments };
  }, [profiles, booths, companies, adjustments]);

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

  function printReport() {
    window.print();
  }

  function exportPunchCsv() {
    const header = ["Data/Hora", "Operador", "Guichê", "Tipo", "Observação"];
    const lines = timePunchRows.map((p) => {
      const op = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
      const b = Array.isArray(p.booths) ? p.booths[0] : p.booths;
      return [
        new Date(p.punched_at).toLocaleString("pt-BR"),
        op ?? "-",
        b ? `${b.code} - ${b.name}` : "-",
        p.punch_type,
        p.note ?? "",
      ];
    });
    downloadCsv(`relatorio-ponto-${new Date().toISOString().slice(0, 10)}.csv`, header, lines);
  }

  function exportAdminBackupJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      summary,
      companies,
      booths,
      categories,
      subcategories,
      profiles,
      operatorBoothLinks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-admin-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  async function toggleCompanyActive(company: Company) {
    const { error } = await supabase.from("companies").update({ active: !company.active }).eq("id", company.id);
    if (error) return setMessage(`Erro ao atualizar empresa: ${error.message}`);
    await logAction("TOGGLE_COMPANY_ACTIVE", "companies", company.id, { active: !company.active });
    await refreshData();
  }

  async function toggleBoothActive(booth: Booth) {
    const { error } = await supabase.from("booths").update({ active: !booth.active }).eq("id", booth.id);
    if (error) return setMessage(`Erro ao atualizar guichê: ${error.message}`);
    await logAction("TOGGLE_BOOTH_ACTIVE", "booths", booth.id, { active: !booth.active });
    await refreshData();
  }

  async function toggleCategoryActive(category: Category) {
    const { error } = await supabase.from("transaction_categories").update({ active: !category.active }).eq("id", category.id);
    if (error) return setMessage(`Erro ao atualizar categoria: ${error.message}`);
    await logAction("TOGGLE_CATEGORY_ACTIVE", "transaction_categories", category.id, { active: !category.active });
    await refreshData();
  }

  async function toggleSubcategoryActive(sub: Subcategory) {
    const { error } = await supabase.from("transaction_subcategories").update({ active: !sub.active }).eq("id", sub.id);
    if (error) return setMessage(`Erro ao atualizar subcategoria: ${error.message}`);
    await logAction("TOGGLE_SUBCATEGORY_ACTIVE", "transaction_subcategories", sub.id, { active: !sub.active });
    await refreshData();
  }

  async function toggleOperatorBoothLink(link: OperatorBoothLink) {
    const { error } = await supabase.from("operator_booths").update({ active: !link.active }).eq("id", link.id);
    if (error) return setMessage(`Erro ao atualizar vínculo: ${error.message}`);
    await logAction("TOGGLE_OPERATOR_BOOTH_LINK", "operator_booths", link.id, { active: !link.active });
    await refreshData();
  }

  async function forceCloseShift(shiftId: string) {
    const { error } = await supabase.rpc("close_shift", { p_shift_id: shiftId, p_ip: null, p_notes: "Encerrado pelo admin" });
    if (error) return setMessage(`Erro ao encerrar turno: ${error.message}`);
    await logAction("FORCE_CLOSE_SHIFT", "shifts", shiftId);
    setMessage("Turno encerrado pelo admin.");
    await refreshData();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("profiles").upsert({
      user_id: newProfileUserId.trim(),
      full_name: newProfileName.trim(),
      cpf: newProfileCpf.trim() || null,
      address: newProfileAddress.trim() || null,
      phone: newProfilePhone.trim() || null,
      avatar_url: newProfileAvatarUrl.trim() || null,
      role: newProfileRole,
      active: newProfileActive,
    });

    if (error) return setMessage(`Erro ao salvar usuário: ${error.message}`);
    await logAction("UPSERT_PROFILE", "profiles", newProfileUserId.trim(), {
      role: newProfileRole,
      active: newProfileActive,
      cpf: newProfileCpf,
      phone: newProfilePhone,
    });
    setMessage("Usuário salvo com sucesso (perfil).\nObs: login/auth deve existir no Supabase Auth.");
    setNewProfileUserId("");
    setNewProfileName("");
    setNewProfileCpf("");
    setNewProfileAddress("");
    setNewProfilePhone("");
    setNewProfileAvatarUrl("");
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
        <header className="flex items-center justify-between gap-4 no-print">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs mb-2"><span className="pulse-dot">●</span> Produção</div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
            <p className="muted">Gestão central de guichês, empresas e fechamento.</p>
          </div>
          <button onClick={logout} className="btn-ghost">Sair</button>
        </header>

        <div className="grid lg:grid-cols-[240px,1fr] gap-4 items-start">
          <aside className="glass-card p-4 sticky top-4 no-print">
            <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Menu</h3>
            <nav className="space-y-2 text-sm">
              <button onClick={() => setMenu("agenda")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="agenda" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Operador</button>
              <button onClick={() => setMenu("tarefas")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="tarefas" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Tarefas</button>
              <button onClick={() => setMenu("financeiro")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="financeiro" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Financeiro</button>
              <button onClick={() => setMenu("relatorios")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="relatorios" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Relatórios com IA</button>
              <button onClick={() => setMenu("portal")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="portal" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Portal do Cliente</button>
              <button onClick={() => setMenu("configuracoes")} className={`w-full text-left px-3 py-2 rounded-lg ${menu==="configuracoes" ? "bg-slate-700 text-white" : "hover:bg-slate-800/70"}`}>Configurações</button>
            </nav>
          </aside>

          <div className="space-y-6">

        <section className={`${menu === "financeiro" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Painel administrativo</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="Usuários inativos" value={String(adminHealth.inactiveUsers)} />
              <MiniStat label="Guichês inativos" value={String(adminHealth.inactiveBooths)} />
              <MiniStat label="Empresas inativas" value={String(adminHealth.inactiveCompanies)} />
              <MiniStat label="Ajustes pendentes" value={String(adminHealth.pendingAdjustments)} />
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Ações rápidas</h2>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="button" onClick={refreshData}>Atualizar dados</button>
              <button className="btn-ghost" type="button" onClick={exportAdminBackupJson}>Backup JSON</button>
              <button className="btn-ghost" type="button" onClick={() => booths[0] && openBoothDetail(booths[0])}>Abrir 1º guichê</button>
            </div>
          </div>
        </section>

        <section id="financeiro" className={`${menu === "financeiro" ? "grid" : "hidden"} sm:grid-cols-2 lg:grid-cols-4 gap-4`}>
          <Card label="Receita do período" value={`R$ ${summary.totalDia.toFixed(2)}`} />
          <Card label="Comissão estimada" value={`R$ ${summary.totalComissao.toFixed(2)}`} />
          <Card label="Turnos abertos" value={String(summary.abertos)} />
          <Card label="Pendências" value={String(summary.pendencias)} />
        </section>

        <section className={`${menu === "financeiro" ? "grid" : "hidden"} lg:grid-cols-3 gap-4`}>
          <div className="glass-card p-4">
            <h2 className="font-semibold mb-3">Financeiro</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">PIX</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_pix||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Crédito</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_credit||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Débito</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_debit||0),0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Dinheiro</span><span>R$ {rows.reduce((a,r)=>a+Number(r.total_cash||0),0).toFixed(2)}</span></div>
            </div>
            <div className="mt-4 flex justify-center">
              <FinanceDonut
                pix={rows.reduce((a,r)=>a+Number(r.total_pix||0),0)}
                credit={rows.reduce((a,r)=>a+Number(r.total_credit||0),0)}
                debit={rows.reduce((a,r)=>a+Number(r.total_debit||0),0)}
                cash={rows.reduce((a,r)=>a+Number(r.total_cash||0),0)}
              />
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

        <section id="portal-cliente" className={`${menu === "portal" ? "block" : "hidden"} glass-card p-4`}>
          <h2 className="font-semibold mb-2">Portal do Cliente</h2>
          <p className="text-sm text-slate-400">Área pronta para liberar consulta de extratos e relatórios por cliente/empresa em breve.</p>
        </section>

        <form onSubmit={applyPeriodFilter} className={`${menu === "financeiro" ? "flex" : "hidden"} glass-card p-4 flex-wrap items-end gap-3`}>
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
          <button className="btn-ghost" type="button" onClick={exportPunchCsv}>CSV Ponto</button>
          <button className="btn-primary no-print" type="button" onClick={printReport}>Imprimir relatório</button>
        </form>

        <section className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
          <form onSubmit={saveProfile} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar/Atualizar usuário (perfil)</h2>
            <input value={newProfileUserId} onChange={(e)=>setNewProfileUserId(e.target.value)} required placeholder="UUID do usuário (auth.users.id)" className="field" />
            <input value={newProfileName} onChange={(e)=>setNewProfileName(e.target.value)} required placeholder="Nome completo" className="field" />
            <input value={newProfileCpf} onChange={(e)=>setNewProfileCpf(e.target.value)} placeholder="CPF" className="field" />
            <input value={newProfilePhone} onChange={(e)=>setNewProfilePhone(e.target.value)} placeholder="Telefone" className="field" />
            <input value={newProfileAddress} onChange={(e)=>setNewProfileAddress(e.target.value)} placeholder="Endereço" className="field" />
            <input value={newProfileAvatarUrl} onChange={(e)=>setNewProfileAvatarUrl(e.target.value)} placeholder="URL da foto de perfil" className="field" />
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

        <section className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
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

        <section className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
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

        <section className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Empresas</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Nome</th><th>%</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2">{c.name}</td>
                    <td>{Number(c.commission_percent).toFixed(3)}%</td>
                    <td>{c.active ? "Ativa" : "Inativa"}</td>
                    <td><button className="text-blue-300 hover:underline" onClick={() => toggleCompanyActive(c)}>{c.active ? "Inativar" : "Ativar"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Guichês</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Código</th><th>Nome</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {booths.map((b) => (
                  <tr key={b.id} className="border-t border-slate-800">
                    <td className="py-2">
                      <button className="text-cyan-300 hover:underline" onClick={() => openBoothDetail(b)}>{b.code}</button>
                    </td>
                    <td>{b.name}</td>
                    <td>{b.active ? "Ativo" : "Inativo"}</td>
                    <td><button className="text-blue-300 hover:underline" onClick={() => toggleBoothActive(b)}>{b.active ? "Inativar" : "Ativar"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${menu === "configuracoes" && selectedBooth ? "block" : "hidden"} glass-card p-4 overflow-auto`}>
          <h2 className="font-semibold mb-3">Detalhes do guichê {selectedBooth?.code} - {selectedBooth?.name}</h2>
          <div className="grid lg:grid-cols-3 gap-4 text-sm mb-4">
            <div className="rounded-xl border border-slate-800 p-3 bg-slate-950/50">
              <div className="text-slate-400">Lançamentos</div>
              <div className="text-lg font-semibold">{boothDetailTxs.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800 p-3 bg-slate-950/50">
              <div className="text-slate-400">Turnos</div>
              <div className="text-lg font-semibold">{boothDetailShifts.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800 p-3 bg-slate-950/50">
              <div className="text-slate-400">Registros de ponto</div>
              <div className="text-lg font-semibold">{boothDetailPunches.length}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Transações</h3>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-400">
                    <tr><th className="py-2">Data</th><th>Operador</th><th>Método</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {boothDetailTxs.map((t) => {
                      const op = Array.isArray(t.profiles) ? t.profiles[0]?.full_name : t.profiles?.full_name;
                      return (
                        <tr key={t.id} className="border-t border-slate-800">
                          <td className="py-2">{new Date(t.sold_at).toLocaleString("pt-BR")}</td>
                          <td>{op ?? "-"}</td>
                          <td>{t.payment_method}</td>
                          <td>R$ {Number(t.amount).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Turnos e pontos</h3>
              <div className="max-h-72 overflow-auto space-y-3">
                <div>
                  <div className="text-slate-400 mb-1">Turnos</div>
                  <ul className="space-y-1 text-xs">
                    {boothDetailShifts.map((s) => {
                      const op = Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name;
                      return <li key={s.id} className="border-b border-slate-800 pb-1">{new Date(s.opened_at).toLocaleString("pt-BR")} • {op ?? "-"} • {s.status}</li>;
                    })}
                  </ul>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Pontos</div>
                  <ul className="space-y-1 text-xs">
                    {boothDetailPunches.map((p) => {
                      const op = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                      return <li key={p.id} className="border-b border-slate-800 pb-1">{new Date(p.punched_at).toLocaleString("pt-BR")} • {op ?? "-"} • {p.punch_type}</li>;
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Categorias</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Categoria</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2">{c.name}</td>
                    <td>{c.active ? "Ativa" : "Inativa"}</td>
                    <td><button className="text-blue-300 hover:underline" onClick={() => toggleCategoryActive(c)}>{c.active ? "Inativar" : "Ativar"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Subcategorias</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Subcategoria</th><th>Categoria</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {subcategories.map((s) => {
                  const cName = Array.isArray(s.transaction_categories) ? s.transaction_categories[0]?.name : s.transaction_categories?.name;
                  return (
                    <tr key={s.id} className="border-t border-slate-800">
                      <td className="py-2">{s.name}</td>
                      <td>{cName ?? "-"}</td>
                      <td>{s.active ? "Ativa" : "Inativa"}</td>
                      <td><button className="text-blue-300 hover:underline" onClick={() => toggleSubcategoryActive(s)}>{s.active ? "Inativar" : "Ativar"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="configuracoes" className={`${menu === "configuracoes" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
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
                <tr><th className="py-2">Nome</th><th>CPF</th><th>Telefone</th><th>Perfil</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.user_id} className="border-t border-slate-800">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} className="w-6 h-6 rounded-full object-cover" /> : <span className="w-6 h-6 rounded-full bg-slate-700 inline-block" />}
                        <span>{p.full_name}</span>
                      </div>
                    </td>
                    <td>{p.cpf ?? "-"}</td>
                    <td>{p.phone ?? "-"}</td>
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
              <tr><th className="py-2">Operador</th><th>Guichê</th><th>Status</th><th>Ação</th></tr>
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
                    <td><button className="text-blue-300 hover:underline" onClick={() => toggleOperatorBoothLink(l)}>{l.active ? "Inativar" : "Ativar"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section id="relatorios" className={`${menu === "relatorios" ? "block" : "hidden"} glass-card p-4 overflow-auto`}>
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

        <section className={`${menu === "relatorios" ? "grid" : "hidden"} lg:grid-cols-2 gap-4`}>
          <div className="glass-card print-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Relatório por operador</h2>
            <div className="space-y-3">
              {reportByOperator.slice(0, 8).map((r) => (
                <BarRow key={r.operator} label={r.operator} value={r.total} max={reportByOperator[0]?.total ?? 1} />
              ))}
            </div>
          </div>

          <div className="glass-card print-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Relatório por guichê</h2>
            <div className="space-y-3">
              {reportByBooth.slice(0, 8).map((r) => (
                <BarRow key={r.booth} label={r.booth} value={r.total} max={reportByBooth[0]?.total ?? 1} />
              ))}
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold mb-2">Tabela detalhada por guichê</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-400">
                  <tr><th className="py-2">Guichê</th><th>Qtd</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {reportByBooth.map((r) => (
                    <tr key={`tbl-${r.booth}`} className="border-t border-slate-800">
                      <td className="py-2">{r.booth}</td>
                      <td>{r.qty}</td>
                      <td>R$ {r.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="agenda" className={`${menu === "agenda" ? "block" : "hidden"} glass-card p-4 overflow-auto`}>
          <h2 className="font-semibold mb-3">Operador - timeline operacional (auditoria)</h2>
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

        <section className={`${menu === "agenda" ? "block" : "hidden"} glass-card p-4 overflow-auto`}>
          <h2 className="font-semibold mb-3">Controle de ponto (últimos registros)</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="py-2">Data/Hora</th><th>Operador</th><th>Guichê</th><th>Tipo</th><th>Obs</th></tr>
            </thead>
            <tbody>
              {timePunchRows.map((p) => {
                const op = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
                const b = Array.isArray(p.booths) ? p.booths[0] : p.booths;
                return (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="py-2">{new Date(p.punched_at).toLocaleString("pt-BR")}</td>
                    <td>{op ?? "-"}</td>
                    <td>{b ? `${b.code} - ${b.name}` : "-"}</td>
                    <td>{p.punch_type}</td>
                    <td>{p.note ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

        <section id="tarefas" className={`${menu === "tarefas" ? "block" : "hidden"} rounded-xl border border-slate-800 bg-card p-4 overflow-auto`}>
          <h2 className="font-semibold mb-3">Últimos turnos</h2>
          {loading ? <p className="text-slate-400">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2">Guichê</th><th>Operador</th><th>Status</th><th>Total</th><th>PIX</th><th>Crédito</th><th>Débito</th><th>Pendências</th><th>Ação</th>
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
                    <td>{r.status === "open" ? <button className="text-amber-300 hover:underline" onClick={() => forceCloseShift(r.shift_id)}>Encerrar</button> : <span className="text-slate-500">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="kpi-value">{value}</p>
    </div>
  );
}

function FinanceDonut({ pix, credit, debit, cash }: { pix: number; credit: number; debit: number; cash: number }) {
  const total = Math.max(1, pix + credit + debit + cash);
  const pPix = (pix / total) * 100;
  const pCredit = (credit / total) * 100;
  const pDebit = (debit / total) * 100;
  const pCash = (cash / total) * 100;

  const bg = `conic-gradient(#22d3ee 0 ${pPix}%, #3b82f6 ${pPix}% ${pPix + pCredit}%, #8b5cf6 ${pPix + pCredit}% ${pPix + pCredit + pDebit}%, #10b981 ${pPix + pCredit + pDebit}% 100%)`;

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-full" style={{ background: bg }}>
        <div className="w-14 h-14 rounded-full bg-slate-900 mx-auto mt-5" />
      </div>
      <div className="text-xs space-y-1">
        <div><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-2" />PIX</div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />Crédito</div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-2" />Débito</div>
        <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />Dinheiro</div>
      </div>
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
