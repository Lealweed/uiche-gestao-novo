import Link from "next/link";
import { ShieldCheck, Ticket, Wallet } from "lucide-react";

const highlights = [
  {
    title: "Operação em tempo real",
    description: "Acompanhe turnos, lançamentos e pendências com atualização contínua.",
    icon: Ticket,
  },
  {
    title: "Conciliação segura",
    description: "Fluxo completo de comprovantes, caixa PDV e fechamento diário com rastreabilidade.",
    icon: ShieldCheck,
  },
  {
    title: "Visão financeira",
    description: "Relatórios por operador, guichê e categoria para decisões rápidas.",
    icon: Wallet,
  },
];

export default function Home() {
  return (
    <main className="cv-home-shell">
      <section className="cv-home-hero">
        <p className="cv-home-eyebrow">Central Viagens • Plataforma Operacional</p>
        <h1 className="cv-home-title">Gestão premium para guichês, turnos e caixa</h1>
        <p className="cv-home-subtitle">
          Controle seu dia com uma experiência moderna, confiável e preparada para operação intensa.
        </p>

        <div className="cv-home-actions">
          <Link className="btn-primary" href="/login">
            Entrar no sistema
          </Link>
          <Link className="btn-ghost" href="/v2/admin">
            Ver painel administrativo
          </Link>
        </div>

        <div className="cv-home-grid">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="cv-home-card">
              <span className="cv-home-icon-wrap">
                <Icon size={18} />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
