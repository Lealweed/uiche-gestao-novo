"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  ScanSearch,
  Settings,
  Ticket,
  Users,
} from "lucide-react";

const primaryNavigation = [
  { href: "/rebuild/admin#dashboard", label: "Dashboard", section: "dashboard", Icon: LayoutDashboard },
  { href: "/rebuild/admin#controle-turno", label: "Controle de Turno", section: "controle-turno", Icon: Ticket },
  { href: "/rebuild/admin#historico", label: "Histórico", section: "historico", Icon: ScanSearch },
  { href: "/rebuild/admin#relatorios", label: "Relatórios", section: "relatorios", Icon: Grid2x2 },
] as const;

const systemNavigation = [
  { href: "/rebuild/admin#usuarios", label: "Usuários", section: "usuarios", Icon: Users },
  { href: "/rebuild/admin#configuracoes", label: "Configurações", section: "configuracoes", Icon: Settings },
] as const;

const operatorNavigation = [{ href: "/rebuild/operator", label: "Painel Operador", Icon: Ticket }] as const;

const adminSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "controle-turno": "Controle de Turno",
  historico: "Histórico",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
};

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState("dashboard");

  useEffect(() => {
    if (!pathname.startsWith("/rebuild/admin")) {
      setCurrentSection("dashboard");
      return;
    }

    const readHash = () => {
      const raw = window.location.hash.replace("#", "").trim();
      setCurrentSection(raw || "dashboard");
    };

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [pathname]);

  const activeLabel = pathname.includes("/operator")
    ? "Painel Operador"
    : adminSectionLabels[currentSection] || "Dashboard";

  const isOperatorRoute = pathname.startsWith("/rebuild/operator");
  const mainNav = isOperatorRoute ? operatorNavigation : primaryNavigation;
  const systemNav = isOperatorRoute ? [] : systemNavigation;

  function isNavActive(itemHref: string, section?: string) {
    if (itemHref === "/rebuild/operator") return pathname === "/rebuild/operator";
    if (!pathname.startsWith("/rebuild/admin")) return false;
    return section ? currentSection === section : currentSection === "dashboard";
  }

  function navigate(href: string, section?: string) {
    if (section) setCurrentSection(section);
    router.push(href);
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-700 antialiased overflow-hidden">
      <aside className="hidden lg:flex w-[260px] bg-slate-900 text-white flex-col flex-shrink-0 z-20 shadow-xl relative">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#0da2e7] to-blue-600 shadow-lg shadow-blue-500/20">
              <Ticket size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Central Viagens</h1>
              <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Admin Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {mainNav.map((item) => {
            const active = isNavActive(item.href, "section" in item ? item.section : undefined);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href, "section" in item ? item.section : undefined)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group text-left ${
                  active
                    ? "bg-[#0da2e7] text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.Icon size={18} className={active ? "" : "group-hover:text-[#0da2e7]"} />
                <span className={active ? "text-sm font-semibold" : "text-sm font-medium"}>{item.label}</span>
              </button>
            );
          })}

          {systemNav.length > 0 ? (
            <>
              <div className="my-4 border-t border-slate-800 mx-2"></div>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sistema</p>

              {systemNav.map((item) => {
                const active = isNavActive(item.href, item.section);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href, item.section)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group text-left ${
                      active
                        ? "bg-[#0da2e7] text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <item.Icon size={18} className={active ? "" : "group-hover:text-[#0da2e7]"} />
                    <span className={active ? "text-sm font-semibold" : "text-sm font-medium"}>{item.label}</span>
                  </button>
                );
              })}
            </>
          ) : null}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-slate-700 border-2 border-slate-700"></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Equipe Central</p>
              <p className="text-xs text-slate-400 truncate">Gerência</p>
            </div>
            <button className="text-slate-400 hover:text-white transition-colors" type="button" aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-medium">Central Viagens</span>
            <ChevronRight className="text-slate-400 mx-2" size={14} />
            <span className="text-slate-900 font-semibold">{activeLabel}</span>
          </div>
          <div className="hidden md:flex flex-1 max-w-lg mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ScanSearch className="text-slate-400" size={18} />
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0da2e7] sm:text-sm"
                placeholder="Buscar transação, cliente ou operador..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50" type="button" aria-label="Notificações">
              <Bell size={18} />
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <CalendarDays className="text-slate-500" size={16} />
              <span className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
          </div>
        </header>

        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {mainNav.map((item) => {
              const active = isNavActive(item.href, "section" in item ? item.section : undefined);
              return (
                <button
                  key={`mobile-${item.href}`}
                  type="button"
                  onClick={() => navigate(item.href, "section" in item ? item.section : undefined)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">{children}</div>
      </main>
    </div>
  );
}


