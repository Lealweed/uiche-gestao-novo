import type { FormEvent } from "react";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Card } from "@/components/rebuild/ui/card";
import { DateFilterForm } from "@/components/rebuild/admin/date-filter-form";
import { SectionCard, StatusBadge } from "@/components/rebuild/admin/section-card";
import { boothLabel, relatedFullName, relatedName } from "@/components/rebuild/admin/display";
import type { Adjustment, AuditLog, Booth, CashMovementRow, Category, Company, OperatorBoothLink, Profile, ShiftCashClosingRow, ShiftTotal, Subcategory, TimePunchRow } from "@/lib/rebuild/data/admin";

type RepassesRow = {
  id: string;
  name: string;
  amount: number;
  central: number;
  repasse: number;
};

type DashboardSectionProps = {
  loading: boolean;
  dateFrom: string;
  dateTo: string;
  repassesComputed: {
    faturamento: number;
    central: number;
    repasse: number;
    viacoes: RepassesRow[];
  };
  reportTransactionCount: number;
  summary: {
    abertos: number;
    pendencias: number;
  };
  adjustments: Adjustment[];
  auditLogCount: number;
  rows: ShiftTotal[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onFilterSubmit: () => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  onForceCloseShift: (shiftId: string) => void;
  onApproveAdjustment: (adjustmentId: string, transactionId: string) => void;
  onRejectAdjustment: (adjustmentId: string) => void;
};

export function DashboardSection({
  loading,
  dateFrom,
  dateTo,
  repassesComputed,
  reportTransactionCount,
  summary,
  adjustments,
  auditLogCount,
  rows,
  onDateFromChange,
  onDateToChange,
  onFilterSubmit,
  onClearFilters,
  onExportCsv,
  onForceCloseShift,
  onApproveAdjustment,
  onRejectAdjustment,
}: DashboardSectionProps) {
  if (loading) {
    return <div className="rb-panel rb-table-empty">Carregando indicadores...</div>;
  }

  return (
    <>
      <div className="rb-panel mb-6">
        <DateFilterForm
          dateFrom={dateFrom}
          dateTo={dateTo}
          submitLabel="Filtrar periodo"
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          onSubmit={onFilterSubmit}
          onClear={onClearFilters}
        />
      </div>

      <SectionHeader title="Auditoria e Repasses (Consolidado do periodo)" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-2">
        <StatCard label="Faturamento Total" value={`R$ ${repassesComputed.faturamento.toFixed(2)}`} delta={`${reportTransactionCount} transacoes`} />
        <StatCard label="Caixa na Central" value={`R$ ${repassesComputed.central.toFixed(2)}`} delta="Lucro (taxas)" />
        <StatCard label="Valor a Repassar" value={`R$ ${repassesComputed.repasse.toFixed(2)}`} delta="Para viacoes" />
      </div>

      <Card className="p-0 mb-6 relative">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="sm" type="button" onClick={onExportCsv}>
            Exportar CSV
          </Button>
        </div>
        <SectionHeader title="Consolidado por Viacao" />
        <DataTable
          columns={[
            { key: "empresa", header: "Empresa / Viacao", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "faturamento", header: "Faturamento Bruto", render: (row) => `R$ ${row.amount.toFixed(2)}` },
            { key: "central", header: "Taxa Retida (Central)", render: (row) => <span className="text-emerald-400 font-bold">R$ {row.central.toFixed(2)}</span> },
            { key: "repasse", header: "Repasse Liquido", render: (row) => <span className="text-amber-500 font-bold">R$ {row.repasse.toFixed(2)}</span> },
          ]}
          rows={repassesComputed.viacoes}
          emptyMessage="Nenhum faturamento registrado no periodo."
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-8">
        <StatCard label="Turnos abertos" value={String(summary.abertos)} delta={`${summary.pendencias} pendencia(s)`} />
        <StatCard label="Ajustes pendentes" value={String(adjustments.length)} delta="Aguardando revisao" />
        <StatCard label="Logs recentes" value={String(auditLogCount)} delta="Registros de auditoria" />
      </div>

      <Card className="p-0">
        <SectionHeader title="Controle de turnos" />
        <DataTable
          columns={[
            { key: "booth", header: "Guiche", render: (row) => row.booth_name },
            { key: "operator", header: "Operador", render: (row) => row.operator_name },
            { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "open" ? "success" : "neutral"}>{row.status === "open" ? "ABERTO" : "FECHADO"}</Badge> },
            { key: "receita", header: "Receita", render: (row) => <span className="font-bold">R$ {Number(row.gross_amount || 0).toFixed(2)}</span> },
            { key: "pendencias", header: "Pendencias", render: (row) => (Number(row.missing_card_receipts || 0) > 0 ? <Badge variant="warning">{row.missing_card_receipts}</Badge> : "—") },
            { key: "acao", header: "Acao", render: (row) => (row.status === "open" ? <Button variant="ghost" size="sm" onClick={() => onForceCloseShift(row.shift_id)}>Encerrar</Button> : null) },
          ]}
          rows={rows.slice(0, 50)}
          emptyMessage="Nenhum turno encontrado."
          className="mt-2"
        />
      </Card>

      {adjustments.length > 0 ? (
        <Card className="p-0">
          <SectionHeader title={`Ajustes pendentes (${adjustments.length})`} />
          <DataTable
            columns={[
              { key: "operador", header: "Operador", render: (adjustment) => relatedFullName(adjustment.profiles) ?? "—" },
              { key: "motivo", header: "Motivo", render: (adjustment) => <span className="truncate max-w-[200px]">{adjustment.reason}</span> },
              { key: "valor", header: "Valor", render: (adjustment) => (adjustment.transactions ? `R$ ${Number(adjustment.transactions.amount).toFixed(2)}` : "—") },
              { key: "empresa", header: "Empresa", render: (adjustment) => (adjustment.transactions ? relatedName(adjustment.transactions.companies) ?? "—" : "—") },
              {
                key: "acao",
                header: "Acao",
                render: (adjustment) => (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => onApproveAdjustment(adjustment.id, adjustment.transaction_id)}>
                      Aprovar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRejectAdjustment(adjustment.id)}>
                      Rejeitar
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={adjustments}
            emptyMessage="Nenhum ajuste pendente."
            className="mt-2"
          />
        </Card>
      ) : null}
    </>
  );
}

type OperatorsSectionProps = {
  timePunchRows: TimePunchRow[];
};

export function OperatorsSection({ timePunchRows }: OperatorsSectionProps) {
  return (
    <Card className="p-0">
      <SectionHeader title="Registro de ponto" />
      <DataTable
        columns={[
          { key: "data", header: "Data/Hora", render: (row) => new Date(row.punched_at).toLocaleString("pt-BR") },
          { key: "operador", header: "Operador", render: (row) => relatedFullName(row.profiles) ?? "—" },
          { key: "guiche", header: "Guiche", render: (row) => boothLabel(row.booths) },
          { key: "tipo", header: "Tipo", render: (row) => <Badge variant="neutral">{row.punch_type}</Badge> },
          { key: "obs", header: "Obs", render: (row) => row.note ?? "—" },
        ]}
        rows={timePunchRows.slice(0, 100)}
        emptyMessage="Nenhum registro de ponto."
        className="mt-2"
      />
    </Card>
  );
}

type FinanceSectionProps = {
  dateFrom: string;
  dateTo: string;
  cashMovementTotals: {
    suprimento: number;
    sangria: number;
    ajuste: number;
    saldo: number;
  };
  cashClosingTotals: {
    expected: number;
    declared: number;
    difference: number;
  };
  cashMovementRows: CashMovementRow[];
  shiftCashClosingRows: ShiftCashClosingRow[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onFilterSubmit: () => void;
  onClearFilters: () => void;
};

export function FinanceSection({
  dateFrom,
  dateTo,
  cashMovementTotals,
  cashClosingTotals,
  cashMovementRows,
  shiftCashClosingRows,
  onDateFromChange,
  onDateToChange,
  onFilterSubmit,
  onClearFilters,
}: FinanceSectionProps) {
  return (
    <>
      <div className="rb-panel">
        <DateFilterForm
          dateFrom={dateFrom}
          dateTo={dateTo}
          submitLabel="Filtrar"
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          onSubmit={onFilterSubmit}
          onClear={onClearFilters}
        />
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
        <StatCard label="Diferenca" value={`R$ ${cashClosingTotals.difference.toFixed(2)}`} />
      </div>

      <Card className="p-0">
        <SectionHeader title="Movimentos de caixa" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
            { key: "operador", header: "Operador", render: (row) => relatedFullName(row.profiles) ?? "—" },
            { key: "guiche", header: "Guiche", render: (row) => boothLabel(row.booths) },
            { key: "tipo", header: "Tipo", render: (row) => <Badge variant="neutral">{row.movement_type}</Badge> },
            { key: "valor", header: "Valor", render: (row) => <span className="font-bold">R$ {Number(row.amount).toFixed(2)}</span> },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "—" },
          ]}
          rows={cashMovementRows.slice(0, 100)}
          emptyMessage="Nenhum movimento de caixa."
          className="mt-2"
        />
      </Card>

      <Card className="p-0">
        <SectionHeader title="Fechamento de caixa por turno" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
            { key: "operador", header: "Operador", render: (row) => relatedFullName(row.profiles) ?? "—" },
            { key: "guiche", header: "Guiche", render: (row) => boothLabel(row.booths) },
            { key: "esperado", header: "Esperado", render: (row) => `R$ ${Number(row.expected_cash).toFixed(2)}` },
            { key: "declarado", header: "Declarado", render: (row) => `R$ ${Number(row.declared_cash).toFixed(2)}` },
            {
              key: "diferenca",
              header: "Diferenca",
              render: (row) => {
                const difference = Number(row.difference);
                return <span className={difference === 0 ? "text-emerald-400" : "text-amber-400 font-bold"}>{`R$ ${difference.toFixed(2)}`}</span>;
              },
            },
            { key: "obs", header: "Obs", render: (row) => row.note ?? "—" },
          ]}
          rows={shiftCashClosingRows.slice(0, 100)}
          emptyMessage="Nenhum fechamento de caixa."
          className="mt-2"
        />
      </Card>
    </>
  );
}

type ReportsSectionProps = {
  auditLogs: AuditLog[];
};

export function ReportsSection({ auditLogs }: ReportsSectionProps) {
  return (
    <Card className="p-0">
      <SectionHeader title="Log de auditoria" />
      <DataTable
        columns={[
          { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
          { key: "usuario", header: "Usuario", render: (row) => relatedFullName(row.profiles) ?? "—" },
          { key: "acao", header: "Acao", render: (row) => <Badge variant="info">{row.action}</Badge> },
          { key: "entidade", header: "Entidade", render: (row) => row.entity ?? "—" },
        ]}
        rows={auditLogs}
        emptyMessage="Nenhum log de auditoria."
        className="mt-2"
      />
    </Card>
  );
}

type ManagementSectionProps = {
  profiles: Profile[];
  booths: Booth[];
  operatorBoothLinks: OperatorBoothLink[];
  categories: Category[];
  subcategories: Subcategory[];
  selectedOperatorId: string;
  selectedBoothId: string;
  categoryName: string;
  subcategoryName: string;
  subcategoryCategoryId: string;
  onSelectedOperatorIdChange: (value: string) => void;
  onSelectedBoothIdChange: (value: string) => void;
  onCategoryNameChange: (value: string) => void;
  onSubcategoryNameChange: (value: string) => void;
  onSubcategoryCategoryIdChange: (value: string) => void;
  onLinkOperatorToBooth: (event: FormEvent<HTMLFormElement>) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSubcategory: (event: FormEvent<HTMLFormElement>) => void;
  onToggleOperatorBoothLinkActive: (linkId: string, active: boolean) => void;
  onToggleCategoryActive: (category: Category) => void;
  onToggleSubcategoryActive: (subcategory: Subcategory) => void;
};

export function ManagementSection({
  profiles,
  booths,
  operatorBoothLinks,
  categories,
  subcategories,
  selectedOperatorId,
  selectedBoothId,
  categoryName,
  subcategoryName,
  subcategoryCategoryId,
  onSelectedOperatorIdChange,
  onSelectedBoothIdChange,
  onCategoryNameChange,
  onSubcategoryNameChange,
  onSubcategoryCategoryIdChange,
  onLinkOperatorToBooth,
  onCreateCategory,
  onCreateSubcategory,
  onToggleOperatorBoothLinkActive,
  onToggleCategoryActive,
  onToggleSubcategoryActive,
}: ManagementSectionProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
      <SectionCard
        title="Vínculos operador → guichê"
        action={
          <form onSubmit={onLinkOperatorToBooth} style={{ display: "flex", gap: "0.5rem" }}>
            <select className="rb-field" value={selectedOperatorId} onChange={(event) => onSelectedOperatorIdChange(event.target.value)} required style={{ minWidth: "140px" }}>
              <option value="">Operador</option>
              {profiles.filter((profile) => profile.role === "operator").map((profile) => (
                <option key={profile.user_id} value={profile.user_id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
            <select className="rb-field" value={selectedBoothId} onChange={(event) => onSelectedBoothIdChange(event.target.value)} required style={{ minWidth: "120px" }}>
              <option value="">Guiche</option>
              {booths.filter((booth) => booth.active).map((booth) => (
                <option key={booth.id} value={booth.id}>
                  {booth.code} - {booth.name}
                </option>
              ))}
            </select>
            <button className="rb-btn-primary" type="submit">
              Vincular
            </button>
          </form>
        }
      >
        <DataTable
          columns={[
            { key: "operador", header: "Operador", render: (row) => relatedFullName(row.profiles) ?? "—" },
            { key: "guiche", header: "Guiche", render: (row) => boothLabel(row.booths) },
            { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => onToggleOperatorBoothLinkActive(row.id, !row.active)}>
                  {row.active ? "Desvincular" : "Reativar"}
                </Button>
              ),
            },
          ]}
          rows={operatorBoothLinks}
          emptyMessage="Nenhum vinculo encontrado."
          className="mt-2"
        />
      </SectionCard>

      <div style={{ display: "grid", gap: "1.25rem" }}>
        <SectionCard title="Categorias">
          <form onSubmit={onCreateCategory} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input value={categoryName} onChange={(event) => onCategoryNameChange(event.target.value)} required placeholder="Nome da categoria" className="rb-field" />
            <button className="rb-btn-primary" type="submit">
              +
            </button>
          </form>
          <DataTable
            columns={[
              { key: "nome", header: "Nome", render: (row) => row.name },
              { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => onToggleCategoryActive(row)}>
                    {row.active ? "Inativar" : "Ativar"}
                  </Button>
                ),
              },
            ]}
            rows={categories}
            emptyMessage="Nenhuma categoria encontrada."
            className="mt-2"
          />
        </SectionCard>

        <SectionCard title="Subcategorias">
          <form onSubmit={onCreateSubcategory} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <select className="rb-field" value={subcategoryCategoryId} onChange={(event) => onSubcategoryCategoryIdChange(event.target.value)} required>
              <option value="">Categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input value={subcategoryName} onChange={(event) => onSubcategoryNameChange(event.target.value)} required placeholder="Subcategoria" className="rb-field" />
            <button className="rb-btn-primary" type="submit">
              +
            </button>
          </form>
          <DataTable
            columns={[
              { key: "nome", header: "Nome", render: (row) => row.name },
              { key: "categoria", header: "Categoria", render: (row) => relatedName(row.transaction_categories) ?? "—" },
              { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => onToggleSubcategoryActive(row)}>
                    {row.active ? "Inativar" : "Ativar"}
                  </Button>
                ),
              },
            ]}
            rows={subcategories.slice(0, 20)}
            emptyMessage="Nenhuma subcategoria encontrada."
            className="mt-2"
          />
        </SectionCard>
      </div>
    </div>
  );
}

type SettingsSectionProps = {
  companyName: string;
  companyPct: string;
  boothCode: string;
  boothName: string;
  profileSearch: string;
  boothSearch: string;
  resetEmail: string;
  newProfileUserId: string;
  newProfileName: string;
  newProfileRole: "admin" | "operator";
  newProfileCpf: string;
  newProfilePhone: string;
  newProfileAddress: string;
  newProfileAvatarUrl: string;
  newProfileActive: boolean;
  companies: Company[];
  filteredProfiles: Profile[];
  filteredBooths: Booth[];
  onCompanyNameChange: (value: string) => void;
  onCompanyPctChange: (value: string) => void;
  onBoothCodeChange: (value: string) => void;
  onBoothNameChange: (value: string) => void;
  onProfileSearchChange: (value: string) => void;
  onBoothSearchChange: (value: string) => void;
  onResetEmailChange: (value: string) => void;
  onNewProfileUserIdChange: (value: string) => void;
  onNewProfileNameChange: (value: string) => void;
  onNewProfileRoleChange: (value: "admin" | "operator") => void;
  onNewProfileCpfChange: (value: string) => void;
  onNewProfilePhoneChange: (value: string) => void;
  onNewProfileAddressChange: (value: string) => void;
  onNewProfileAvatarUrlChange: (value: string) => void;
  onNewProfileActiveChange: (value: boolean) => void;
  onSaveProfile: (event: FormEvent<HTMLFormElement>) => void;
  onSendResetLink: (event: FormEvent<HTMLFormElement>) => void;
  onCreateCompany: (event: FormEvent<HTMLFormElement>) => void;
  onCreateBooth: (event: FormEvent<HTMLFormElement>) => void;
  onToggleProfileActive: (profile: Profile) => void;
  onToggleCompanyActive: (company: Company) => void;
  onToggleBoothActive: (booth: Booth) => void;
};

function getCompanyPct(company: Company) {
  return Number(company.commission_percent ?? company.comission_percent ?? 0);
}

export function SettingsSection({
  companyName,
  companyPct,
  boothCode,
  boothName,
  profileSearch,
  boothSearch,
  resetEmail,
  newProfileUserId,
  newProfileName,
  newProfileRole,
  newProfileCpf,
  newProfilePhone,
  newProfileAddress,
  newProfileAvatarUrl,
  newProfileActive,
  companies,
  filteredProfiles,
  filteredBooths,
  onCompanyNameChange,
  onCompanyPctChange,
  onBoothCodeChange,
  onBoothNameChange,
  onProfileSearchChange,
  onBoothSearchChange,
  onResetEmailChange,
  onNewProfileUserIdChange,
  onNewProfileNameChange,
  onNewProfileRoleChange,
  onNewProfileCpfChange,
  onNewProfilePhoneChange,
  onNewProfileAddressChange,
  onNewProfileAvatarUrlChange,
  onNewProfileActiveChange,
  onSaveProfile,
  onSendResetLink,
  onCreateCompany,
  onCreateBooth,
  onToggleProfileActive,
  onToggleCompanyActive,
  onToggleBoothActive,
}: SettingsSectionProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
      <SectionCard title="Cadastrar / atualizar usuario">
        <form onSubmit={onSaveProfile} style={{ display: "grid", gap: "0.75rem" }}>
          <input value={newProfileUserId} onChange={(event) => onNewProfileUserIdChange(event.target.value)} required placeholder="UUID do usuario (auth.users.id)" className="rb-field" />
          <input value={newProfileName} onChange={(event) => onNewProfileNameChange(event.target.value)} required placeholder="Nome completo" className="rb-field" />
          <input value={newProfileCpf} onChange={(event) => onNewProfileCpfChange(event.target.value)} placeholder="CPF" className="rb-field" />
          <input value={newProfilePhone} onChange={(event) => onNewProfilePhoneChange(event.target.value)} placeholder="Telefone" className="rb-field" />
          <input value={newProfileAddress} onChange={(event) => onNewProfileAddressChange(event.target.value)} placeholder="Endereco" className="rb-field" />
          <input value={newProfileAvatarUrl} onChange={(event) => onNewProfileAvatarUrlChange(event.target.value)} placeholder="URL avatar" className="rb-field" />
          <select value={newProfileRole} onChange={(event) => onNewProfileRoleChange(event.target.value as "admin" | "operator")} className="rb-field">
            <option value="operator">Operador</option>
            <option value="admin">Admin</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
            <input type="checkbox" checked={newProfileActive} onChange={(event) => onNewProfileActiveChange(event.target.checked)} />
            Usuario ativo
          </label>
          <button className="rb-btn-primary" type="submit">
            Salvar usuario
          </button>
        </form>
      </SectionCard>

      <div style={{ display: "grid", gap: "1.25rem" }}>
        <SectionCard title="Redefinicao de senha">
          <form onSubmit={onSendResetLink} style={{ display: "grid", gap: "0.75rem" }}>
            <input value={resetEmail} onChange={(event) => onResetEmailChange(event.target.value)} required type="email" placeholder="E-mail do usuario" className="rb-field" />
            <button className="rb-btn-primary" type="submit">
              Enviar link
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Cadastrar empresa">
          <form onSubmit={onCreateCompany} style={{ display: "grid", gap: "0.75rem" }}>
            <input value={companyName} onChange={(event) => onCompanyNameChange(event.target.value)} required placeholder="Nome da empresa" className="rb-field" />
            <input value={companyPct} onChange={(event) => onCompanyPctChange(event.target.value)} required type="number" min="0" step="0.001" placeholder="% Comissao" className="rb-field" />
            <button className="rb-btn-primary" type="submit">
              Salvar empresa
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Cadastrar guiche">
          <form onSubmit={onCreateBooth} style={{ display: "grid", gap: "0.75rem" }}>
            <input value={boothCode} onChange={(event) => onBoothCodeChange(event.target.value)} required placeholder="Codigo (ex: G02)" className="rb-field" />
            <input value={boothName} onChange={(event) => onBoothNameChange(event.target.value)} required placeholder="Nome (ex: Guiche 02)" className="rb-field" />
            <button className="rb-btn-primary" type="submit">
              Salvar guiche
            </button>
          </form>
        </SectionCard>
      </div>

      <div style={{ gridColumn: "1/-1" }}>
        <SectionCard title="Usuarios cadastrados">
          <input value={profileSearch} onChange={(event) => onProfileSearchChange(event.target.value)} placeholder="Buscar por nome, CPF ou perfil..." className="rb-field" style={{ marginBottom: "0.75rem" }} />
          <DataTable
            columns={[
              { key: "nome", header: "Nome", render: (row) => <span className="font-semibold">{row.full_name}</span> },
              { key: "cpf", header: "CPF", render: (row) => row.cpf ?? "—" },
              { key: "telefone", header: "Telefone", render: (row) => row.phone ?? "—" },
              { key: "perfil", header: "Perfil", render: (row) => <Badge variant="info">{row.role}</Badge> },
              { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => onToggleProfileActive(row)}>
                    {row.active ? "Inativar" : "Ativar"}
                  </Button>
                ),
              },
            ]}
            rows={filteredProfiles}
            emptyMessage="Nenhum usuario encontrado."
            className="mt-2"
          />
        </SectionCard>
      </div>

      <SectionCard title="Empresas">
        <DataTable
          columns={[
            { key: "nome", header: "Nome", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "comissao", header: "Comissao", render: (row) => `${getCompanyPct(row).toFixed(3)}%` },
            { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => onToggleCompanyActive(row)}>
                  {row.active ? "Inativar" : "Ativar"}
                </Button>
              ),
            },
          ]}
          rows={companies}
          emptyMessage="Nenhuma empresa encontrada."
          className="mt-2"
        />
      </SectionCard>

      <SectionCard title="Guiches">
        <input value={boothSearch} onChange={(event) => onBoothSearchChange(event.target.value)} placeholder="Buscar guiche..." className="rb-field" style={{ marginBottom: "0.75rem" }} />
        <DataTable
          columns={[
            { key: "codigo", header: "Codigo", render: (row) => <span className="font-bold">{row.code}</span> },
            { key: "nome", header: "Nome", render: (row) => row.name },
            { key: "status", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => onToggleBoothActive(row)}>
                  {row.active ? "Inativar" : "Ativar"}
                </Button>
              ),
            },
          ]}
          rows={filteredBooths}
          emptyMessage="Nenhum guiche encontrado."
          className="mt-2"
        />
      </SectionCard>
    </div>
  );
}
