"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminSection, canManageUsers, getDefaultAdminSectionForRole, getRoleLabel } from "@/lib/rbac";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Ticket,
  Users,
  X,
  ClipboardList,
  BarChart3,
  Wallet,
  Clock,
  MessageSquare,
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
  { href: "/rebuild/admin#dashboard", label: "Dashboard", section: "dashboard", Icon: LayoutDashboard },
  { href: "/rebuild/admin#controle-turno", label: "Controle de Turno", section: "controle-turno", Icon: Ticket },
  { href: "/rebuild/admin#financeiro", label: "Financeiro", section: "financeiro", Icon: Wallet },
  { href: "/rebuild/admin#relatorios", label: "Relatorios", section: "relatorios", Icon: BarChart3 },
];

const adminSystemNav: NavItem[] = [
  { href: "/rebuild/admin#mensagens", label: "Mensagens", section: "mensagens", Icon: MessageSquare },
  { href: "/rebuild/admin#folha-de-ponto", label: "Folha de Ponto", section: "folha-de-ponto", Icon: CalendarDays },
  { href: "/rebuild/admin#usuarios", label: "Usuarios", section: "usuarios", Icon: Users },
  { href: "/rebuild/admin#empresas", label: "Empresas", section: "empresas", Icon: Building2 },
  { href: "/rebuild/admin#configuracoes", label: "Configuracoes", section: "configuracoes", Icon: Settings },
];

const operatorNav: NavItem[] = [
  { href: "/rebuild/operator#resumo", label: "Resumo do Turno", section: "resumo", Icon: LayoutDashboard },
  { href: "/rebuild/operator#caixa-pdv", label: "Caixa PDV", section: "caixa-pdv", Icon: Ticket },
  { href: "/rebuild/operator#historico", label: "Historico", section: "historico", Icon: ClipboardList },
  { href: "/rebuild/operator#ponto", label: "Ponto Digital", section: "ponto", Icon: Clock },
  { href: "/rebuild/operator#configuracoes", label: "Configuracoes", section: "configuracoes", Icon: Settings },
];

const adminSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "controle-turno": "Controle de Turno",
  financeiro: "Financeiro",
  relatorios: "Relatorios",
  mensagens: "Mensagens",
  "folha-de-ponto": "Folha de Ponto",
  usuarios: "Usuarios",
  empresas: "Empresas",
  configuracoes: "Configuracoes",
};

const operatorSectionLabels: Record<string, string> = {
  resumo: "Resumo do Turno",
  "caixa-pdv": "Caixa PDV",
  historico: "Historico",
  ponto: "Ponto Digital",
  configuracoes: "Configuracoes",
};

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  const isOperator = pathname.startsWith("/rebuild/operator");
  const effectiveRole = userProfile?.role ?? (isOperator ? "operator" : "admin");
  const mainNav = isOperator
    ? operatorNav
    : adminMainNav.filter((item) => canAccessAdminSection(effectiveRole, item.section));
  const systemNav = isOperator ? [] : canManageUsers(effectiveRole) ? adminSystemNav : [];
  const sectionLabels = isOperator ? operatorSectionLabels : adminSectionLabels;
  const defaultSection = isOperator ? "resumo" : getDefaultAdminSectionForRole(effectiveRole);

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
          name: (profile as { full_name?: string; role?: string }).full_name ?? "Usuario",
          role: (profile as { full_name?: string; role?: string }).role ?? "operator",
        });
      }
    })();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }));
  }, []);

  function navigate(href: string, section: string) {
    const safeSection = !isOperator && !canAccessAdminSection(effectiveRole, section)
      ? getDefaultAdminSectionForRole(effectiveRole)
      : section;
    const safeHref = !isOperator && safeSection !== section
      ? `/rebuild/admin#${safeSection}`
      : href;

    setCurrentSection(safeSection);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rebuild:section-change", { detail: safeSection }));
    }
    router.push(safeHref);
  }

  async function handleLogout() {
    // Ponto Digital: registra clock_out antes de deslogar
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (uid) {
        const today = new Date(); today.setHours(0,0,0,0);
        await supabase
          .from("user_attendance")
          .update({ clock_out: new Date().toISOString() })
          .eq("user_id", uid)
          .is("clock_out", null)
          .gte("clock_in", today.toISOString());
      }
    } catch { /* não impedir logout */ }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(section: string) {
    return currentSection === section;
  }

  const activeLabel = sectionLabels[currentSection] ?? (isOperator ? "Painel Operador" : "Dashboard");
  const userRoleLabel = getRoleLabel(effectiveRole);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex items-center justify-center size-9 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
          C
        </div>
        <span className="font-bold text-base text-foreground">Central Viagens</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1" role="navigation" aria-label="Navegacao principal">
        <p className="px-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-3">
          {isOperator ? "Operacao" : "Menu Principal"}
        </p>
        
        {mainNav.map((item) => {
          const active = isActive(item.section);
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => navigate(item.href, item.section)}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-muted hover:text-foreground hover:bg-[hsl(var(--card-elevated))]"
              }`}
            >
              <item.Icon size={18} />
              {item.label}
            </button>
          );
        })}

        {systemNav.length > 0 && (
          <>
            <div className="h-px bg-border my-4 mx-1" />
            <p className="px-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-3">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-muted hover:text-foreground hover:bg-[hsl(var(--card-elevated))]"
                  }`}
                >
                  <item.Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="size-10 rounded-full flex items-center justify-center text-sm font-bold bg-primary/20 text-primary border border-primary/30 flex-shrink-0"
            aria-hidden="true"
          >
            {userProfile?.name?.substring(0, 2)?.toUpperCase() ?? "OP"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {userProfile?.name ?? "Operador"}
            </p>
            <p className="text-xs text-sidebar-muted">
              {userRoleLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Encerrar Sessao
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full antialiased overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-col flex-shrink-0 z-20 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[240px] z-40 flex flex-col lg:hidden transition-transform duration-300 ease-in-out bg-sidebar border-r border-sidebar-border ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu lateral"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
          className="absolute top-4 right-3 text-sidebar-muted hover:text-foreground transition-colors p-1 rounded"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={drawerOpen}
            >
              <Menu size={20} />
            </button>

            {/* Page title */}
            <h1 className="font-semibold text-foreground">{activeLabel}</h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search - desktop only */}
            <div className="hidden md:flex">
              <label htmlFor="shell-search" className="sr-only">Buscar</label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="shell-search"
                  type="search"
                  placeholder="Buscar..."
                  className="w-64 pl-10 pr-4 py-2 text-sm rounded-lg bg-input border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notificacoes"
              className="relative p-2 rounded-lg transition-colors text-muted hover:text-foreground hover:bg-secondary"
            >
              <Bell size={18} aria-hidden="true" />
              <span
                className="absolute top-1.5 right-1.5 size-2 bg-destructive rounded-full"
                aria-hidden="true"
              />
            </button>

            {/* Date */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-sm">
              <CalendarDays className="text-muted" size={14} aria-hidden="true" />
              <time className="font-medium text-foreground text-xs">
                {currentDate ?? "--"}
              </time>
            </div>

            {/* Settings */}
            <button
              type="button"
              aria-label="Configuracoes"
              className="p-2 rounded-lg transition-colors text-muted hover:text-foreground hover:bg-secondary"
            >
              <Settings size={18} aria-hidden="true" />
            </button>
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
