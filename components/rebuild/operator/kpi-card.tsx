type OperatorKpiCardProps = {
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
};

export function OperatorKpiCard({ label, value, accent = false, sub }: OperatorKpiCardProps) {
  return (
    <div className="rb-kpi-card" style={accent ? { borderColor: "rgba(245,158,11,0.3)", boxShadow: "var(--ds-glow-amber)" } : {}}>
      <p className="rb-kpi-label">{label}</p>
      <p className="rb-kpi-value" style={accent ? { color: "var(--ds-primary)" } : {}}>
        {value}
      </p>
      {sub ? <p className="rb-kpi-hint">{sub}</p> : null}
    </div>
  );
}
