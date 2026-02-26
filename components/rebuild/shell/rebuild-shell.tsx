"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNavigation = [
  { href: "/rebuild/admin", label: "Dashboard", icon: "grid_view", section: "dashboard" },
  { href: "/rebuild/operator", label: "Controle de Turno", icon: "point_of_sale" },
  { href: "/rebuild/admin?section=historico", label: "Histórico", icon: "receipt_long", section: "historico" },
  { href: "/rebuild/admin?section=relatorios", label: "Relatórios", icon: "analytics", section: "relatorios" },
] as const;

const systemNavigation = [
  { href: "/rebuild/admin?section=usuarios", label: "Usuários", icon: "group", section: "usuarios" },
  { href: "/rebuild/admin?section=configuracoes", label: "Configurações", icon: "settings", section: "configuracoes" },
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
    <div className="flex h-screen w-full bg-[#F8FAFC] font-[Manrope] text-slate-700 antialiased overflow-hidden">
      <aside className="w-[260px] bg-slate-900 text-white flex flex-col flex-shrink-0 z-20 shadow-xl relative">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#0da2e7] to-blue-600 shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-white text-[20px]">flight_takeoff</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Central Viagens</h1>
              <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Admin Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {primaryNavigation.map((item) => {
            const active = isNavActive(item.href, "section" in item ? item.section : undefined);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? "bg-[#0da2e7] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? "" : "group-hover:text-[#0da2e7]"}`}>{item.icon}</span>
                <span className={active ? "text-sm font-semibold" : "text-sm font-medium"}>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-4 border-t border-slate-800 mx-2"></div>
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sistema</p>

          {systemNavigation.map((item) => {
            const active = isNavActive(item.href, item.section);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? "bg-[#0da2e7] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active ? "" : "group-hover:text-[#0da2e7]"}`}>{item.icon}</span>
                <span className={active ? "text-sm font-semibold" : "text-sm font-medium"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-slate-700 border-2 border-slate-700"></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Equipe Central</p>
              <p className="text-xs text-slate-400 truncate">Gerência</p>
            </div>
            <button className="text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-medium">Central Viagens</span>
            <span className="material-symbols-outlined text-slate-400 text-sm mx-2">chevron_right</span>
            <span className="text-slate-900 font-semibold">{activeLabel}</span>
          </div>
          <div className="hidden md:flex flex-1 max-w-lg mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
              </div>
              <input className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0da2e7] sm:text-sm" placeholder="Buscar transação, cliente ou operador... (⌘K)" type="text" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
              <span className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">{children}</div>
      </main>
    </div>
  );
}
