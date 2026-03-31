import { RouteAliasPage } from "@/components/rebuild/shell/route-alias-page";
import { adminSectionRoute } from "@/lib/app-routes";

export default function OperadoresPage() {
  return (
    <RouteAliasPage
      href={adminSectionRoute("configuracoes")}
      title="Abrindo Controle de Operadores"
      message="Redirecionando para a gestão de usuários e permissões do painel administrativo."
    />
  );
}
