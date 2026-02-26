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
  Store,
  UserCircle2,
  Users,
  BarChart3,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { href: "/rebuild/admin", label: "Dashboard", icon: LayoutGrid, section: "dashboard" },
  { href: "/rebuild/operator", label: "Controle de Turno", icon: Clock3 },
  { href: "/rebuild/admin?section=historico", label: "Histórico", icon: FileText, section: "historico" },
  { href: "/rebuild/admin?section=relatorios", label: "Relatórios", icon: BarChart3, section: "relatorios" },
] as const;

const systemNavigation = [
  { href: "/rebuild/admin?section=usuarios", label: "Usuários", icon: Users, section: "usuarios" },
  { href: "/rebuild/admin?section=configuracoes", label: "Configurações", icon: Settings, section: "configuracoes" },
] as const;

const adminSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  historico: "Histórico",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
};

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSection = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("section") || "dashboard" : "dashboard";

  const activeLabel = pathname.includes("/operator")
    ? "Controle de Turno"
    : adminSectionLabels[currentSection] || "Dashboard";

  function isNavActive(itemHref: string, section?: string) {
    if (itemHref === "/rebuild/operator") return pathname === "/rebuild/operator";
    if (!pathname.startsWith("/rebuild/admin")) return false;
    return section ? currentSection === section : currentSection === "dashboard";
  }

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
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.href, "section" in item ? item.section : undefined);
            return (
              <Link key={item.href} href={item.href} className={cn("rb-nav-item", isActive && "active")}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="rb-nav-divider" />
          <span className="rb-nav-caption">Sistema</span>

          {systemNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.href, item.section);
            return (
              <Link key={item.href} href={item.href} className={cn("rb-nav-item", isActive && "active")}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
