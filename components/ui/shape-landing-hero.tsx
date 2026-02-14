import { cn } from "@/lib/utils";

function HeroGeometric({
  badge = "CENTRAL VIAGEM • PAINEL DE GESTÃO",
  title1 = "CENTRAL",
  title2 = "VIAGEM",
  subtitle = "Controle de turnos, lançamentos por forma de pagamento, comprovantes e fechamento diário com auditoria.",
  chips = ["Tempo real", "Comprovantes", "Fechamento diário"],
  actions,
  className,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
  chips?: string[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative min-h-[360px] md:min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-8 md:p-10", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.96),rgba(2,6,23,0.84))]" />

      <div className="relative z-10 max-w-4xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{badge}</p>

        <h2 className="mt-4 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-slate-100">
          {title1}
          <br />
          <span className="text-slate-300">{title2}</span>
        </h2>

        <p className="mt-5 text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed">{subtitle}</p>

        {chips?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="px-3 py-1 rounded-full text-xs bg-white/[0.03] border border-white/[0.1] text-slate-200">
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {actions ? <div className="mt-8 flex gap-3 flex-wrap">{actions}</div> : null}
      </div>
    </section>
  );
}

export { HeroGeometric };
