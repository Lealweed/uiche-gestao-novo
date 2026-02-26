import { Clock3, CreditCard, Receipt } from "lucide-react";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { LoadingState } from "@/components/rebuild/ui/loading-state";

export default function RebuildOperatorPage() {
  return (
    <div className="rb-page">
      <SectionHeader
        title="Painel do Operador"
        subtitle="Casca preparada para abertura de turno, vendas, caixa PDV e fechamento."
      />

      <section className="rb-stat-grid" aria-label="Resumo do turno">
        <StatCard label="Status do turno" value="Fechado" delta="Abertura será conectada no Bloco 2" icon={<Clock3 size={16} />} />
        <StatCard label="Vendas no turno" value="R$ 0,00" delta="Sem lançamentos" icon={<CreditCard size={16} />} />
        <StatCard label="Comprovantes" value="0" delta="Upload será ativado no Bloco 2" icon={<Receipt size={16} />} />
      </section>

      <section className="rb-grid-3" aria-label="Estados padrão">
        <LoadingState title="Carregando turno" message="Estamos buscando os dados do operador." />
        <ErrorState title="Falha no turno" message="Não foi possível carregar o turno ativo." />
        <EmptyState title="Sem movimentação no turno" message="As vendas e registros de caixa aparecerão aqui." />
      </section>
    </div>
  );
}
