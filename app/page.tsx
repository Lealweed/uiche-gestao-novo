import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-card p-8">
          <p className="text-sm text-blue-300">Shoppingcell • Projeto Guichê</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold">Guichê Gestão</h1>
          <p className="mt-4 text-slate-300 max-w-2xl">
            Controle de turnos, lançamentos por forma de pagamento, comprovantes e fechamento diário com auditoria.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link className="px-5 py-3 rounded-xl bg-accent text-white font-semibold" href="/login">Entrar no Sistema</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
