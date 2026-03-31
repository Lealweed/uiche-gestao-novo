import Link from "next/link";
import { ShieldCheck, Ticket, Wallet, BarChart3, Users, Clock } from "lucide-react";
import { APP_ROUTES } from "@/lib/app-routes";

const highlights = [
  {
    title: "Operação em tempo real",
    description: "Acompanhe turnos, lançamentos e pendências com atualização contínua por guichê.",
    icon: Ticket,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.13)",
  },
  {
    title: "Conciliação segura",
    description: "Fluxo completo de comprovantes, caixa PDV e fechamento diário com rastreabilidade.",
    icon: ShieldCheck,
    color: "#22C55E",
    bg: "rgba(34,197,94,0.13)",
  },
  {
    title: "Relatórios financeiros",
    description: "Relatórios por operador, guichê e categoria para decisões gerenciais rápidas.",
    icon: Wallet,
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.13)",
  },
];

const features = [
  { icon: BarChart3, label: "Dashboard executivo" },
  { icon: Users, label: "Gestão de operadores" },
  { icon: Clock, label: "Controle de ponto" },
  { icon: ShieldCheck, label: "Auditoria completa" },
];

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden"
      style={{ background: "var(--ds-bg)" }}
    >
      {/* Background gradient */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, #3B82F6 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-5xl relative z-10 space-y-8">
        {/* Hero card */}
        <section
          className="rounded-3xl p-8 md:p-12 space-y-6"
          style={{
            background: "var(--ds-surface-1)",
            border: "1px solid var(--ds-border-strong)",
            boxShadow: "var(--ds-shadow-lg)",
          }}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-8 rounded-xl"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
              aria-hidden="true"
            >
              <Ticket size={16} className="text-white" />
            </div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--ds-primary)" }}
            >
              Central Viagens · Plataforma Operacional
            </p>
          </div>

          {/* Title */}
          <div className="space-y-3 max-w-3xl">
            <h1
              className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight"
              style={{ color: "var(--ds-text)" }}
            >
              Gestão premium para{" "}
              <span style={{ color: "var(--ds-primary)" }}>guichês, turnos</span> e caixa
            </h1>
            <p className="text-base md:text-lg" style={{ color: "var(--ds-muted)" }}>
              Controle seu dia com uma experiência moderna, confiável e preparada para operação intensa.
              Múltiplos guichês, operadores e relatórios em um único painel.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2" aria-label="Recursos principais">
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: "var(--ds-surface-2)",
                  border: "1px solid var(--ds-border-strong)",
                  color: "var(--ds-muted)",
                }}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={APP_ROUTES.login}
              className="rb-btn-primary"
              aria-label="Entrar no sistema"
            >
              Entrar no sistema
            </Link>
            <Link
              href={APP_ROUTES.rebuild.admin}
              className="rb-btn-ghost"
              aria-label="Ver painel administrativo"
            >
              Ver painel administrativo
            </Link>
          </div>
        </section>

        {/* Feature cards */}
        <section aria-label="Funcionalidades principais">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlights.map(({ title, description, icon: Icon, color, bg }) => (
              <article
                key={title}
                className="rounded-2xl p-5 space-y-3"
                style={{
                  background: "var(--ds-surface-1)",
                  border: "1px solid var(--ds-border)",
                  boxShadow: "var(--ds-shadow-sm)",
                }}
              >
                <div
                  className="flex items-center justify-center size-10 rounded-xl"
                  style={{ background: bg, color }}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </div>
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "var(--ds-text)" }}
                  >
                    {title}
                  </h2>
                  <p
                    className="text-sm mt-1 leading-relaxed"
                    style={{ color: "var(--ds-muted)" }}
                  >
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs" style={{ color: "var(--ds-subtle)" }}>
          <p>Central Viagens · Plataforma B2B de Gestão Operacional</p>
        </footer>
      </div>
    </main>
  );
}
