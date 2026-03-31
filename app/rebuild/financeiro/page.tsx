import { RouteAliasPage } from "@/components/rebuild/shell/route-alias-page";
import { adminSectionRoute } from "@/lib/app-routes";

export default function FinanceiroPage() {
  return (
    <RouteAliasPage
      href={adminSectionRoute("financeiro")}
      title="Abrindo Dashboard Financeiro"
      message="Redirecionando para o módulo financeiro já integrado ao painel administrativo."
    />
  );
}
