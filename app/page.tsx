import Link from "next/link";
import { ShieldCheck, Ticket, Wallet, BarChart3, Users, Clock, ArrowRight } from "lucide-react";

const highlights = [
  {
    title: "Operacao em tempo real",
    description: "Acompanhe turnos, lancamentos e pendencias com atualizacao continua por guiche.",
    icon: Ticket,
  },
  {
    title: "Conciliacao segura",
    description: "Fluxo completo de comprovantes, caixa PDV e fechamento diario com rastreabilidade.",
    icon: ShieldCheck,
  },
  {
    title: "Relatorios financeiros",
    description: "Relatorios por operador, guiche e categoria para decisoes gerenciais rapidas.",
    icon: Wallet,
  },
];

const features = [
  { icon: BarChart3, label: "Dashboard executivo" },
  { icon: Users, label: "Gestao de operadores" },
  { icon: Clock, label: "Controle de ponto" },
  { icon: ShieldCheck, label: "Auditoria completa" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-5xl space-y-8">
        {/* Hero card */}
        <section className="bg-card rounded-2xl p-8 md:p-12 space-y-6 border border-border shadow-card">
          {/* Eyebrow */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary">
              <Ticket size={20} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Central Viagens - Plataforma Operacional
            </p>
          </div>

          {/* Title */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground text-balance">
              Gestao premium para{" "}
              <span className="text-primary">guiches, turnos</span> e caixa
            </h1>
            <p className="text-base md:text-lg text-muted leading-relaxed">
              Controle seu dia com uma experiencia moderna, confiavel e preparada para operacao intensa.
              Multiplos guiches, operadores e relatorios em um unico painel.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2" aria-label="Recursos principais">
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-muted border border-border"
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entrar no sistema
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/rebuild/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-foreground font-semibold rounded-lg border border-border hover:bg-slate-100 transition-colors"
            >
              Ver painel administrativo
            </Link>
          </div>
        </section>

        {/* Feature cards */}
        <section aria-label="Funcionalidades principais">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlights.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="bg-card rounded-xl p-6 space-y-4 border border-border shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
                  <Icon size={24} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {title}
                  </h2>
                  <p className="text-sm mt-1 leading-relaxed text-muted">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-4">
          <p>Central Viagens - Plataforma B2B de Gestao Operacional</p>
        </footer>
      </div>
    </main>
  );
}
