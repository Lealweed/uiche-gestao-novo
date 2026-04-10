"use client";

import { useMemo, type ChangeEventHandler, type FormEventHandler } from "react";
import { Check, Pencil, Power, X } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { type AppRole } from "@/lib/rbac";
import { SectionCard, StatusBadge } from "@/components/rebuild/admin/admin-common";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { DataTable } from "@/components/rebuild/ui/table";

type ProfileOption = {
  user_id: string;
  full_name: string;
  email?: string | null;
  cpf?: string | null;
  address?: string | null;
  phone?: string | null;
  role: AppRole;
  active: boolean;
};

type BoothOption = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  active: boolean;
};

type SubcategoryRow = {
  id: string;
  name: string;
  active: boolean;
  category_id: string;
  transaction_categories?: { name: string } | { name: string }[] | null;
};

type BoardingTaxRow = {
  id: string;
  name: string;
  amount: number;
  tax_type: "estadual" | "federal";
  active: boolean;
};

type OperatorBoothLinkRow = {
  id: string;
  active: boolean;
  operator_id?: string;
  booth_id?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { name: string; code: string } | { name: string; code: string }[] | null;
};

type AdminSettingsSectionProps = {
  selectedOperatorId: string;
  selectedBoothId: string;
  categoryName: string;
  subcategoryName: string;
  subcategoryCategoryId: string;
  boardingTaxName: string;
  boardingTaxAmount: string;
  boardingTaxType: "estadual" | "federal";
  profiles: ProfileOption[];
  booths: BoothOption[];
  categories: CategoryRow[];
  subcategories: SubcategoryRow[];
  boardingTaxes: BoardingTaxRow[];
  operatorBoothLinks: OperatorBoothLinkRow[];
  editingCategoryId: string | null;
  editingCategoryName: string;
  editingSubcategoryId: string | null;
  editingSubcategoryName: string;
  editingBoardingTaxId: string | null;
  editingBoardingTaxName: string;
  editingBoardingTaxAmount: string;
  editingBoardingTaxType: "estadual" | "federal";
  onSelectedOperatorChange: ChangeEventHandler<HTMLSelectElement>;
  onSelectedBoothChange: ChangeEventHandler<HTMLSelectElement>;
  onCategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onSubcategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onSubcategoryCategoryChange: ChangeEventHandler<HTMLSelectElement>;
  onBoardingTaxNameChange: ChangeEventHandler<HTMLInputElement>;
  onBoardingTaxAmountChange: ChangeEventHandler<HTMLInputElement>;
  onBoardingTaxTypeChange: ChangeEventHandler<HTMLSelectElement>;
  onEditingCategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onEditingSubcategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onEditingBoardingTaxNameChange: ChangeEventHandler<HTMLInputElement>;
  onEditingBoardingTaxAmountChange: ChangeEventHandler<HTMLInputElement>;
  onEditingBoardingTaxTypeChange: ChangeEventHandler<HTMLSelectElement>;
  onLinkOperatorToBooth: FormEventHandler<HTMLFormElement>;
  onCreateCategory: FormEventHandler<HTMLFormElement>;
  onCreateSubcategory: FormEventHandler<HTMLFormElement>;
  onCreateBoardingTax: FormEventHandler<HTMLFormElement>;
  onToggleOperatorBoothLink: (link: OperatorBoothLinkRow) => void | Promise<void>;
  onStartEditCategory: (category: CategoryRow) => void;
  onSaveEditCategory: () => void | Promise<void>;
  onCancelEditCategory: () => void;
  onToggleCategory: (category: CategoryRow) => void;
  onStartEditSubcategory: (subcategory: SubcategoryRow) => void;
  onSaveEditSubcategory: () => void | Promise<void>;
  onCancelEditSubcategory: () => void;
  onToggleSubcategory: (subcategory: SubcategoryRow) => void;
  onStartEditBoardingTax: (tax: BoardingTaxRow) => void;
  onSaveEditBoardingTax: () => void | Promise<void>;
  onCancelEditBoardingTax: () => void;
  onToggleBoardingTax: (tax: BoardingTaxRow) => void;
};


export function AdminSettingsSection({
  selectedOperatorId,
  selectedBoothId,
  categoryName,
  subcategoryName,
  subcategoryCategoryId,
  boardingTaxName,
  boardingTaxAmount,
  boardingTaxType,
  profiles,
  booths,
  categories,
  subcategories,
  boardingTaxes,
  operatorBoothLinks,
  editingCategoryId,
  editingCategoryName,
  editingSubcategoryId,
  editingSubcategoryName,
  editingBoardingTaxId,
  editingBoardingTaxName,
  editingBoardingTaxAmount,
  editingBoardingTaxType,
  onSelectedOperatorChange,
  onSelectedBoothChange,
  onCategoryNameChange,
  onSubcategoryNameChange,
  onSubcategoryCategoryChange,
  onBoardingTaxNameChange,
  onBoardingTaxAmountChange,
  onBoardingTaxTypeChange,
  onEditingCategoryNameChange,
  onEditingSubcategoryNameChange,
  onEditingBoardingTaxNameChange,
  onEditingBoardingTaxAmountChange,
  onEditingBoardingTaxTypeChange,
  onLinkOperatorToBooth,
  onCreateCategory,
  onCreateSubcategory,
  onCreateBoardingTax,
  onToggleOperatorBoothLink,
  onStartEditCategory,
  onSaveEditCategory,
  onCancelEditCategory,
  onToggleCategory,
  onStartEditSubcategory,
  onSaveEditSubcategory,
  onCancelEditSubcategory,
  onToggleSubcategory,
  onStartEditBoardingTax,
  onSaveEditBoardingTax,
  onCancelEditBoardingTax,
  onToggleBoardingTax,
}: AdminSettingsSectionProps) {
  const operatorOptions = useMemo(
    () => profiles.filter((profile) => profile.role === "operator" && profile.active).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [profiles]
  );

  const boothOptions = useMemo(
    () => booths.filter((booth) => booth.active).sort((a, b) => `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`)),
    [booths]
  );

  const sortedLinks = useMemo(
    () => [...operatorBoothLinks].sort((a, b) => Number(b.active) - Number(a.active) || (nameOf(a.profiles) ?? "").localeCompare(nameOf(b.profiles) ?? "")),
    [operatorBoothLinks]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    [categories]
  );

  const sortedSubcategories = useMemo(
    () => [...subcategories].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    [subcategories]
  );

  const sortedBoardingTaxes = useMemo(
    () => [...boardingTaxes].sort((a, b) => Number(b.active) - Number(a.active) || a.tax_type.localeCompare(b.tax_type) || a.name.localeCompare(b.name)),
    [boardingTaxes]
  );

  const activeLinksCount = sortedLinks.filter((link) => link.active).length;
  const activeCategoriesCount = sortedCategories.filter((category) => category.active).length;
  const activeSubcategoriesCount = sortedSubcategories.filter((subcategory) => subcategory.active).length;
  const activeBoardingTaxesCount = sortedBoardingTaxes.filter((tax) => tax.active).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Configuracoes Operacionais"
        subtitle="Gerencie usuarios, vinculos, categorias, subcategorias e taxas de embarque com mais clareza administrativa."
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{activeLinksCount} vinculo(s)</Badge>
        <Badge variant="secondary">{activeCategoriesCount} categoria(s)</Badge>
        <Badge variant="secondary">{activeSubcategoriesCount} subcategoria(s)</Badge>
        <Badge variant="secondary">{activeBoardingTaxesCount} taxa(s) embarque</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Vinculos Operador - Guiche" className="h-full">
          <p className="mb-4 text-sm text-muted">
            Associe operadores aos guiches disponiveis e reative vinculos quando necessario.
          </p>

          <form onSubmit={onLinkOperatorToBooth} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
            <select
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
              value={selectedOperatorId}
              onChange={onSelectedOperatorChange}
              required
              disabled={operatorOptions.length === 0}
            >
              <option value="">Operador ativo</option>
              {operatorOptions.map((profile) => (
                <option key={profile.user_id} value={profile.user_id}>
                  {profile.full_name}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
              value={selectedBoothId}
              onChange={onSelectedBoothChange}
              required
              disabled={boothOptions.length === 0}
            >
              <option value="">Guiche ativo</option>
              {boothOptions.map((booth) => (
                <option key={booth.id} value={booth.id}>
                  {booth.code} - {booth.name}
                </option>
              ))}
            </select>

            <Button type="submit" disabled={operatorOptions.length === 0 || boothOptions.length === 0}>
              Salvar vinculo
            </Button>
          </form>

          {(operatorOptions.length === 0 || boothOptions.length === 0) && (
            <div className="mb-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] px-3 py-2 text-sm text-muted">
              {operatorOptions.length === 0
                ? "Nao ha operadores ativos disponiveis para vinculo."
                : "Nao ha guiches ativos disponiveis para vinculo."}
            </div>
          )}

          <DataTable
            columns={[
              { key: "operador", header: "Operador", render: (link) => nameOf(link.profiles) ?? "-" },
              {
                key: "guiche",
                header: "Guiche",
                render: (link) => {
                  const booth = boothOf(link.booths);
                  return booth ? `${booth.code} - ${booth.name}` : "-";
                },
              },
              { key: "status", header: "Status", render: (link) => <StatusBadge active={link.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (link) => (
                  <Button variant="ghost" size="sm" onClick={() => void onToggleOperatorBoothLink(link)}>
                    {link.active ? "Desativar vinculo" : "Reativar vinculo"}
                  </Button>
                ),
              },
            ]}
            rows={sortedLinks}
            emptyMessage="Nenhum vinculo cadastrado."
          />
        </SectionCard>

        <SectionCard title="Categorias de Transacao" className="h-full">
          <p className="mb-4 text-sm text-muted">
            Use categorias para organizar os lancamentos principais e manter os relatorios claros.
          </p>

          <form onSubmit={onCreateCategory} className="mb-4 flex gap-2">
            <input
              value={categoryName}
              onChange={onCategoryNameChange}
              required
              placeholder="Nome da categoria"
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit">Nova categoria</Button>
          </form>

          <DataTable
            columns={[
              {
                key: "nome",
                header: "Nome",
                render: (category) =>
                  editingCategoryId === category.id ? (
                    <input
                      value={editingCategoryName}
                      onChange={onEditingCategoryNameChange}
                      className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                      autoFocus
                    />
                  ) : (
                    category.name
                  ),
              },
              { key: "status", header: "Status", render: (category) => <StatusBadge active={category.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (category) =>
                  editingCategoryId === category.id ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void onSaveEditCategory()}>
                        <Check className="h-4 w-4 text-emerald-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onCancelEditCategory}>
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onStartEditCategory(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onToggleCategory(category)} title={category.active ? "Inativar" : "Ativar"}>
                        <Power className={`h-4 w-4 ${category.active ? "text-amber-400" : "text-emerald-400"}`} />
                      </Button>
                    </div>
                  ),
              },
            ]}
            rows={sortedCategories}
            emptyMessage="Nenhuma categoria cadastrada."
          />
        </SectionCard>
      </div>

      <SectionCard title="Subcategorias de Transacao">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">
            Detalhe as categorias com subcategorias operacionais e mantenha a classificacao consistente.
          </p>
          <Badge variant="secondary">{sortedSubcategories.length} cadastrada(s)</Badge>
        </div>

        <form onSubmit={onCreateSubcategory} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr_auto]">
          <select
            value={subcategoryCategoryId}
            onChange={onSubcategoryCategoryChange}
            required
            disabled={activeCategoriesCount === 0}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            <option value="">Categoria pai</option>
            {sortedCategories
              .filter((category) => category.active)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>

          <input
            value={subcategoryName}
            onChange={onSubcategoryNameChange}
            required
            placeholder="Nome da subcategoria"
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <Button type="submit" disabled={activeCategoriesCount === 0}>
            Nova subcategoria
          </Button>
        </form>

        {activeCategoriesCount === 0 && (
          <div className="mb-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] px-3 py-2 text-sm text-muted">
            Cadastre e ative uma categoria antes de criar subcategorias.
          </div>
        )}

        <DataTable
          columns={[
            {
              key: "nome",
              header: "Nome",
              render: (subcategory) =>
                editingSubcategoryId === subcategory.id ? (
                  <input
                    value={editingSubcategoryName}
                    onChange={onEditingSubcategoryNameChange}
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  subcategory.name
                ),
            },
            {
              key: "categoria",
              header: "Categoria",
              render: (subcategory) => {
                const category = subcategory.transaction_categories;
                return Array.isArray(category) ? category[0]?.name : category?.name ?? "-";
              },
            },
            { key: "status", header: "Status", render: (subcategory) => <StatusBadge active={subcategory.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (subcategory) =>
                editingSubcategoryId === subcategory.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void onSaveEditSubcategory()}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelEditSubcategory}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onStartEditSubcategory(subcategory)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleSubcategory(subcategory)} title={subcategory.active ? "Inativar" : "Ativar"}>
                      <Power className={`h-4 w-4 ${subcategory.active ? "text-amber-400" : "text-emerald-400"}`} />
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={sortedSubcategories}
          emptyMessage="Nenhuma subcategoria cadastrada."
        />
      </SectionCard>

      <SectionCard title="Taxas de Embarque">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">
            Defina os valores oficiais usados pelo operador no PDV como fonte unica de verdade.
          </p>
          <Badge variant="secondary">{sortedBoardingTaxes.length} cadastrada(s)</Badge>
        </div>

        <form onSubmit={onCreateBoardingTax} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_140px_auto]">
          <select
            value={boardingTaxType}
            onChange={onBoardingTaxTypeChange}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            <option value="estadual">Estadual</option>
            <option value="federal">Federal</option>
          </select>

          <input
            value={boardingTaxName}
            onChange={onBoardingTaxNameChange}
            required
            placeholder="Nome da taxa"
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <input
            value={boardingTaxAmount}
            onChange={onBoardingTaxAmountChange}
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <Button type="submit">Nova taxa</Button>
        </form>

        <DataTable
          columns={[
            {
              key: "nome",
              header: "Nome",
              render: (tax) =>
                editingBoardingTaxId === tax.id ? (
                  <input
                    value={editingBoardingTaxName}
                    onChange={onEditingBoardingTaxNameChange}
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  tax.name
                ),
            },
            {
              key: "tipo",
              header: "Tipo",
              render: (tax) =>
                editingBoardingTaxId === tax.id ? (
                  <select
                    value={editingBoardingTaxType}
                    onChange={onEditingBoardingTaxTypeChange}
                    className="rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  >
                    <option value="estadual">Estadual</option>
                    <option value="federal">Federal</option>
                  </select>
                ) : (
                  <Badge variant={tax.tax_type === "estadual" ? "warning" : "info"}>
                    {tax.tax_type === "estadual" ? "Estadual" : "Federal"}
                  </Badge>
                ),
            },
            {
              key: "valor",
              header: "Valor",
              render: (tax) =>
                editingBoardingTaxId === tax.id ? (
                  <input
                    value={editingBoardingTaxAmount}
                    onChange={onEditingBoardingTaxAmountChange}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                  />
                ) : (
                  formatCurrency(Number(tax.amount || 0))
                ),
            },
            { key: "status", header: "Status", render: (tax) => <StatusBadge active={tax.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (tax) =>
                editingBoardingTaxId === tax.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void onSaveEditBoardingTax()}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelEditBoardingTax}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onStartEditBoardingTax(tax)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleBoardingTax(tax)} title={tax.active ? "Inativar" : "Ativar"}>
                      <Power className={`h-4 w-4 ${tax.active ? "text-amber-400" : "text-emerald-400"}`} />
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={sortedBoardingTaxes}
          emptyMessage="Nenhuma taxa de embarque cadastrada."
        />
      </SectionCard>
    </div>
  );
}
