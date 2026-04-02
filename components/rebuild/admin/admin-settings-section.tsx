"use client";

import type { ChangeEventHandler, FormEventHandler } from "react";
import { Check, Pencil, Power, X } from "lucide-react";

import { boothOf, nameOf } from "@/lib/admin/admin-helpers";
import { type AppRole } from "@/lib/rbac";
import { SectionCard, StatusBadge } from "@/components/rebuild/admin/admin-common";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";

type ProfileOption = {
  user_id: string;
  full_name: string;
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
  profiles: ProfileOption[];
  booths: BoothOption[];
  categories: CategoryRow[];
  subcategories: SubcategoryRow[];
  operatorBoothLinks: OperatorBoothLinkRow[];
  editingCategoryId: string | null;
  editingCategoryName: string;
  editingSubcategoryId: string | null;
  editingSubcategoryName: string;
  onSelectedOperatorChange: ChangeEventHandler<HTMLSelectElement>;
  onSelectedBoothChange: ChangeEventHandler<HTMLSelectElement>;
  onCategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onSubcategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onSubcategoryCategoryChange: ChangeEventHandler<HTMLSelectElement>;
  onEditingCategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onEditingSubcategoryNameChange: ChangeEventHandler<HTMLInputElement>;
  onLinkOperatorToBooth: FormEventHandler<HTMLFormElement>;
  onCreateCategory: FormEventHandler<HTMLFormElement>;
  onCreateSubcategory: FormEventHandler<HTMLFormElement>;
  onToggleOperatorBoothLink: (link: OperatorBoothLinkRow) => void | Promise<void>;
  onStartEditCategory: (category: CategoryRow) => void;
  onSaveEditCategory: () => void | Promise<void>;
  onCancelEditCategory: () => void;
  onToggleCategory: (category: CategoryRow) => void;
  onStartEditSubcategory: (subcategory: SubcategoryRow) => void;
  onSaveEditSubcategory: () => void | Promise<void>;
  onCancelEditSubcategory: () => void;
  onToggleSubcategory: (subcategory: SubcategoryRow) => void;
};

export function AdminSettingsSection({
  selectedOperatorId,
  selectedBoothId,
  categoryName,
  subcategoryName,
  subcategoryCategoryId,
  profiles,
  booths,
  categories,
  subcategories,
  operatorBoothLinks,
  editingCategoryId,
  editingCategoryName,
  editingSubcategoryId,
  editingSubcategoryName,
  onSelectedOperatorChange,
  onSelectedBoothChange,
  onCategoryNameChange,
  onSubcategoryNameChange,
  onSubcategoryCategoryChange,
  onEditingCategoryNameChange,
  onEditingSubcategoryNameChange,
  onLinkOperatorToBooth,
  onCreateCategory,
  onCreateSubcategory,
  onToggleOperatorBoothLink,
  onStartEditCategory,
  onSaveEditCategory,
  onCancelEditCategory,
  onToggleCategory,
  onStartEditSubcategory,
  onSaveEditSubcategory,
  onCancelEditSubcategory,
  onToggleSubcategory,
}: AdminSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Vinculos Operador - Guiche"
          action={
            <form onSubmit={onLinkOperatorToBooth} className="flex gap-2">
              <select
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                value={selectedOperatorId}
                onChange={onSelectedOperatorChange}
                required
              >
                <option value="">Operador</option>
                {profiles
                  .filter((p) => p.role === "operator")
                  .map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.full_name}
                    </option>
                  ))}
              </select>
              <select
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                value={selectedBoothId}
                onChange={onSelectedBoothChange}
                required
              >
                <option value="">Guiche</option>
                {booths
                  .filter((b) => b.active)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
              </select>
              <Button type="submit">Vincular</Button>
            </form>
          }
        >
          <DataTable
            columns={[
              { key: "operador", header: "Operador", render: (l) => nameOf(l.profiles) ?? "-" },
              {
                key: "guiche",
                header: "Guiche",
                render: (l) => {
                  const booth = boothOf(l.booths);
                  return booth ? `${booth.code} - ${booth.name}` : "-";
                },
              },
              { key: "status", header: "Status", render: (l) => <StatusBadge active={l.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (l) => (
                  <Button variant="ghost" size="sm" onClick={() => onToggleOperatorBoothLink(l)}>
                    {l.active ? "Desvincular" : "Reativar"}
                  </Button>
                ),
              },
            ]}
            rows={operatorBoothLinks}
            emptyMessage="Nenhum vinculo encontrado."
          />
        </SectionCard>

        <SectionCard title="Categorias de Transacao">
          <form onSubmit={onCreateCategory} className="mb-4 flex gap-2">
            <input
              value={categoryName}
              onChange={onCategoryNameChange}
              required
              placeholder="Nome da categoria"
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit">+</Button>
          </form>
          <DataTable
            columns={[
              {
                key: "nome",
                header: "Nome",
                render: (c) =>
                  editingCategoryId === c.id ? (
                    <input
                      value={editingCategoryName}
                      onChange={onEditingCategoryNameChange}
                      className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                      autoFocus
                    />
                  ) : (
                    c.name
                  ),
              },
              { key: "status", header: "Status", render: (c) => <StatusBadge active={c.active} /> },
              {
                key: "acao",
                header: "Acao",
                render: (c) =>
                  editingCategoryId === c.id ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={onSaveEditCategory}>
                        <Check className="h-4 w-4 text-emerald-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onCancelEditCategory}>
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onStartEditCategory(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onToggleCategory(c)} title={c.active ? "Inativar" : "Ativar"}>
                        <Power className={`h-4 w-4 ${c.active ? "text-amber-400" : "text-emerald-400"}`} />
                      </Button>
                    </div>
                  ),
              },
            ]}
            rows={categories}
            emptyMessage="Nenhuma categoria encontrada."
          />
        </SectionCard>
      </div>

      <SectionCard title="Subcategorias de Transacao">
        <form onSubmit={onCreateSubcategory} className="mb-4 flex flex-wrap gap-2">
          <select
            value={subcategoryCategoryId}
            onChange={onSubcategoryCategoryChange}
            required
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            <option value="">Categoria pai</option>
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <Button type="submit">+</Button>
        </form>
        <DataTable
          columns={[
            {
              key: "nome",
              header: "Nome",
              render: (s) =>
                editingSubcategoryId === s.id ? (
                  <input
                    value={editingSubcategoryName}
                    onChange={onEditingSubcategoryNameChange}
                    className="w-full rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  s.name
                ),
            },
            {
              key: "categoria",
              header: "Categoria",
              render: (s) => {
                const category = s.transaction_categories;
                return Array.isArray(category) ? category[0]?.name : category?.name ?? "-";
              },
            },
            { key: "status", header: "Status", render: (s) => <StatusBadge active={s.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (s) =>
                editingSubcategoryId === s.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={onSaveEditSubcategory}>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelEditSubcategory}>
                      <X className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onStartEditSubcategory(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onToggleSubcategory(s)} title={s.active ? "Inativar" : "Ativar"}>
                      <Power className={`h-4 w-4 ${s.active ? "text-amber-400" : "text-emerald-400"}`} />
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={subcategories.slice(0, 20)}
          emptyMessage="Nenhuma subcategoria encontrada."
        />
      </SectionCard>
    </div>
  );
}
