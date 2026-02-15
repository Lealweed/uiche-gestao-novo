"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AdminShell } from "@/components/v2/admin-shell";

type Shift = { shift_id: string; booth_name: string; operator_name: string; status: "open" | "closed"; gross_amount: string; missing_card_receipts: number };

export default function OperacoesV2Page() {
  const [rows, setRows] = useState<Shift[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("v_shift_totals").select("shift_id,booth_name,operator_name,status,gross_amount,missing_card_receipts").order("opened_at", { ascending: false }).limit(200);
      setRows((data as Shift[]) ?? []);
    })();
  }, []);

  const stats = useMemo(() => ({
    abertos: rows.filter((r) => r.status === "open").length,
    pendencias: rows.reduce((a, r) => a + Number(r.missing_card_receipts || 0), 0),
  }), [rows]);

  return (
    <AdminShell title="Operações" subtitle="Gestão de guichês e operadores em tempo real.">
      <section className="cv2-grid-4">
        <article className="cv2-card"><p className="cv2-label">Turnos abertos</p><p className="cv2-value">{stats.abertos}</p></article>
        <article className="cv2-card"><p className="cv2-label">Pendências</p><p className="cv2-value">{stats.pendencias}</p></article>
      </section>

      <section className="cv2-card">
        <h3 className="cv2-section-title">Turnos por guichê</h3>
        <div className="cv2-table-wrap">
          <table className="cv2-table">
            <thead>
              <tr><th>Guichê</th><th>Operador</th><th>Status</th><th>Total</th><th>Pendências</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.shift_id}>
                  <td>{r.booth_name}</td>
                  <td>{r.operator_name}</td>
                  <td><span className={r.status === "open" ? "cv2-status-open" : "cv2-status-closed"}>{r.status === "open" ? "Aberto" : "Fechado"}</span></td>
                  <td>R$ {Number(r.gross_amount).toFixed(2)}</td>
                  <td>{r.missing_card_receipts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
