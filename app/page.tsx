import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell text-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Central Viagem • Painel de Gestão</p>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">CENTRAL VIAGEM</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-base md:text-lg">
            Controle de turnos, lançamentos por forma de pagamento, comprovantes e fechamento diário com auditoria.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700">Tempo real</span>
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700">Comprovantes</span>
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700">Fechamento diário</span>
          </div>

          <div className="mt-8 flex gap-3 flex-wrap">
            <Link className="btn-primary" href="/login">Entrar no Sistema</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
