import { TrendingUp, Wallet, Users } from "lucide-react";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { LoadingState } from "@/components/rebuild/ui/loading-state";

export default function RebuildAdminPage() {
  return (
    <div className="rb-page">
      <SectionHeader
        title="Painel Administrativo"
        subtitle="Base visual inicial para dashboard, cadastros e conferências financeiras."
      />

      <section className="rb-stat-grid" aria-label="Resumo operacional">
        <StatCard label="Receita do dia" value="R$ 0,00" delta="Aguardando integração do Bloco 2" icon={<Wallet size={16} />} />
        <StatCard label="Turnos abertos" value="0" delta="Nenhum turno ativo" icon={<Users size={16} />} />
        <StatCard label="Eficiência" value="--" delta="Cálculo será habilitado no Bloco 3" icon={<TrendingUp size={16} />} />
      </section>

      <section className="rb-grid-3" aria-label="Estados padrão">
        <LoadingState />
        <ErrorState />
        <EmptyState />
      </section>
    </div>
  );
}
