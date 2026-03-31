import { RouteAliasPage } from "@/components/rebuild/shell/route-alias-page";
import { adminSectionRoute } from "@/lib/app-routes";

export default function TerminaisPage() {
  return (
    <RouteAliasPage
      href={adminSectionRoute("configuracoes")}
      title="Abrindo Gestão de Terminais"
      message="Redirecionando para o cadastro e status dos guichês no painel administrativo."
    />
  );
}
