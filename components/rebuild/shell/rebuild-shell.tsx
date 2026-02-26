"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, LogOut, Search, Shield, Store, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/rebuild/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/rebuild/operator", label: "Controle de Turno", icon: Store },
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
            <p className="rb-logo-overline">Painel Premium</p>
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
          <div className="rb-nav-divider" />
          <span className="rb-nav-caption">Sistema</span>
          <button className="rb-nav-item" type="button">
            <Shield size={18} />
            <span>Segurança</span>
          </button>
        </nav>

        <div className="rb-user-card">
          <div className="rb-user-avatar">
            <UserCircle2 size={22} />
          </div>
          <div>
            <p className="rb-user-name">Equipe Central</p>
            <p className="rb-user-role">Operação ativa</p>
          </div>
          <button className="rb-logout" type="button" aria-label="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="rb-main-wrap">
        <header className="rb-topbar">
          <div>
            <p className="rb-topbar-overline">Central Viagens</p>
            <p className="rb-topbar-title">{activeLabel}</p>
          </div>
          <div className="rb-topbar-actions">
            <label className="rb-search">
              <Search size={16} />
              <input placeholder="Buscar" />
            </label>
            <div className="rb-date-pill">
              <CalendarDays size={15} />
              <span>{new Date().toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </header>
        <main className="rb-main">{children}</main>
      </div>
    </div>
  );
}
