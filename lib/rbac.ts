export const APP_ROLES = ["admin", "tenant_admin", "financeiro", "operator"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ADMIN_AREA_ROLES = ["admin", "tenant_admin", "financeiro"] as const;
export const USER_MANAGEMENT_ROLES = ["admin", "tenant_admin"] as const;
export const FINANCEIRO_ALLOWED_SECTIONS = ["dashboard", "financeiro", "fechamento-caixa", "relatorios"] as const;

export function normalizeRole(role: string | null | undefined): string {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

export function isKnownRole(role: string | null | undefined): role is AppRole {
  return (APP_ROLES as readonly string[]).includes(normalizeRole(role));
}

export function canAccessAdminArea(role: string | null | undefined): boolean {
  return (ADMIN_AREA_ROLES as readonly string[]).includes(normalizeRole(role));
}

export function canManageUsers(role: string | null | undefined): boolean {
  return (USER_MANAGEMENT_ROLES as readonly string[]).includes(normalizeRole(role));
}

export function canAccessAdminSection(role: string | null | undefined, section: string): boolean {
  const normalized = normalizeRole(role);

  if (normalized === "financeiro") {
    return (FINANCEIRO_ALLOWED_SECTIONS as readonly string[]).includes(section);
  }

  return canAccessAdminArea(normalized);
}

export function getDefaultAdminSectionForRole(role: string | null | undefined): string {
  return normalizeRole(role) === "financeiro" ? "financeiro" : "dashboard";
}

export function getHomeRouteForRole(role: string | null | undefined): string | null {
  switch (normalizeRole(role)) {
    case "admin":
    case "tenant_admin":
      return "/rebuild/admin";
    case "financeiro":
      return "/rebuild/admin#financeiro";
    case "operator":
      return "/rebuild/operator";
    default:
      return null;
  }
}

export function getRoleLabel(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case "admin":
      return "Administrador";
    case "tenant_admin":
      return "Tenant Admin";
    case "financeiro":
      return "Financeiro";
    case "operator":
      return "Operador";
    default:
      return "Perfil desconhecido";
  }
}
