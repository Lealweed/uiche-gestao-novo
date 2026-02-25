"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShellV3 } from "@/components/v3/admin-shell";
import { supabase } from "@/lib/supabase-client";
import { tolerantData } from "@/lib/schema-tolerance";

type ShiftRow = { id: string; booth_id: string | null; operator_id: string | null; status: "open" | "closed" | string; opened_at: string | null };
type TxRow = { id: string; sold_at: string; amount: number; payment_method: string; booth_id: string | null; operator_id: string | null; status: string };
type ProfileRow = { user_id: string; full_name: string };
type BoothRow = { id: string; code: string; name: string };

export default function AdminV3Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [booths, setBooths] = useState<BoothRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [shiftRes, txRes, profileRes, boothRes] = await Promise.all([
        supabase.from("shifts").select("id,booth_id,operator_id,status,opened_at").order("opened_at", { ascending: false }).limit(40),
        supabase.from("transactions").select("id,sold_at,amount,payment_method,booth_id,operator_id,status").order("sold_at", { ascending: false }).limit(120),
        supabase.from("profiles").select("user_id,full_name").limit(500),
        supabase.from("booths").select("id,code,name").limit(200),
      ]);

      if (shiftRes.error || txRes.error) {
        setError(shiftRes.error?.message ?? txRes.error?.message ?? "Falha ao carregar dados principais.");
      }

      const profileResult = tolerantData((profileRes.data as ProfileRow[]) ?? [], profileRes.error, [], "Perfis");
      const boothResult = tolerantData((boothRes.data as BoothRow[]) ?? [], boothRes.error, [], "Guichês");
      setWarnings([profileResult.warning, boothResult.warning].filter(Boolean) as string[]);

      setShifts((shiftRes.data as ShiftRow[]) ?? []);
      setTransactions((txRes.data as TxRow[]) ?? []);
      setProfiles(profileResult.data);
      setBooths(boothResult.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p.full_name])), [profiles]);
  const boothMap = useMemo(() => new Map(booths.map((b) => [b.id, `${b.code} - ${b.name}`])), [booths]);
  const openShifts = shifts.filter((s) => s.status === "open").length;
  const totalAmount = transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  return (
    <AdminShellV3>
      <section className="cv3-layout">
        <aside className="cv3-card cv3-nav">
          <p className="cv3-nav-title">Módulos estáveis</p>
          <button className="cv3-nav-item active">Status</button>
          <button className="cv3-nav-item">Transações</button>
          <button className="cv3-nav-item">Observações</button>
        </aside>

        <section className="space-y-4">
          <div className="cv3-kpis">
            <article className="cv3-card"><p className="cv3-label">Transações (últimas)</p><p className="cv3-value">{transactions.length}</p></article>
            <article className="cv3-card"><p className="cv3-label">Turnos abertos</p><p className="cv3-value">{openShifts}</p></article>
            <article className="cv3-card"><p className="cv3-label">Volume</p><p className="cv3-value">R$ {totalAmount.toFixed(2)}</p></article>
          </div>

          {warnings.length > 0 && (
            <article className="cv3-card border border-amber-300/50 bg-amber-100/30">
              <h2 className="cv3-section-title">Módulos opcionais indisponíveis</h2>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </article>
          )}

          {loading ? (
            <article className="cv3-card">Carregando painel estável v3...</article>
          ) : error ? (
            <article className="cv3-card border border-rose-300/50 bg-rose-100/30">
              <h2 className="cv3-section-title">Falha parcial de leitura</h2>
              <p className="text-sm">{error}</p>
              <button className="cv3-nav-item active mt-3" onClick={load}>Tentar novamente</button>
            </article>
          ) : (
            <article className="cv3-card">
              <h2 className="cv3-section-title">Transações recentes</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr><th className="py-2">Data</th><th>Operador</th><th>Guichê</th><th>Método</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 40).map((tx) => (
                      <tr key={tx.id} className="border-t border-slate-200">
                        <td className="py-2">{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                        <td>{tx.operator_id ? profileMap.get(tx.operator_id) ?? "-" : "-"}</td>
                        <td>{tx.booth_id ? boothMap.get(tx.booth_id) ?? "-" : "-"}</td>
                        <td>{tx.payment_method}</td>
                        <td>R$ {Number(tx.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </section>
      </section>
    </AdminShellV3>
  );
}
