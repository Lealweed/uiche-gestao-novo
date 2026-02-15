"use client";

import { AdminShellV3 } from "@/components/v3/admin-shell";

export default function AdminV3Page() {
  return (
    <AdminShellV3>
      <section className="cv3-layout">
        <aside className="cv3-card cv3-nav">
          <p className="cv3-nav-title">Módulos</p>
          <button className="cv3-nav-item active">Dashboard</button>
          <button className="cv3-nav-item">Operações</button>
          <button className="cv3-nav-item">Financeiro</button>
          <button className="cv3-nav-item">Relatórios</button>
          <button className="cv3-nav-item">Configurações</button>
        </aside>

        <section className="space-y-4">
          <div className="cv3-kpis">
            <article className="cv3-card"><p className="cv3-label">Receita no período</p><p className="cv3-value">R$ 0,00</p></article>
            <article className="cv3-card"><p className="cv3-label">Ticket médio</p><p className="cv3-value">R$ 0,00</p></article>
            <article className="cv3-card"><p className="cv3-label">Turnos abertos</p><p className="cv3-value">0</p></article>
            <article className="cv3-card"><p className="cv3-label">Pendências</p><p className="cv3-value">0</p></article>
          </div>

          <article className="cv3-card">
            <h2 className="cv3-section-title">Tendência semanal (modelo v3)</h2>
            <div className="cv3-chart">
              <svg viewBox="0 0 620 220" className="w-full h-56">
                <defs>
                  <linearGradient id="v3wave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                <path d="M24 166 L118 146 L213 152 L308 119 L402 132 L497 97 L596 88 L596 196 L24 196 Z" fill="url(#v3wave)" />
                <path d="M24 166 L118 146 L213 152 L308 119 L402 132 L497 97 L596 88" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </article>
        </section>
      </section>
    </AdminShellV3>
  );
}
