import { cn } from "@/lib/utils";

function GlowPill({ className }: { className: string }) {
  return <div className={cn("absolute rounded-full border border-white/10 bg-gradient-to-r from-indigo-500/20 via-transparent to-rose-500/20 blur-[0.2px]", className)} />;
}

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
    <section className={cn("relative min-h-[360px] md:min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#030303] p-8 md:p-10", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_30%,rgba(0,190,255,0.16),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_70%,rgba(124,58,237,0.22),transparent_60%)]" />

      <GlowPill className="w-[520px] h-[120px] -left-28 top-24 rotate-12" />
      <GlowPill className="w-[360px] h-[92px] right-[-90px] top-14 -rotate-12" />
      <GlowPill className="w-[420px] h-[100px] right-[-120px] bottom-[-10px] rotate-[8deg]" />
      <GlowPill className="w-[260px] h-[72px] left-[8%] bottom-[-18px] -rotate-[10deg]" />

      <div className="relative z-10 max-w-4xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">{badge}</p>

        <h2 className="mt-4 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-white">
          {title1}
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">{title2}</span>
        </h2>

        <p className="mt-5 text-slate-300/90 text-base md:text-lg max-w-2xl leading-relaxed">{subtitle}</p>

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

      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/70 pointer-events-none" />
    </section>
  );
}

export { HeroGeometric };
