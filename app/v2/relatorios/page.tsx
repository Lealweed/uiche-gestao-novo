"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AdminShell } from "@/components/v2/admin-shell";

type Tx = { id: string; sold_at: string; amount: number; payment_method: string };

export default function RelatoriosV2Page() {
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("transactions").select("id,sold_at,amount,payment_method").eq("status", "posted").order("sold_at", { ascending: false }).limit(300);
      setTxs((data as Tx[]) ?? []);
    })();
  }, []);

  const total = useMemo(() => txs.reduce((a, t) => a + Number(t.amount || 0), 0), [txs]);

  return (
    <AdminShell title="Relatórios" subtitle="Consulta consolidada de lançamentos e indicadores.">
      <section className="cv2-grid-4">
        <article className="cv2-card"><p className="cv2-label">Lançamentos</p><p className="cv2-value">{txs.length}</p></article>
        <article className="cv2-card"><p className="cv2-label">Total</p><p className="cv2-value">R$ {total.toFixed(2)}</p></article>
      </section>

      <section className="cv2-card overflow-auto">
        <h3 className="cv2-section-title">Últimos lançamentos</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Data</th><th>Método</th><th>Valor</th></tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-t border-slate-200">
                <td className="py-2">{new Date(t.sold_at).toLocaleString("pt-BR")}</td>
                <td>{t.payment_method}</td>
                <td>R$ {Number(t.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
