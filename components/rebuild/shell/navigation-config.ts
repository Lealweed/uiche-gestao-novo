import {
  BarChart3,
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { APP_ROUTES, withHash } from "@/lib/app-routes";

export type NavItem = {
  href: string;
  label: string;
  section: string;
  Icon: LucideIcon;
};

export const adminMainNav: NavItem[] = [
  { href: withHash(APP_ROUTES.rebuild.admin, "dashboard"), label: "Dashboard", section: "dashboard", Icon: LayoutDashboard },
  { href: withHash(APP_ROUTES.rebuild.admin, "controle-turno"), label: "Controle de Turno", section: "controle-turno", Icon: Ticket },
  { href: withHash(APP_ROUTES.rebuild.admin, "financeiro"), label: "Financeiro", section: "financeiro", Icon: Wallet },
  { href: withHash(APP_ROUTES.rebuild.admin, "relatorios"), label: "Relatórios", section: "relatorios", Icon: BarChart3 },
];

export const adminSystemNav: NavItem[] = [
  { href: withHash(APP_ROUTES.rebuild.admin, "operadores"), label: "Ponto Digital", section: "operadores", Icon: Clock },
  { href: withHash(APP_ROUTES.rebuild.admin, "usuarios"), label: "Usuários", section: "usuarios", Icon: Users },
  { href: withHash(APP_ROUTES.rebuild.admin, "empresas"), label: "Empresas", section: "empresas", Icon: Building2 },
  { href: withHash(APP_ROUTES.rebuild.admin, "configuracoes"), label: "Configurações", section: "configuracoes", Icon: Settings },
];

export const operatorNav: NavItem[] = [
  { href: withHash(APP_ROUTES.rebuild.operator, "resumo"), label: "Resumo do Turno", section: "resumo", Icon: LayoutDashboard },
  { href: withHash(APP_ROUTES.rebuild.operator, "caixa-pdv"), label: "Caixa PDV", section: "caixa-pdv", Icon: Ticket },
  { href: withHash(APP_ROUTES.rebuild.operator, "historico"), label: "Histórico", section: "historico", Icon: ClipboardList },
  { href: withHash(APP_ROUTES.rebuild.operator, "ponto"), label: "Ponto Digital", section: "ponto", Icon: Clock },
  { href: withHash(APP_ROUTES.rebuild.operator, "configuracoes"), label: "Configurações", section: "configuracoes", Icon: Settings },
];

export const adminSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "controle-turno": "Controle de Turno",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  operadores: "Ponto Digital",
  usuarios: "Usuários",
  empresas: "Empresas",
  configuracoes: "Configurações",
};

export const operatorSectionLabels: Record<string, string> = {
  resumo: "Resumo do Turno",
  "caixa-pdv": "Caixa PDV",
  historico: "Histórico",
  ponto: "Ponto Digital",
  configuracoes: "Configurações",
};
