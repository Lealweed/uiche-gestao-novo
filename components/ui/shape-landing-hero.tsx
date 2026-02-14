import { cn } from "@/lib/utils";

function HeroGeometric({
  badge = "PROJETO GUICHÊ • PAINEL DE GESTÃO",
  title1 = "Guichê Gestão",
  title2,
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
    <section className={cn("relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#040a1f] p-8 md:p-10", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_75%_35%,rgba(34,211,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_70%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="relative z-10 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">{badge}</p>
        <h2 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
          {title1}
          {title2 ? <><br />{title2}</> : null}
        </h2>
        <p className="mt-4 text-slate-300 text-lg leading-relaxed">{subtitle}</p>

        {chips?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700 text-slate-200">
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
