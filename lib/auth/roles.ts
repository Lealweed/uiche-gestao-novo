import { APP_ROUTES } from "@/lib/app-routes";

export type AppRole = "admin" | "operator" | "tenant_admin" | "financeiro";

const ADMIN_PANEL_ROLES = new Set<AppRole>(["admin", "tenant_admin", "financeiro"]);

export function isAdminPanelRole(role: string | null | undefined): role is Exclude<AppRole, "operator"> {
  return ADMIN_PANEL_ROLES.has((role ?? "") as AppRole);
}

export function getDashboardRouteForRole(role: string | null | undefined) {
  return isAdminPanelRole(role) ? APP_ROUTES.rebuild.admin : APP_ROUTES.rebuild.operator;
}

export function getRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "tenant_admin":
      return "Admin do Tenant";
    case "financeiro":
      return "Financeiro";
    default:
      return "Operador";
  }
}
