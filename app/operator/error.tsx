"use client";

export default function OperatorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-shell">
      <div className="max-w-4xl mx-auto">
        <section className="glass-card p-6 border border-rose-300/40 bg-rose-100/30 mt-10">
          <p className="text-sm uppercase tracking-[0.18em] text-rose-900">Falha no módulo /operator</p>
          <h1 className="text-2xl font-bold mt-2 text-slate-900">Operação com fallback seguro</h1>
          <p className="text-sm text-slate-700 mt-2">
            O portal do operador teve uma falha inesperada. Esta tela evita quebra total e permite retomar com segurança.
          </p>
          <p className="text-xs text-slate-500 mt-2">{error?.message ?? "Erro não identificado."}</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={reset}>Tentar novamente</button>
            <button className="btn-ghost" onClick={() => window.location.reload()}>Recarregar página</button>
          </div>
        </section>
      </div>
    </main>
  );
}
