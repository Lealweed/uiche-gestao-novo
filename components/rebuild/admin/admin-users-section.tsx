"use client";

import type { ChangeEventHandler, FormEventHandler } from "react";
import { Power } from "lucide-react";

import { type AppRole } from "@/lib/rbac";
import { SectionCard, StatusBadge } from "@/components/rebuild/admin/admin-common";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Input } from "@/components/rebuild/ui/input";
import { DataTable } from "@/components/rebuild/ui/table";

type UserRow = {
  user_id: string;
  full_name: string;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  active: boolean;
};

type AdminUsersSectionProps = {
  newProfileUserId: string;
  newProfileName: string;
  newProfileCpf: string;
  newProfilePhone: string;
  newProfileAddress: string;
  newProfileAvatarUrl: string;
  newProfileRole: AppRole;
  newProfileActive: boolean;
  resetEmail: string;
  profileSearch: string;
  filteredProfiles: UserRow[];
  onNewProfileUserIdChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfileNameChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfileCpfChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfilePhoneChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfileAddressChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfileAvatarUrlChange: ChangeEventHandler<HTMLInputElement>;
  onNewProfileRoleChange: ChangeEventHandler<HTMLSelectElement>;
  onNewProfileActiveChange: ChangeEventHandler<HTMLInputElement>;
  onResetEmailChange: ChangeEventHandler<HTMLInputElement>;
  onProfileSearchChange: ChangeEventHandler<HTMLInputElement>;
  onSaveProfile: FormEventHandler<HTMLFormElement>;
  onSendResetLink: FormEventHandler<HTMLFormElement>;
  onToggleProfile: (profile: UserRow) => void;
};

export function AdminUsersSection({
  newProfileUserId,
  newProfileName,
  newProfileCpf,
  newProfilePhone,
  newProfileAddress,
  newProfileAvatarUrl,
  newProfileRole,
  newProfileActive,
  resetEmail,
  profileSearch,
  filteredProfiles,
  onNewProfileUserIdChange,
  onNewProfileNameChange,
  onNewProfileCpfChange,
  onNewProfilePhoneChange,
  onNewProfileAddressChange,
  onNewProfileAvatarUrlChange,
  onNewProfileRoleChange,
  onNewProfileActiveChange,
  onResetEmailChange,
  onProfileSearchChange,
  onSaveProfile,
  onSendResetLink,
  onToggleProfile,
}: AdminUsersSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Cadastrar / Atualizar Usuario">
          <form onSubmit={onSaveProfile} className="space-y-4">
            <Input value={newProfileUserId} onChange={onNewProfileUserIdChange} required placeholder="UUID do usuario (auth.users.id)" />
            <Input value={newProfileName} onChange={onNewProfileNameChange} required placeholder="Nome completo" />
            <Input value={newProfileCpf} onChange={onNewProfileCpfChange} placeholder="CPF" />
            <Input value={newProfilePhone} onChange={onNewProfilePhoneChange} placeholder="Telefone" />
            <Input value={newProfileAddress} onChange={onNewProfileAddressChange} placeholder="Endereco" />
            <Input value={newProfileAvatarUrl} onChange={onNewProfileAvatarUrlChange} placeholder="URL avatar" />
            <select
              value={newProfileRole}
              onChange={onNewProfileRoleChange}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="operator">Operador</option>
              <option value="financeiro">Financeiro</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={newProfileActive} onChange={onNewProfileActiveChange} className="rounded" />
              Usuario ativo
            </label>
            <Button type="submit" className="w-full">
              Salvar Usuario
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Redefinicao de Senha">
          <form onSubmit={onSendResetLink} className="space-y-4">
            <Input value={resetEmail} onChange={onResetEmailChange} required type="email" placeholder="E-mail do usuario" />
            <Button type="submit" className="w-full">
              Enviar Link de Redefinicao
            </Button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Usuarios Cadastrados">
        <Input value={profileSearch} onChange={onProfileSearchChange} placeholder="Buscar por nome, CPF ou perfil..." className="mb-4" />
        <DataTable
          columns={[
            { key: "nome", header: "Nome", render: (p) => <span className="font-semibold">{p.full_name}</span> },
            { key: "cpf", header: "CPF", render: (p) => p.cpf ?? "-" },
            { key: "telefone", header: "Telefone", render: (p) => p.phone ?? "-" },
            { key: "perfil", header: "Perfil", render: (p) => <Badge variant="info">{p.role}</Badge> },
            { key: "status", header: "Status", render: (p) => <StatusBadge active={p.active} /> },
            {
              key: "acao",
              header: "Acao",
              render: (p) => (
                <Button variant="ghost" size="sm" onClick={() => onToggleProfile(p)} title={p.active ? "Inativar" : "Ativar"}>
                  <Power className={`h-4 w-4 ${p.active ? "text-amber-400" : "text-emerald-400"}`} />
                </Button>
              ),
            },
          ]}
          rows={filteredProfiles}
          emptyMessage="Nenhum usuario encontrado."
        />
      </SectionCard>
    </div>
  );
}
