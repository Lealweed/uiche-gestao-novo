import Link from "next/link";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

export default function Home() {
  return (
    <main className="app-shell text-slate-100">
      <div className="max-w-6xl mx-auto">
        <HeroGeometric
          badge="CENTRAL VIAGEM • PAINEL DE GESTÃO"
          title1="CENTRAL"
          title2="VIAGEM"
          subtitle="Controle de turnos, lançamentos por forma de pagamento, comprovantes e fechamento diário com auditoria."
          chips={["Tempo real", "Comprovantes", "Fechamento diário"]}
          actions={<Link className="btn-primary" href="/login">Entrar no Sistema</Link>}
          className="min-h-[520px]"
        />
      </div>
    </main>
  );
}
