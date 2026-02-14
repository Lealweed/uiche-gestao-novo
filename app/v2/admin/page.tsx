"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AdminShell } from "@/components/v2/admin-shell";

type Shift = { gross_amount: string; commission_amount: string; status: "open" | "closed"; missing_card_receipts: number };
type Tx = { sold_at: string; amount: number; payment_method: "pix" | "credit" | "debit" | "cash" };

export default function AdminV2Page() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [shiftRes, txRes] = await Promise.all([
        supabase.from("v_shift_totals").select("gross_amount,commission_amount,status,missing_card_receipts").order("opened_at", { ascending: false }).limit(400),
        supabase.from("transactions").select("sold_at,amount,payment_method").eq("status", "posted").order("sold_at", { ascending: false }).limit(1500),
      ]);
      setShifts((shiftRes.data as Shift[]) ?? []);
      setTxs((txRes.data as Tx[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const summary = useMemo(() => {
    const receita = shifts.reduce((a, s) => a + Number(s.gross_amount || 0), 0);
    const comissao = shifts.reduce((a, s) => a + Number(s.commission_amount || 0), 0);
    const abertos = shifts.filter((s) => s.status === "open").length;
    const pendencias = shifts.reduce((a, s) => a + Number(s.missing_card_receipts || 0), 0);
    const ticketMedio = txs.length ? receita / txs.length : 0;
    return { receita, comissao, abertos, pendencias, ticketMedio };
  }, [shifts, txs]);

  const waveData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of txs) {
      const key = new Date(t.sold_at).toISOString().slice(0, 10);
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) || 0) + Number(t.amount || 0));
    }
    return Array.from(map.entries()).map(([date, value]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value,
    }));
  }, [txs]);

  const payData = useMemo(() => {
    const base = { pix: 0, credit: 0, debit: 0, cash: 0 };
    for (const t of txs) base[t.payment_method] += Number(t.amount || 0);
    return [
      { label: "PIX", value: base.pix, color: "#0ea5e9" },
      { label: "Crédito", value: base.credit, color: "#6366f1" },
      { label: "Débito", value: base.debit, color: "#14b8a6" },
      { label: "Dinheiro", value: base.cash, color: "#f59e0b" },
    ];
  }, [txs]);

  return (
    <AdminShell title="Dashboard executivo" subtitle="Visão consolidada da operação, caixa e produtividade.">
      {loading ? (
        <section className="cv2-card">Carregando indicadores...</section>
      ) : (
        <>
          <section className="cv2-grid-4">
            <Card label="Receita" value={`R$ ${summary.receita.toFixed(2)}`} />
            <Card label="Comissão" value={`R$ ${summary.comissao.toFixed(2)}`} />
            <Card label="Turnos abertos" value={String(summary.abertos)} />
            <Card label="Pendências" value={String(summary.pendencias)} />
          </section>

          <section className="cv2-grid-2">
            <WaveLine title="Tendência (7 dias)" data={waveData} />
            <WaveBars title="Composição de pagamentos" data={payData} />
          </section>

          <section className="cv2-card">
            <h3 className="cv2-section-title">Leitura rápida</h3>
            <p className="text-sm text-slate-600">Ticket médio atual: <b>R$ {summary.ticketMedio.toFixed(2)}</b></p>
          </section>
        </>
      )}
    </AdminShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <article className="cv2-card">
      <p className="cv2-label">{label}</p>
      <p className="cv2-value">{value}</p>
    </article>
  );
}

function WaveLine({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const width = 620;
  const height = 220;
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => ({
    ...d,
    x: pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1),
    y: height - pad - (d.value / max) * (height - pad * 2),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <div className="cv2-card">
      <h3 className="cv2-section-title">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 rounded-xl bg-slate-50 border border-slate-200">
        <defs>
          <linearGradient id="v2WaveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#v2WaveFill)" />
        <path d={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function WaveBars({ title, data }: { title: string; data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cv2-card">
      <h3 className="cv2-section-title">{title}</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.label}>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>{d.label}</span>
              <span>R$ {d.value.toFixed(2)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round((d.value / max) * 100)}%`, backgroundColor: d.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
