"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminSection, canManageUsers, getDefaultAdminSectionForRole, getRoleLabel } from "@/lib/rbac";
import {
  Bell,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Plane,
  Search,
  Settings,
  Ticket,
  Users,
  X,
  BarChart3,
  Wallet,
  Clock,
  MessageSquare,
  DollarSign,
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
  { href: "/rebuild/admin#dashboard",        label: "Dashboard",          section: "dashboard",        Icon: LayoutDashboard },
  { href: "/rebuild/admin#controle-turno",   label: "Controle de Turno",  section: "controle-turno",   Icon: Ticket },
  { href: "/rebuild/admin#financeiro",       label: "Financeiro",         section: "financeiro",       Icon: Wallet },
  { href: "/rebuild/admin#fechamento-caixa", label: "Fechamento de Caixa",section: "fechamento-caixa", Icon: DollarSign },
  { href: "/rebuild/admin#relatorios",       label: "Relatorios",         section: "relatorios",       Icon: BarChart3 },
];

const adminSystemNav: NavItem[] = [
  { href: "/rebuild/admin#mensagens",    label: "Mensagens",    section: "mensagens",    Icon: MessageSquare },
  { href: "/rebuild/admin#folha-de-ponto", label: "Folha de Ponto", section: "folha-de-ponto", Icon: CalendarDays },
  { href: "/rebuild/admin#usuarios",     label: "Usuarios",     section: "usuarios",     Icon: Users },
  { href: "/rebuild/admin#empresas",     label: "Empresas",     section: "empresas",     Icon: Building2 },
  { href: "/rebuild/admin#configuracoes",label: "Configuracoes",section: "configuracoes",Icon: Settings },
];

const operatorNav: NavItem[] = [
  { href: "/rebuild/operator#ceia",           label: "Central Viagens", section: "ceia",           Icon: Wallet },
  { href: "/rebuild/operator#ponto",          label: "Ponto Digital",   section: "ponto",          Icon: Clock },
  { href: "/rebuild/operator#configuracoes",  label: "Configuracoes",   section: "configuracoes",  Icon: Settings },
];

const adminSectionLabels: Record<string, string> = {
  dashboard:        "Dashboard",
  "controle-turno": "Controle de Turno",
  financeiro:       "Financeiro",
  "fechamento-caixa":"Fechamento de Caixa",
  relatorios:       "Relatorios",
  mensagens:        "Mensagens",
  "folha-de-ponto": "Folha de Ponto",
  usuarios:         "Usuarios",
  empresas:         "Empresas",
  configuracoes:    "Configuracoes",
};

const operatorSectionLabels: Record<string, string> = {
  ceia:          "Central Viagens",
  ponto:         "Ponto Digital",
  configuracoes: "Configuracoes",
};

type RebuildShellProps = {
  children: React.ReactNode;
  /** Badge counts keyed by nav section (e.g. { mensagens: 3 }) */
  navBadges?: Partial<Record<string, number>>;
};

export function RebuildShell({ children, navBadges = {} }: RebuildShellProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [userProfile, setUserProfile]       = useState<{ name: string; role: string } | null>(null);
  const [currentDate, setCurrentDate]       = useState<string | null>(null);

  const isOperator     = pathname.startsWith("/rebuild/operator");
  const effectiveRole  = userProfile?.role ?? (isOperator ? "operator" : "admin");
  const mainNav        = isOperator
    ? operatorNav
    : adminMainNav.filter((item) => canAccessAdminSection(effectiveRole, item.section));
  const systemNav      = isOperator ? [] : canManageUsers(effectiveRole) ? adminSystemNav : [];
  const sectionLabels  = isOperator ? operatorSectionLabels : adminSectionLabels;
  const defaultSection = isOperator ? "ceia" : getDefaultAdminSectionForRole(effectiveRole);

  /** Total unread across all nav badges – used for the Bell icon */
  const totalUnread = Object.values(navBadges).reduce<number>((sum, n) => sum + (n ?? 0), 0);

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
    if (!window.confirm("Deseja realmente sair do sistema?")) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (uid) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        await supabase
          .from("user_attendance")
          .update({ clock_out: new Date().toISOString() })
          .eq("user_id", uid)
          .is("clock_out", null)
          .gte("clock_in", today.toISOString());
      }
    } catch { /* nao impedir logout */ }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(section: string) {
    return currentSection === section;
  }

  const activeLabel   = sectionLabels[currentSection] ?? (isOperator ? "Painel Operador" : "Dashboard");
  const userRoleLabel = getRoleLabel(effectiveRole);
  const userInitials  = (userProfile?.name ?? "OP").substring(0, 2).toUpperCase();

  /** Renders a single nav button with optional unread badge */
  function NavButton({ item }: { item: NavItem }) {
    const active      = isActive(item.section);
    const badgeCount  = navBadges[item.section] ?? 0;

    return (
      <button
        key={item.section}
        type="button"
        onClick={() => navigate(item.href, item.section)}
        aria-current={active ? "page" : undefined}
        className={[
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
            : "text-sidebar-muted hover:text-foreground hover:bg-white/5 font-medium",
        ].join(" ")}
      >
        <item.Icon size={17} aria-hidden="true" className="flex-shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {badgeCount > 0 && (
          <span
            aria-label={`${badgeCount} nao lidas`}
            className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Brand logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-sidebar-border">
        <div
          className="flex items-center justify-center size-9 rounded-xl flex-shrink-0 text-white shadow-md"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(213 94% 42%) 100%)" }}
          aria-hidden="true"
        >
          <Plane size={17} className="-rotate-45" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm text-foreground leading-tight tracking-tight">Central Viagens</span>
          <span className="text-[10px] text-sidebar-muted leading-tight truncate mt-0.5">Gestao Operacional</span>
        </div>
      </div>

      {/* Main navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
        role="navigation"
        aria-label="Navegacao principal"
      >
        <p className="px-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-2">
          {isOperator ? "Operacao" : "Menu Principal"}
        </p>

        {mainNav.map((item) => <NavButton key={item.section} item={item} />)}

        {systemNav.length > 0 && (
          <>
            <div className="h-px bg-sidebar-border my-3 mx-1" />
            <p className="px-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-2">
              Sistema
            </p>
            {systemNav.map((item) => <NavButton key={item.section} item={item} />)}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg">
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(213 94% 42%) 100%)" }}
            aria-hidden="true"
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {userProfile?.name ?? "Usuario"}
            </p>
            <p className="text-[11px] text-sidebar-muted truncate">{userRoleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={15} aria-hidden="true" />
          Encerrar Sessao
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full antialiased overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-[240px] flex-col flex-shrink-0 z-20 bg-sidebar border-r border-sidebar-border"
        aria-label="Menu lateral"
      >
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
        aria-hidden={!drawerOpen}
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

            {/* Mobile brand logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div
                className="flex items-center justify-center size-7 rounded-lg text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(213 94% 42%) 100%)" }}
                aria-hidden="true"
              >
                <Plane size={13} className="-rotate-45" strokeWidth={2.5} />
              </div>
            </div>

            {/* Page title */}
            <p className="font-semibold text-sm text-foreground">{activeLabel}</p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* Search – desktop only */}
            <div className="hidden md:flex mr-1">
              <label htmlFor="shell-search" className="sr-only">Buscar</label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  size={14}
                  aria-hidden="true"
                />
                <input
                  id="shell-search"
                  type="search"
                  placeholder="Buscar..."
                  className="w-52 pl-9 pr-4 py-1.5 text-sm rounded-lg bg-input border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Bell – navigates to mensagens (admin) */}
            <button
              type="button"
              aria-label={totalUnread > 0 ? `${totalUnread} notificacoes nao lidas` : "Notificacoes"}
              onClick={() => {
                if (!isOperator) navigate("/rebuild/admin#mensagens", "mensagens");
              }}
              className="relative p-2 rounded-lg transition-colors text-muted hover:text-foreground hover:bg-secondary"
            >
              <Bell size={18} aria-hidden="true" />
              {totalUnread > 0 ? (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-0.5"
                  aria-hidden="true"
                >
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              ) : (
                <span
                  className="absolute top-1.5 right-1.5 size-1.5 bg-destructive rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Date – desktop */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs ml-0.5">
              <CalendarDays className="text-muted" size={13} aria-hidden="true" />
              <time className="font-medium text-foreground">{currentDate ?? "--"}</time>
            </div>

            {/* Settings – navigates to configuracoes */}
            <button
              type="button"
              aria-label="Configuracoes"
              onClick={() =>
                navigate(
                  isOperator ? "/rebuild/operator#configuracoes" : "/rebuild/admin#configuracoes",
                  "configuracoes"
                )
              }
              className={[
                "p-2 rounded-lg transition-colors",
                isActive("configuracoes")
                  ? "text-primary bg-primary/10"
                  : "text-muted hover:text-foreground hover:bg-secondary",
              ].join(" ")}
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
