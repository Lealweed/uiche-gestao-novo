"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/app-routes";
import { isAdminPanelRole } from "@/lib/auth/roles";
import {
  approveAdjustmentRecord,
  createBoothRecord,
  createCategoryRecord,
  createCompanyRecord,
  createSubcategoryRecord,
  forceCloseShiftRecord,
  linkOperatorToBoothRecord,
  rejectAdjustmentRecord,
  sendPasswordReset,
  setOperatorBoothLinkActiveRecord,
  toggleBoothActiveRecord,
  toggleCategoryActiveRecord,
  toggleCompanyActiveRecord,
  toggleProfileActiveRecord,
  toggleSubcategoryActiveRecord,
  upsertProfileRecord,
} from "@/lib/rebuild/crud/admin";
import {
  type Adjustment,
  type AuditLog,
  type Booth,
  type CashMovementRow,
  type Category,
  type Company,
  fetchAdminDashboardData,
  type OperatorBoothLink,
  type Profile,
  type ShiftCashClosingRow,
  type ShiftTotal,
  type Subcategory,
  type TimePunchRow,
  type TxForReport,
} from "@/lib/rebuild/data/admin";
import { useRebuildSection } from "@/lib/rebuild/use-rebuild-section";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Toast, type ToastType } from "@/components/rebuild/ui/toast";
import {
  DashboardSection,
  FinanceSection,
  ManagementSection,
  OperatorsSection,
  ReportsSection,
  SettingsSection,
} from "@/components/rebuild/admin/sections";
import { exportToCSV } from "@/lib/csv-export";

const supabase = createClient();
type MenuSection = "dashboard" | "operadores" | "gestao" | "financeiro" | "relatorios" | "configuracoes";

function getCompanyPct(company: Company) {
  return Number(company.commission_percent ?? company.comission_percent ?? 0);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

const ADMIN_SECTION_MAP: Record<string, MenuSection> = {
  dashboard: "dashboard",
  "controle-turno": "dashboard",
  financeiro: "financeiro",
  relatorios: "relatorios",
  operadores: "operadores",
  usuarios: "gestao",
  empresas: "gestao",
  configuracoes: "configuracoes",
};

export default function AdminRebuildPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ShiftTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [operatorBoothLinks, setOperatorBoothLinks] = useState<OperatorBoothLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [timePunchRows, setTimePunchRows] = useState<TimePunchRow[]>([]);
  const [cashMovementRows, setCashMovementRows] = useState<CashMovementRow[]>([]);
  const [shiftCashClosingRows, setShiftCashClosingRows] = useState<ShiftCashClosingRow[]>([]);
  const [reportTxs, setReportTxs] = useState<TxForReport[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("info");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [boothSearch, setBoothSearch] = useState("");
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
  const [newProfilePhone, setNewProfilePhone] = useState("");
  const [newProfileAddress, setNewProfileAddress] = useState("");
  const [newProfileAvatarUrl, setNewProfileAvatarUrl] = useState("");
  const [newProfileActive, setNewProfileActive] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const { show } = useRebuildSection<MenuSection>("dashboard", ADMIN_SECTION_MAP);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.push(APP_ROUTES.login);
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", data.user.id).single();
      if (!isAdminPanelRole((profile as { role?: string } | null)?.role)) return router.push(APP_ROUTES.rebuild.operator);
      await refreshData();
    })();
  }, [router]);

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({ created_by: data.user.id, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });
  }

  async function refreshData(from?: string, to?: string) {
    setLoading(true);
    try {
      const data = await fetchAdminDashboardData(supabase, {
        from: from ?? dateFrom,
        to: to ?? dateTo,
      });

      setToastType("info");
      setRows(data.rows);
      setCompanies(data.companies);
      setBooths(data.booths);
      setProfiles(data.profiles);
      setCategories(data.categories);
      setSubcategories(data.subcategories);
      setOperatorBoothLinks(data.operatorBoothLinks);
      setAuditLogs(data.auditLogs);
      setTimePunchRows(data.timePunchRows);
      setCashMovementRows(data.cashMovementRows);
      setShiftCashClosingRows(data.shiftCashClosingRows);
      setReportTxs(data.reportTxs);
      setAdjustments(data.adjustments);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  const repassesComputed = useMemo(() => {
    let faturamento = 0;
    let central = 0;
    let repasse = 0;
    const companiesMap = new Map<string, { id: string; name: string; amount: number; central: number; repasse: number }>();
    const pctMap = new Map(companies.map((company) => [company.id, getCompanyPct(company)]));

    for (const transaction of reportTxs) {
      const amount = Number(transaction.amount || 0);
      const companyId = transaction.company_id;
      const pct = companyId ? (pctMap.get(companyId) ?? 0) : 0;
      const fee = amount * (pct / 100);
      const net = amount - fee;

      faturamento += amount;
      central += fee;
      repasse += net;

      if (companyId) {
        if (!companiesMap.has(companyId)) {
          const companyName = transaction.companies && !Array.isArray(transaction.companies) ? transaction.companies.name : "Desconhecida";
          companiesMap.set(companyId, { id: companyId, name: companyName, amount: 0, central: 0, repasse: 0 });
        }
        const current = companiesMap.get(companyId)!;
        current.amount += amount;
        current.central += fee;
        current.repasse += net;
      }
    }

    return {
      faturamento,
      central,
      repasse,
      viacoes: Array.from(companiesMap.values()).sort((a, b) => b.amount - a.amount),
    };
  }, [reportTxs, companies]);

  const summary = useMemo(
    () => ({
      pendencias: rows.reduce((acc, row) => acc + Number(row.missing_card_receipts || 0), 0),
      abertos: rows.filter((row) => row.status === "open").length,
    }),
    [rows]
  );

  const cashMovementTotals = useMemo(() => {
    const suprimento = cashMovementRows.filter((row) => row.movement_type === "suprimento").reduce((acc, row) => acc + Number(row.amount || 0), 0);
    const sangria = cashMovementRows.filter((row) => row.movement_type === "sangria").reduce((acc, row) => acc + Number(row.amount || 0), 0);
    const ajuste = cashMovementRows.filter((row) => row.movement_type === "ajuste").reduce((acc, row) => acc + Number(row.amount || 0), 0);
    return { suprimento, sangria, ajuste, saldo: suprimento - sangria + ajuste };
  }, [cashMovementRows]);

  const cashClosingTotals = useMemo(
    () => ({
      expected: shiftCashClosingRows.reduce((acc, row) => acc + Number(row.expected_cash || 0), 0),
      declared: shiftCashClosingRows.reduce((acc, row) => acc + Number(row.declared_cash || 0), 0),
      difference: shiftCashClosingRows.reduce((acc, row) => acc + Number(row.difference || 0), 0),
    }),
    [shiftCashClosingRows]
  );

  const filteredProfiles = useMemo(() => {
    const term = profileSearch.trim().toLowerCase();
    return term ? profiles.filter((profile) => [profile.full_name, profile.cpf ?? "", profile.phone ?? "", profile.role].join(" ").toLowerCase().includes(term)) : profiles;
  }, [profiles, profileSearch]);

  const filteredBooths = useMemo(() => {
    const term = boothSearch.trim().toLowerCase();
    return term ? booths.filter((booth) => `${booth.code} ${booth.name}`.toLowerCase().includes(term)) : booths;
  }, [booths, boothSearch]);

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createCompanyRecord(supabase, companyName.trim(), Number(companyPct));
      setCompanyName("");
      setCompanyPct("6");
      setMessage("Empresa cadastrada.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function createBooth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createBoothRecord(supabase, boothCode.trim().toUpperCase(), boothName.trim());
      setBoothCode("");
      setBoothName("");
      setMessage("Guiche cadastrado.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createCategoryRecord(supabase, categoryName.trim());
      setCategoryName("");
      setMessage("Categoria cadastrada.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function createSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createSubcategoryRecord(supabase, subcategoryCategoryId, subcategoryName.trim());
      setSubcategoryName("");
      setSubcategoryCategoryId("");
      setMessage("Subcategoria cadastrada.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function linkOperatorToBooth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await linkOperatorToBoothRecord(supabase, selectedOperatorId, selectedBoothId);
      setMessage("Operador vinculado.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const uid = newProfileUserId.trim();
    try {
      await upsertProfileRecord(supabase, {
        user_id: uid,
        full_name: newProfileName.trim(),
        cpf: newProfileCpf.trim() || null,
        address: newProfileAddress.trim() || null,
        phone: newProfilePhone.trim() || null,
        avatar_url: newProfileAvatarUrl.trim() || null,
        role: newProfileRole,
        active: newProfileActive,
      });
      setNewProfileUserId("");
      setNewProfileName("");
      setNewProfileCpf("");
      setNewProfilePhone("");
      setNewProfileAddress("");
      setNewProfileAvatarUrl("");
      setNewProfileRole("operator");
      setNewProfileActive(true);
      await logAction("UPSERT_PROFILE", "profiles", uid, { role: newProfileRole });
      setMessage("Perfil salvo.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function sendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await sendPasswordReset(supabase, resetEmail.trim());
      setResetEmail("");
      setMessage("Link de reset enviado.");
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleCompanyActive(company: Company) {
    try {
      await toggleCompanyActiveRecord(supabase, company.id, !company.active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleBoothActive(booth: Booth) {
    try {
      await toggleBoothActiveRecord(supabase, booth.id, !booth.active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleProfileActive(profile: Profile) {
    try {
      await toggleProfileActiveRecord(supabase, profile.user_id, !profile.active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleCategoryActive(category: Category) {
    try {
      await toggleCategoryActiveRecord(supabase, category.id, !category.active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleSubcategoryActive(subcategory: Subcategory) {
    try {
      await toggleSubcategoryActiveRecord(supabase, subcategory.id, !subcategory.active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function toggleOperatorBoothLinkActive(linkId: string, active: boolean) {
    try {
      await setOperatorBoothLinkActiveRecord(supabase, linkId, active);
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function approveAdjustment(adjId: string, txId: string) {
    try {
      await approveAdjustmentRecord(supabase, adjId, txId);
      await logAction("APPROVE_ADJUSTMENT", "adjustment_requests", adjId, { transaction_id: txId });
      setMessage("Ajuste aprovado.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function rejectAdjustment(adjId: string) {
    try {
      await rejectAdjustmentRecord(supabase, adjId);
      await logAction("REJECT_ADJUSTMENT", "adjustment_requests", adjId);
      setMessage("Ajuste rejeitado.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function forceCloseShift(shiftId: string) {
    try {
      await forceCloseShiftRecord(supabase, shiftId);
      await logAction("FORCE_CLOSE_SHIFT", "shifts", shiftId);
      setMessage("Turno encerrado.");
      await refreshData();
    } catch (error) {
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  function handleExportCSV() {
    exportToCSV("repasses-viacao", repassesComputed.viacoes, [
      { key: "name", label: "Empresa / Viacao" },
      { key: "amount", label: "Faturamento Bruto" },
      { key: "central", label: "Taxa Retida (Central)" },
      { key: "repasse", label: "Repasse Liquido" },
    ]);
  }

  return (
    <RebuildShell>
      <div className="grid gap-5">
      <Toast message={message} type={toastType} onClose={() => setMessage(null)} />

      {show("dashboard") ? (
        <DashboardSection
          loading={loading}
          dateFrom={dateFrom}
          dateTo={dateTo}
          repassesComputed={repassesComputed}
          reportTransactionCount={reportTxs.length}
          summary={summary}
          adjustments={adjustments}
          auditLogCount={auditLogs.length}
          rows={rows}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onFilterSubmit={() => refreshData()}
          onClearFilters={() => {
            setDateFrom("");
            setDateTo("");
            refreshData("", "");
          }}
          onExportCsv={handleExportCSV}
          onForceCloseShift={forceCloseShift}
          onApproveAdjustment={approveAdjustment}
          onRejectAdjustment={rejectAdjustment}
        />
      ) : null}

      {show("operadores") ? <OperatorsSection timePunchRows={timePunchRows} /> : null}

      {show("financeiro") ? (
        <FinanceSection
          dateFrom={dateFrom}
          dateTo={dateTo}
          cashMovementTotals={cashMovementTotals}
          cashClosingTotals={cashClosingTotals}
          cashMovementRows={cashMovementRows}
          shiftCashClosingRows={shiftCashClosingRows}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onFilterSubmit={() => refreshData()}
          onClearFilters={() => {
            setDateFrom("");
            setDateTo("");
            refreshData("", "");
          }}
        />
      ) : null}

      {show("relatorios") ? <ReportsSection auditLogs={auditLogs} /> : null}

      {show("gestao") ? (
        <ManagementSection
          profiles={profiles}
          booths={booths}
          operatorBoothLinks={operatorBoothLinks}
          categories={categories}
          subcategories={subcategories}
          selectedOperatorId={selectedOperatorId}
          selectedBoothId={selectedBoothId}
          categoryName={categoryName}
          subcategoryName={subcategoryName}
          subcategoryCategoryId={subcategoryCategoryId}
          onSelectedOperatorIdChange={setSelectedOperatorId}
          onSelectedBoothIdChange={setSelectedBoothId}
          onCategoryNameChange={setCategoryName}
          onSubcategoryNameChange={setSubcategoryName}
          onSubcategoryCategoryIdChange={setSubcategoryCategoryId}
          onLinkOperatorToBooth={linkOperatorToBooth}
          onCreateCategory={createCategory}
          onCreateSubcategory={createSubcategory}
          onToggleOperatorBoothLinkActive={toggleOperatorBoothLinkActive}
          onToggleCategoryActive={toggleCategoryActive}
          onToggleSubcategoryActive={toggleSubcategoryActive}
        />
      ) : null}

      {show("configuracoes") ? (
        <SettingsSection
          companyName={companyName}
          companyPct={companyPct}
          boothCode={boothCode}
          boothName={boothName}
          profileSearch={profileSearch}
          boothSearch={boothSearch}
          resetEmail={resetEmail}
          newProfileUserId={newProfileUserId}
          newProfileName={newProfileName}
          newProfileRole={newProfileRole}
          newProfileCpf={newProfileCpf}
          newProfilePhone={newProfilePhone}
          newProfileAddress={newProfileAddress}
          newProfileAvatarUrl={newProfileAvatarUrl}
          newProfileActive={newProfileActive}
          companies={companies}
          filteredProfiles={filteredProfiles}
          filteredBooths={filteredBooths}
          onCompanyNameChange={setCompanyName}
          onCompanyPctChange={setCompanyPct}
          onBoothCodeChange={setBoothCode}
          onBoothNameChange={setBoothName}
          onProfileSearchChange={setProfileSearch}
          onBoothSearchChange={setBoothSearch}
          onResetEmailChange={setResetEmail}
          onNewProfileUserIdChange={setNewProfileUserId}
          onNewProfileNameChange={setNewProfileName}
          onNewProfileRoleChange={setNewProfileRole}
          onNewProfileCpfChange={setNewProfileCpf}
          onNewProfilePhoneChange={setNewProfilePhone}
          onNewProfileAddressChange={setNewProfileAddress}
          onNewProfileAvatarUrlChange={setNewProfileAvatarUrl}
          onNewProfileActiveChange={setNewProfileActive}
          onSaveProfile={saveProfile}
          onSendResetLink={sendResetLink}
          onCreateCompany={createCompany}
          onCreateBooth={createBooth}
          onToggleProfileActive={toggleProfileActive}
          onToggleCompanyActive={toggleCompanyActive}
          onToggleBoothActive={toggleBoothActive}
        />
      ) : null}
      </div>
    </RebuildShell>
  );
}




