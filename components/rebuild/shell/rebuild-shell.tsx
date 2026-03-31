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
  Search,
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
  { href: "/rebuild/admin#dashboard", label: "Dashboard", section: "dashboard", Icon: LayoutDashboard },
  { href: "/rebuild/admin#controle-turno", label: "Controle de Turno", section: "controle-turno", Icon: Ticket },
  { href: "/rebuild/admin#financeiro", label: "Financeiro", section: "financeiro", Icon: Wallet },
  { href: "/rebuild/admin#relatorios", label: "Relatorios", section: "relatorios", Icon: BarChart3 },
];

const adminSystemNav: NavItem[] = [
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
          name: (profile as { full_name?: string; role?: string }).full_name ?? "Usuario",
          role: (profile as { full_name?: string; role?: string }).role ?? "operator",
        });
      }
    })();
  }, []);

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
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary flex-shrink-0">
          <Ticket size={20} className="text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-tight">Central Viagens</p>
          <p className="text-xs text-muted uppercase tracking-wider mt-0.5">
            {isOperator ? "Operador" : "Admin Pro"}
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" role="navigation" aria-label="Navegacao principal">
        {mainNav.map((item) => {
          const active = isActive(item.section);
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => navigate(item.href, item.section)}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <item.Icon size={18} className={active ? "text-primary" : ""} />
              {item.label}
            </button>
          );
        })}

        {systemNav.length > 0 && (
          <>
            <div className="my-4 border-t border-border mx-1" />
            <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted hover:text-foreground hover:bg-slate-100"
                  }`}
                >
                  <item.Icon size={18} className={active ? "text-primary" : ""} />
                  {item.label}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 bg-slate-50 border border-border rounded-xl p-3">
          <div
            className="size-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground flex-shrink-0"
            aria-hidden="true"
          >
            {userProfile?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {userProfile?.name ?? "Carregando..."}
            </p>
            <p className="text-xs text-muted capitalize">
              {userProfile?.role === "admin" ? "Administrador" : "Operador"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair da conta"
            className="text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-slate-200"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full antialiased overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col flex-shrink-0 z-20 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden bg-black/40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] z-40 flex flex-col lg:hidden transition-transform duration-300 ease-in-out bg-sidebar border-r border-sidebar-border ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu lateral"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
          className="absolute top-4 right-3 text-muted hover:text-foreground transition-colors p-1 rounded"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={drawerOpen}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Localizacao atual" className="flex items-center gap-1.5 text-sm">
              <span className="text-muted font-medium hidden sm:block">Central Viagens</span>
              <ChevronRight className="text-slate-400 hidden sm:block" size={14} aria-hidden="true" />
              <span className="font-semibold text-foreground">{activeLabel}</span>
            </nav>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <label htmlFor="shell-search" className="sr-only">Buscar</label>
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={16}
                aria-hidden="true"
              />
              <input
                id="shell-search"
                type="search"
                placeholder={isOperator ? "Buscar lancamento ou referencia..." : "Buscar transacao, operador..."}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notificacoes"
              className="relative p-2 rounded-lg transition-colors text-muted hover:text-foreground hover:bg-slate-100"
            >
              <Bell size={18} aria-hidden="true" />
              <span
                className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-card"
                aria-hidden="true"
              />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-border text-sm">
              <CalendarDays className="text-muted" size={16} aria-hidden="true" />
              <time className="font-medium text-foreground text-xs">
                {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </time>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
