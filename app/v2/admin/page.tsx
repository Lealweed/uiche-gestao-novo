export default function AdminV2Page() {
  const kpis = [
    { label: "Receita do período", value: "R$ 0,00" },
    { label: "Turnos abertos", value: "0" },
    { label: "Pendências", value: "0" },
    { label: "Ajustes pendentes", value: "0" },
  ];

  const modules = ["Dashboard", "Operações", "Financeiro", "Relatórios", "Configurações"];

  return (
    <main className="cv2-shell">
      <div className="cv2-container">
        <header className="cv2-header">
          <div>
            <p className="cv2-eyebrow">CENTRAL VIAGEM • V2</p>
            <h1 className="cv2-title">Base visual do novo sistema</h1>
            <p className="cv2-subtitle">Etapa 1: design system unificado, claro e profissional.</p>
          </div>
          <button className="cv2-btn-primary">Entrar no painel</button>
        </header>

        <section className="cv2-grid-4">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="cv2-card">
              <p className="cv2-label">{kpi.label}</p>
              <p className="cv2-value">{kpi.value}</p>
            </article>
          ))}
        </section>

        <section className="cv2-card">
          <h2 className="cv2-section-title">Módulos principais</h2>
          <div className="cv2-chips">
            {modules.map((m) => (
              <span key={m} className="cv2-chip">{m}</span>
            ))}
          </div>
        </section>

        <section className="cv2-grid-2">
          <article className="cv2-card">
            <h3 className="cv2-section-title">Tokens de cor (v2)</h3>
            <ul className="cv2-list">
              <li>Background: #F8FAFC</li>
              <li>Card: #FFFFFF</li>
              <li>Texto: #0F172A / #475569</li>
              <li>Ação primária: #2563EB</li>
              <li>Confirmar: #059669</li>
              <li>Aviso: #D97706</li>
              <li>Perigo: #DC2626</li>
            </ul>
          </article>

          <article className="cv2-card">
            <h3 className="cv2-section-title">Próximas entregas</h3>
            <ul className="cv2-list">
              <li>Etapa 2: Dashboard executivo com gráficos em onda</li>
              <li>Etapa 3: Operações (guichês + operadores)</li>
              <li>Etapa 4: Financeiro</li>
              <li>Etapa 5: Relatórios e Configurações</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
