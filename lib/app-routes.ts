export const APP_ROUTES = {
  home: "/",
  login: "/login",
  rebuild: {
    admin: "/rebuild/admin",
    auditoria: "/rebuild/auditoria",
    financeiro: "/rebuild/financeiro",
    operator: "/rebuild/operator",
    operadores: "/rebuild/operadores",
    terminais: "/rebuild/terminais",
  },
} as const;

export type RebuildPanelPath = typeof APP_ROUTES.rebuild.admin | typeof APP_ROUTES.rebuild.operator;

export function withHash(path: RebuildPanelPath, section: string) {
  return `${path}#${section}`;
}

export function adminSectionRoute(section: string) {
  return withHash(APP_ROUTES.rebuild.admin, section);
}

export function isOperatorPanelPath(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith(APP_ROUTES.rebuild.operator));
}
