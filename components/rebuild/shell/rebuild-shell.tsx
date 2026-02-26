"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Shield,
  Store,
  UserCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/rebuild/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/rebuild/operator", label: "Controle de Turno", icon: Store },
];

const secondary = [
  { label: "Histórico", icon: FileText },
  { label: "Relatórios", icon: Shield },
];

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeLabel = pathname.includes("/operator") ? "Controle de Turno" : "Dashboard";

  return (
    <div className="rb-shell">
      <aside className="rb-sidebar">
        <div className="rb-logo-wrap">
          <div className="rb-logo-mark">
            <Store size={18} />
          </div>
          <div>
            <p className="rb-logo-title">Central Viagens</p>
            <p className="rb-logo-overline">Admin Pro</p>
          </div>
        </div>

        <nav className="rb-nav" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("rb-nav-item", isActive && "active")}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className="rb-nav-item" type="button">
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="rb-nav-divider" />
          <span className="rb-nav-caption">Sistema</span>
          <button className="rb-nav-item" type="button">
            <Users size={18} />
            <span>Usuários</span>
          </button>
          <button className="rb-nav-item" type="button">
            <Settings size={18} />
            <span>Configurações</span>
          </button>
        </nav>

        <div className="rb-user-card">
          <div className="rb-user-avatar">
            <UserCircle2 size={22} />
          </div>
          <div>
            <p className="rb-user-name">Equipe Central</p>
            <p className="rb-user-role">Gerência</p>
          </div>
          <button className="rb-logout" type="button" aria-label="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="rb-main-wrap">
        <header className="rb-topbar">
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-medium">Central Viagens</span>
            <ChevronRight size={14} className="mx-2 text-slate-400" />
            <span className="text-slate-900 font-semibold">{activeLabel}</span>
          </div>
          <div className="rb-topbar-actions">
            <label className="rb-search">
              <Search size={16} />
              <input placeholder="Buscar transação, cliente ou operador..." />
            </label>
            <button type="button" className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50">
              <Bell size={16} />
            </button>
            <div className="rb-date-pill">
              <CalendarDays size={15} />
              <span>{new Date().toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </header>
        <main className="rb-main rb-content">{children}</main>
      </div>
    </div>
  );
}
