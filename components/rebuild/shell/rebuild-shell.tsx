"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanSearch,
  Settings,
  Ticket,
  Users,
  X,
  ClipboardList,
  BarChart3,
  Wallet,
  Clock,
  type LucideIcon,
} from "lucide-react";

const supabase = createClient();

type NavItem = {
  href: string;
  label: string;
  section: string;
  Icon: LucideIcon;
};

const adminMainNav: NavItem[] = [
  { href: "/rebuild/admin#dashboard",       label: "Dashboard",        section: "dashboard",       Icon: LayoutDashboard },
  { href: "/rebuild/admin#controle-turno",  label: "Controle de Turno",section: "controle-turno",  Icon: Ticket },
  { href: "/rebuild/admin#financeiro",      label: "Financeiro",       section: "financeiro",      Icon: Wallet },
  { href: "/rebuild/admin#relatorios",      label: "Relatórios",       section: "relatorios",      Icon: BarChart3 },
];

const adminSystemNav: NavItem[] = [
  { href: "/rebuild/admin#usuarios",        label: "Usuários",         section: "usuarios",        Icon: Users },
  { href: "/rebuild/admin#empresas",        label: "Empresas",         section: "empresas",        Icon: Building2 },
  { href: "/rebuild/admin#configuracoes",   label: "Configurações",    section: "configuracoes",   Icon: Settings },
];

const operatorNav: NavItem[] = [
  { href: "/rebuild/operator#resumo",       label: "Resumo do Turno",  section: "resumo",          Icon: LayoutDashboard },
  { href: "/rebuild/operator#caixa-pdv",   label: "Caixa PDV",        section: "caixa-pdv",       Icon: Ticket },
  { href: "/rebuild/operator#historico",   label: "Histórico",        section: "historico",       Icon: ClipboardList },
  { href: "/rebuild/operator#ponto",       label: "Ponto Digital",    section: "ponto",           Icon: Clock },
  { href: "/rebuild/operator#configuracoes", label: "Configurações",  section: "configuracoes",   Icon: Settings },
];

const adminSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "controle-turno": "Controle de Turno",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  empresas: "Empresas",
  configuracoes: "Configurações",
};

const operatorSectionLabels: Record<string, string> = {
  resumo: "Resumo do Turno",
  "caixa-pdv": "Caixa PDV",
  historico: "Histórico",
  ponto: "Ponto Digital",
  configuracoes: "Configurações",
};

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);

  const isOperator = pathname.startsWith("/rebuild/operator");
  const mainNav = isOperator ? operatorNav : adminMainNav;
  const systemNav = isOperator ? [] : adminSystemNav;
  const sectionLabels = isOperator ? operatorSectionLabels : adminSectionLabels;
  const defaultSection = isOperator ? "resumo" : "dashboard";

  useEffect(() => {
    const readHash = () => {
      const raw = window.location.hash.replace("#", "").trim();
      setCurrentSection(raw || defaultSection);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [pathname, defaultSection]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("user_id", data.user.id)
        .single();
      if (profile) {
        setUserProfile({
          name: (profile as { full_name?: string; role?: string }).full_name ?? "Usuário",
          role: (profile as { full_name?: string; role?: string }).role ?? "operator",
        });
      }
    })();
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function navigate(href: string, section: string) {
    setCurrentSection(section);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rebuild:section-change", { detail: section }));
    }
    router.push(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(section: string) {
    return currentSection === section;
  }

  const activeLabel = sectionLabels[currentSection] ?? (isOperator ? "Painel Operador" : "Dashboard");

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/[0.07]">
        <div
          className="flex items-center justify-center size-9 rounded-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
        >
          <Ticket size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-[#E5E7EB] leading-tight">Central Viagens</p>
          <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mt-0.5">
            {isOperator ? "Operador" : "Admin Pro"}
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" role="navigation" aria-label="Navegação principal">
        {mainNav.map((item) => {
          const active = isActive(item.section);
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => navigate(item.href, item.section)}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2 ${
                active
                  ? "bg-[rgba(59,130,246,0.13)] text-[#60A5FA] border border-[rgba(59,130,246,0.2)]"
                  : "text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/[0.05] border border-transparent"
              }`}
            >
              <item.Icon
                size={16}
                className={active ? "text-[#3B82F6]" : ""}
              />
              {item.label}
            </button>
          );
        })}

        {systemNav.length > 0 && (
          <>
            <div className="my-3 border-t border-white/[0.07] mx-1" />
            <p className="px-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
              Sistema
            </p>
            {systemNav.map((item) => {
              const active = isActive(item.section);
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => navigate(item.href, item.section)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2 ${
                    active
                      ? "bg-[rgba(59,130,246,0.13)] text-[#60A5FA] border border-[rgba(59,130,246,0.2)]"
                      : "text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  <item.Icon size={16} className={active ? "text-[#3B82F6]" : ""} />
                  {item.label}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl p-3">
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563eb)" }}
            aria-hidden="true"
          >
            {userProfile?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#E5E7EB] truncate">
              {userProfile?.name ?? "Carregando..."}
            </p>
            <p className="text-xs text-[#6B7280] capitalize">
              {userProfile?.role === "admin" ? "Administrador" : "Operador"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair da conta"
            className="text-[#6B7280] hover:text-[#E5E7EB] transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="flex h-screen w-full antialiased overflow-hidden"
      style={{ background: "var(--ds-bg)", color: "var(--ds-text)", fontFamily: "var(--rb-font)" }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-[260px] flex-col flex-shrink-0 z-20"
        style={{ background: "var(--ds-sidebar)", borderRight: "1px solid var(--ds-border)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)" }}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] z-40 flex flex-col lg:hidden transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--ds-sidebar)", borderRight: "1px solid var(--ds-border)" }}
        aria-label="Menu lateral"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
          className="absolute top-4 right-3 text-[#6B7280] hover:text-[#E5E7EB] transition-colors p-1 rounded"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0"
          style={{
            background: "var(--ds-surface-1)",
            borderBottom: "1px solid var(--ds-border)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={drawerOpen}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Localização atual" className="flex items-center gap-1.5 text-sm">
              <span className="text-[#6B7280] font-medium hidden sm:block">Central Viagens</span>
              <ChevronRight className="text-[#4B5563] hidden sm:block" size={14} aria-hidden="true" />
              <span className="font-semibold text-[#E5E7EB]">{activeLabel}</span>
            </nav>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-sm mx-6">
            <label htmlFor="shell-search" className="sr-only">Buscar</label>
            <div className="relative w-full">
              <ScanSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                size={15}
                aria-hidden="true"
              />
              <input
                id="shell-search"
                type="search"
                placeholder={isOperator ? "Buscar lançamento ou referência..." : "Buscar transação, operador..."}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40"
                style={{
                  background: "var(--ds-surface-2)",
                  border: "1px solid var(--ds-border-strong)",
                  color: "var(--ds-text)",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notificações"
              className="relative p-2 rounded-lg transition-colors text-[#9CA3AF] hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              style={{ background: "var(--ds-surface-2)" }}
            >
              <Bell size={16} aria-hidden="true" />
              <span
                className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2"
                style={{ borderColor: "var(--ds-surface-1)" }}
                aria-hidden="true"
              />
            </button>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: "var(--ds-surface-2)", border: "1px solid var(--ds-border-strong)" }}
            >
              <CalendarDays className="text-[#9CA3AF]" size={14} aria-hidden="true" />
              <time className="font-medium text-[#9CA3AF] text-xs">
                {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </time>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
