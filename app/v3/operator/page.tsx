"use client";

import { useEffect, useMemo, useState } from "react";
import { OperatorShellV3 } from "@/components/v3/operator-shell";
import { supabase } from "@/lib/supabase-client";
import { tolerantData } from "@/lib/schema-tolerance";

type TxRow = { id: string; sold_at: string; amount: number; payment_method: string; booth_id: string | null; status: string };
type BoothRow = { id: string; code: string; name: string };
type ShiftRow = { id: string; status: string; opened_at: string | null };

export default function OperatorV3Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [booths, setBooths] = useState<BoothRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setError("Sessão inválida.");
      setLoading(false);
      return;
    }

    try {
      const [txRes, shiftRes, boothLinkRes, boothRes] = await Promise.all([
        supabase.from("transactions").select("id,sold_at,amount,payment_method,booth_id,status").eq("operator_id", userId).order("sold_at", { ascending: false }).limit(120),
        supabase.from("shifts").select("id,status,opened_at").eq("operator_id", userId).order("opened_at", { ascending: false }).limit(30),
        supabase.from("operator_booths").select("booth_id").eq("operator_id", userId).eq("active", true),
        supabase.from("booths").select("id,code,name"),
      ]);

      if (txRes.error || shiftRes.error) {
        setError(txRes.error?.message ?? shiftRes.error?.message ?? "Falha ao carregar base operacional.");
      }

      const linksResult = tolerantData((boothLinkRes.data as Array<{ booth_id: string }>) ?? [], boothLinkRes.error, [], "Vínculos de guichê");
      const boothResult = tolerantData((boothRes.data as BoothRow[]) ?? [], boothRes.error, [], "Cadastro de guichês");
      setWarnings([linksResult.warning, boothResult.warning].filter(Boolean) as string[]);

      const linkSet = new Set(linksResult.data.map((l) => l.booth_id));
      setBooths(boothResult.data.filter((b) => linkSet.has(b.id)));
      setTransactions((txRes.data as TxRow[]) ?? []);
      setShifts((shiftRes.data as ShiftRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const boothMap = useMemo(() => new Map(booths.map((b) => [b.id, `${b.code} - ${b.name}`])), [booths]);
  const openShifts = shifts.filter((s) => s.status === "open").length;
  const totalAmount = transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  return (
    <OperatorShellV3>
      <section className="space-y-4">
        <div className="cv3-kpis">
          <article className="cv3-card"><p className="cv3-label">Turnos abertos</p><p className="cv3-value">{openShifts}</p></article>
          <article className="cv3-card"><p className="cv3-label">Transações (últimas)</p><p className="cv3-value">{transactions.length}</p></article>
          <article className="cv3-card"><p className="cv3-label">Volume</p><p className="cv3-value">R$ {totalAmount.toFixed(2)}</p></article>
        </div>

        {warnings.length > 0 && (
          <article className="cv3-card border border-amber-300/50 bg-amber-100/30">
            <h2 className="cv3-section-title">Avisos de disponibilidade</h2>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </article>
        )}

        {loading ? (
          <article className="cv3-card">Carregando fluxo essencial do operador...</article>
        ) : error ? (
          <article className="cv3-card border border-rose-300/50 bg-rose-100/30">
            <h2 className="cv3-section-title">Falha parcial</h2>
            <p className="text-sm">{error}</p>
            <button className="cv3-nav-item active mt-3" onClick={load}>Tentar novamente</button>
          </article>
        ) : (
          <article className="cv3-card">
            <h2 className="cv3-section-title">Transações recentes</h2>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr><th className="py-2">Data</th><th>Guichê</th><th>Método</th><th>Valor</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 40).map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-200">
                      <td className="py-2">{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                      <td>{tx.booth_id ? boothMap.get(tx.booth_id) ?? "-" : "-"}</td>
                      <td>{tx.payment_method}</td>
                      <td>R$ {Number(tx.amount || 0).toFixed(2)}</td>
                      <td>{tx.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </OperatorShellV3>
  );
}
