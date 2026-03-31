import { RouteAliasPage } from "@/components/rebuild/shell/route-alias-page";
import { adminSectionRoute } from "@/lib/app-routes";

export default function AuditoriaPage() {
  return (
    <RouteAliasPage
      href={adminSectionRoute("relatorios")}
      title="Abrindo Logs de Auditoria"
      message="Redirecionando para os registros consolidados do painel administrativo."
    />
  );
}
