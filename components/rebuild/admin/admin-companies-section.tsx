"use client";

import type { ChangeEventHandler, FormEventHandler } from "react";
import { Check, Pencil, Power, X } from "lucide-react";

import { SectionCard, StatusBadge } from "@/components/rebuild/admin/admin-common";
import { Button } from "@/components/rebuild/ui/button";
import { Input } from "@/components/rebuild/ui/input";
import { DataTable } from "@/components/rebuild/ui/table";
import { getCompanyPct } from "@/lib/admin/admin-helpers";

type CompanyRow = {
  id: string;
  name: string;
  commission_percent?: number | null;
  comission_percent?: number | null;
  dia_repasse?: number | null;
  payout_days?: number | null;
  active: boolean;
};

type BoothRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type AdminCompaniesSectionProps = {
  companyName: string;
  companyPct: string;
  companyRepasseDay: string;
  companyPayoutDays: string;
  boothCode: string;
  boothName: string;
  boothSearch: string;
  companies: CompanyRow[];
  filteredBooths: BoothRow[];
  editingCompanyId: string | null;
  editingCompanyName: string;
  editingCompanyPct: string;
  editingCompanyRepasseDay: string;
  editingCompanyPayoutDays: string;
  editingBoothId: string | null;
  editingBoothCode: string;
  editingBoothName: string;
  onCompanyNameChange: ChangeEventHandler<HTMLInputElement>;
  onCompanyPctChange: ChangeEventHandler<HTMLInputElement>;
  onCompanyRepasseDayChange: ChangeEventHandler<HTMLInputElement>;
  onCompanyPayoutDaysChange: ChangeEventHandler<HTMLInputElement>;
  onBoothCodeChange: ChangeEventHandler<HTMLInputElement>;
  onBoothNameChange: ChangeEventHandler<HTMLInputElement>;
  onBoothSearchChange: ChangeEventHandler<HTMLInputElement>;
  onEditingCompanyNameChange: ChangeEventHandler<HTMLInputElement>;
  onEditingCompanyPctChange: ChangeEventHandler<HTMLInputElement>;
  onEditingCompanyRepasseDayChange: ChangeEventHandler<HTMLInputElement>;
  onEditingCompanyPayoutDaysChange: ChangeEventHandler<HTMLInputElement>;
  onEditingBoothCodeChange: ChangeEventHandler<HTMLInputElement>;
  onEditingBoothNameChange: ChangeEventHandler<HTMLInputElement>;
  onCreateCompany: FormEventHandler<HTMLFormElement>;
  onCreateBooth: FormEventHandler<HTMLFormElement>;
  onStartEditCompany: (company: CompanyRow) => void;
  onSaveEditCompany: () => void;
  onCancelEditCompany: () => void;
  onToggleCompany: (company: CompanyRow) => void;
  onStartEditBooth: (booth: BoothRow) => void;
  onSaveEditBooth: () => void;
  onCancelEditBooth: () => void;
  onToggleBooth: (booth: BoothRow) => void;
};

function formatRepasseDay(day: number | null | undefined) {
  return typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31 ? `Dia ${day}` : "Nao definido";
}

function formatPayoutDays(days: number | null | undefined) {
  const safeDays = typeof days === "number" && Number.isFinite(days) && days >= 0 ? Math.trunc(days) : 0;
  return `${safeDays} dia${safeDays === 1 ? "" : "s"}`;
}

export function AdminCompaniesSection({
  companyName,
  companyPct,
  companyRepasseDay,
  companyPayoutDays,
  boothCode,
  boothName,
  boothSearch,
  companies,
  filteredBooths,
  editingCompanyId,
  editingCompanyName,
  editingCompanyPct,
  editingCompanyRepasseDay,
  editingCompanyPayoutDays,
  editingBoothId,
  editingBoothCode,
  editingBoothName,
  onCompanyNameChange,
  onCompanyPctChange,
  onCompanyRepasseDayChange,
  onCompanyPayoutDaysChange,
  onBoothCodeChange,
  onBoothNameChange,
  onBoothSearchChange,
  onEditingCompanyNameChange,
  onEditingCompanyPctChange,
  onEditingCompanyRepasseDayChange,
  onEditingCompanyPayoutDaysChange,
  onEditingBoothCodeChange,
  onEditingBoothNameChange,
  onCreateCompany,
  onCreateBooth,
  onStartEditCompany,
  onSaveEditCompany,
  onCancelEditCompany,
  onToggleCompany,
  onStartEditBooth,
  onSaveEditBooth,
  onCancelEditBooth,
  onToggleBooth,
}: AdminCompaniesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Cadastrar Nova Empresa">
          <form onSubmit={onCreateCompany} className="space-y-4">
            <Input value={companyName} onChange={onCompanyNameChange} required placeholder="Nome da empresa / viacao" />
            <Input value={companyPct} onChange={onCompanyPctChange} required type="number" min="0" step="0.001" placeholder="% Comissao Central" />
            <Input value={companyRepasseDay} onChange={onCompanyRepasseDayChange} type="number" min="1" max="31" step="1" placeholder="Dia de repasse (1-31)" />
            <Input value={companyPayoutDays} onChange={onCompanyPayoutDaysChange} type="number" min="0" step="1" placeholder="Prazo de repasse (dias)" />
            <Button type="submit" className="w-full">
              Cadastrar Empresa
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Cadastrar Novo Guiche">
          <form onSubmit={onCreateBooth} className="space-y-4">
            <Input value={boothCode} onChange={onBoothCodeChange} required placeholder="Codigo (ex: G02)" />
            <Input value={boothName} onChange={onBoothNameChange} required placeholder="Nome (ex: Guiche 02)" />
            <Button type="submit" className="w-full">
              Cadastrar Guiche
            </Button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Empresas / Viacoes">
        <DataTable
          columns={[
            {
              key: "nome",
              header: "Nome",
              render: (c) =>
                editingCompanyId === c.id ? (
                  <input
                    value={editingCompanyName}
                    onChange={onEditingCompanyNameChange}
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  <span className="font-semibold">{c.name}</span>
                ),
            },
            {
              key: "comissao",
              header: "Comissao Central",
              render: (c) =>
                editingCompanyId === c.id ? (
                  <input
                    value={editingCompanyPct}
                    onChange={onEditingCompanyPctChange}
                    type="number"
                    step="0.001"
                    className="w-20 rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  />
                ) : (
                  `${getCompanyPct(c).toFixed(3)}%`
                ),
            },
            {
              key: "repasse",
              header: "Dia Repasse",
              render: (c) =>
                editingCompanyId === c.id ? (
                  <input
                    value={editingCompanyRepasseDay}
                    onChange={onEditingCompanyRepasseDayChange}
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="1-31"
                    className="w-20 rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  />
                ) : (
                  <span className="text-sm text-foreground/90">{formatRepasseDay(c.dia_repasse)}</span>
                ),
            },
            {
              key: "prazo",
              header: "Prazo de Repasse",
              render: (c) =>
                editingCompanyId === c.id ? (
                  <input
                    value={editingCompanyPayoutDays}
                    onChange={onEditingCompanyPayoutDaysChange}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-20 rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  />
                ) : (
                  <span className="text-sm text-foreground/90">{formatPayoutDays(c.payout_days)}</span>
                ),
            },
            { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (c) =>
                editingCompanyId === c.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={onSaveEditCompany}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelEditCompany}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onStartEditCompany(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleCompany(c)} title={c.active ? "Inativar" : "Ativar"}>
                      <Power className={`h-4 w-4 ${c.active ? "text-amber-400" : "text-emerald-400"}`} />
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={companies}
          emptyMessage="Nenhuma empresa cadastrada."
        />
      </SectionCard>

      <SectionCard title="Guiches de Venda">
        <Input value={boothSearch} onChange={onBoothSearchChange} placeholder="Buscar guiche..." className="mb-4" />
        <DataTable
          columns={[
            {
              key: "codigo",
              header: "Codigo",
              render: (b) =>
                editingBoothId === b.id ? (
                  <input
                    value={editingBoothCode}
                    onChange={onEditingBoothCodeChange}
                    className="w-16 rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  <span className="font-bold">{b.code}</span>
                ),
            },
            {
              key: "nome",
              header: "Nome",
              render: (b) =>
                editingBoothId === b.id ? (
                  <input
                    value={editingBoothName}
                    onChange={onEditingBoothNameChange}
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  />
                ) : (
                  b.name
                ),
            },
            { key: "status", header: "Status", render: (b) => <StatusBadge active={b.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (b) =>
                editingBoothId === b.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={onSaveEditBooth}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelEditBooth}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onStartEditBooth(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleBooth(b)} title={b.active ? "Inativar" : "Ativar"}>
                      <Power className={`h-4 w-4 ${b.active ? "text-amber-400" : "text-emerald-400"}`} />
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={filteredBooths}
          emptyMessage="Nenhum guiche cadastrado."
        />
      </SectionCard>
    </div>
  );
}
