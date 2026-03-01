"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type Tx = { id: string; amount: number; payment_method: "pix" | "credit" | "debit" | "cash"; sold_at: string; status: "posted" | "voided"; note: string | null };
type Cash = { id: string; amount: number; movement_type: "suprimento" | "sangria" | "ajuste"; created_at: string; note: string | null };
type Adjust = { id: string; reason: string; status: "pending" | "approved" | "rejected"; created_at: string; review_note: string | null };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RebuildFinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cash, setCash] = useState<Cash[]>([]);
  const [adjustments, setAdjustments] = useState<Adjust[]>([]);

  const totals = useMemo(() => {
    const posted = txs.filter((t) => t.status === "posted");
    const totalVendas = posted.reduce((a, b) => a + Number(b.amount || 0), 0);
    const totalDinheiro = posted.filter((t) => t.payment_method === "cash").reduce((a, b) => a + Number(b.amount || 0), 0);
    const suprimento = cash.filter((m) => m.movement_type === "suprimento").reduce((a, b) => a + Number(b.amount || 0), 0);
    const sangria = cash.filter((m) => m.movement_type === "sangria").reduce((a, b) => a + Number(b.amount || 0), 0);
    const ajuste = cash.filter((m) => m.movement_type === "ajuste").reduce((a, b) => a + Number(b.amount || 0), 0);
    const saldoSistema = totalDinheiro + suprimento - sangria + ajuste;
    return { totalVendas, totalDinheiro, suprimento, sangria, ajuste, saldoSistema };
  }, [txs, cash]);

  async function loadData() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const uid = auth.data.user?.id;
    if (!uid) return router.replace("/login");

    const profile = await supabase.from("profiles").select("role,active").eq("user_id", uid).single();
    if (profile.error || !profile.data?.active) return router.replace("/login");
    if (!["tenant_admin", "admin", "financeiro"].includes(profile.data.role)) return router.replace("/rebuild/operator");

    const [txRes, cashRes, adjRes] = await Promise.all([
      supabase.from("transactions").select("id,amount,payment_method,sold_at,status,note").order("sold_at", { ascending: false }).limit(300),
      supabase.from("cash_movements").select("id,amount,movement_type,created_at,note").order("created_at", { ascending: false }).limit(300),
      supabase.from("adjustment_requests").select("id,reason,status,created_at,review_note").order("created_at", { ascending: false }).limit(200),
    ]);

    setTxs((txRes.data as Tx[] | null) ?? []);
    setCash((cashRes.data as Cash[] | null) ?? []);
    setAdjustments((adjRes.data as Adjust[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function reviewAdjustment(id: string, status: "approved" | "rejected") {
    const res = await supabase.from("adjustment_requests").update({ status, reviewed_at: new Date().toISOString(), review_note: status === "approved" ? "Aprovado no módulo financeiro" : "Rejeitado no módulo financeiro" }).eq("id", id);
    if (res.error) return setNotice(`Falha ao atualizar ajuste: ${res.error.message}`);
    setNotice(`Solicitação ${status === "approved" ? "aprovada" : "rejeitada"} com sucesso.`);
    await loadData();
  }

  if (loading) return <div className="text-sm text-slate-500">Carregando visão financeira...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {notice ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{notice}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Receita total" value={brl(totals.totalVendas)} />
        <Kpi title="Dinheiro em vendas" value={brl(totals.totalDinheiro)} />
        <Kpi title="Saldo sistêmico de caixa" value={brl(totals.saldoSistema)} />
        <Kpi title="Ajustes pendentes" value={String(adjustments.filter((a) => a.status === "pending").length)} />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Conciliação de caixa</h2>
        <p className="text-sm text-slate-500">Resumo operacional para validação de fechamento financeiro.</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border p-3"><b>Suprimento</b><p>{brl(totals.suprimento)}</p></div>
          <div className="rounded-lg border p-3"><b>Sangria</b><p>{brl(totals.sangria)}</p></div>
          <div className="rounded-lg border p-3"><b>Ajuste</b><p>{brl(totals.ajuste)}</p></div>
          <div className="rounded-lg border p-3"><b>Saldo previsto</b><p>{brl(totals.saldoSistema)}</p></div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Ajustes e conciliação (CRUD)</h2>
        <p className="text-sm text-slate-500">Aprove ou rejeite solicitações de ajuste pendentes.</p>
        {adjustments.length === 0 ? (
          <p className="text-sm text-slate-500 mt-3">Nenhuma solicitação registrada.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {adjustments.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{a.reason}</p>
                  <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString("pt-BR")} • {a.status}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border px-3 py-1 text-sm" disabled={a.status !== "pending"} onClick={() => reviewAdjustment(a.id, "approved")}>Aprovar</button>
                  <button className="rounded-lg border px-3 py-1 text-sm" disabled={a.status !== "pending"} onClick={() => reviewAdjustment(a.id, "rejected")}>Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500 font-semibold">{title}</p><p className="text-2xl font-bold text-slate-900 mt-1">{value}</p></div>;
}
