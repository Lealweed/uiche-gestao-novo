"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AdminShell } from "@/components/v2/admin-shell";

type CashClosing = { id: string; expected_cash: number; declared_cash: number; difference: number; created_at: string };

export default function FinanceiroV2Page() {
  const [rows, setRows] = useState<CashClosing[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("shift_cash_closings").select("id,expected_cash,declared_cash,difference,created_at").order("created_at", { ascending: false }).limit(200);
      setRows((data as CashClosing[]) ?? []);
    })();
  }, []);

  const totals = useMemo(() => ({
    expected: rows.reduce((a, r) => a + Number(r.expected_cash || 0), 0),
    declared: rows.reduce((a, r) => a + Number(r.declared_cash || 0), 0),
    diff: rows.reduce((a, r) => a + Number(r.difference || 0), 0),
  }), [rows]);

  return (
    <AdminShell title="Financeiro" subtitle="Conciliação e fechamento de caixa por turno.">
      <section className="cv2-grid-4">
        <article className="cv2-card"><p className="cv2-label">Esperado</p><p className="cv2-value">R$ {totals.expected.toFixed(2)}</p></article>
        <article className="cv2-card"><p className="cv2-label">Declarado</p><p className="cv2-value">R$ {totals.declared.toFixed(2)}</p></article>
        <article className="cv2-card"><p className="cv2-label">Diferença</p><p className="cv2-value">R$ {totals.diff.toFixed(2)}</p></article>
      </section>

      <section className="cv2-card overflow-auto">
        <h3 className="cv2-section-title">Fechamentos</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Data</th><th>Esperado</th><th>Declarado</th><th>Diferença</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="py-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td>R$ {Number(r.expected_cash).toFixed(2)}</td>
                <td>R$ {Number(r.declared_cash).toFixed(2)}</td>
                <td>{Number(r.difference).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
