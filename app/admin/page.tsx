"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type ShiftTotal = {
  shift_id: string;
  booth_name: string;
  operator_name: string;
  status: "open" | "closed";
  gross_amount: string;
  commission_amount: string;
  total_pix: string;
  total_credit: string;
  total_debit: string;
  total_cash: string;
  missing_card_receipts: number;
};

type Company = { id: string; name: string; commission_percent: number; active: boolean };
type Booth = { id: string; code: string; name: string; active: boolean };
type Adjustment = {
  id: string;
  transaction_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  transactions: { amount: number; payment_method: string; companies: { name: string } | { name: string }[] | null } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ShiftTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companyPct, setCompanyPct] = useState("6");
  const [boothCode, setBoothCode] = useState("");
  const [boothName, setBoothName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (profile?.role !== "admin") return router.push("/operator");

      await refreshData();
      setLoading(false);
    })();
  }, [router]);

  async function refreshData() {
    const [shiftRes, companyRes, boothRes, adjRes] = await Promise.all([
      supabase.from("v_shift_totals").select("*").order("opened_at", { ascending: false }).limit(30),
      supabase.from("companies").select("id,name,commission_percent,active").order("name"),
      supabase.from("booths").select("id,code,name,active").order("name"),
      supabase
        .from("adjustment_requests")
        .select("id,transaction_id,reason,status,created_at,profiles(full_name),transactions(amount,payment_method,companies(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    setRows((shiftRes.data as ShiftTotal[]) ?? []);
    setCompanies((companyRes.data as Company[]) ?? []);
    setBooths((boothRes.data as Booth[]) ?? []);
    setAdjustments(((adjRes.data ?? []) as unknown) as Adjustment[]);
  }

  const summary = useMemo(() => {
    const totalDia = rows.reduce((acc, r) => acc + Number(r.gross_amount || 0), 0);
    const totalComissao = rows.reduce((acc, r) => acc + Number(r.commission_amount || 0), 0);
    const pendencias = rows.reduce((acc, r) => acc + Number(r.missing_card_receipts || 0), 0);
    const abertos = rows.filter((r) => r.status === "open").length;
    return { totalDia, totalComissao, pendencias, abertos };
  }, [rows]);

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("companies").insert({
      name: companyName.trim(),
      commission_percent: Number(companyPct),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar empresa: ${error.message}`);
    setCompanyName("");
    setCompanyPct("6");
    setMessage("Empresa cadastrada com sucesso.");
    await refreshData();
  }

  async function createBooth(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.from("booths").insert({
      code: boothCode.trim().toUpperCase(),
      name: boothName.trim(),
      active: true,
    });

    if (error) return setMessage(`Erro ao cadastrar guichê: ${error.message}`);
    setBoothCode("");
    setBoothName("");
    setMessage("Guichê cadastrado com sucesso.");
    await refreshData();
  }

  async function approveAdjustment(adjId: string, txId: string) {
    setMessage(null);

    const { error: txErr } = await supabase
      .from("transactions")
      .update({ status: "voided" })
      .eq("id", txId);

    if (txErr) return setMessage(`Erro ao estornar transação: ${txErr.message}`);

    const { data: authData } = await supabase.auth.getUser();
    const { error: adjErr } = await supabase
      .from("adjustment_requests")
      .update({ status: "approved", reviewed_by: authData.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", adjId);

    if (adjErr) return setMessage(`Erro ao aprovar ajuste: ${adjErr.message}`);

    setMessage("Ajuste aprovado e transação estornada.");
    await refreshData();
  }

  async function rejectAdjustment(adjId: string) {
    setMessage(null);
    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("adjustment_requests")
      .update({ status: "rejected", reviewed_by: authData.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", adjId);

    if (error) return setMessage(`Erro ao rejeitar ajuste: ${error.message}`);
    setMessage("Solicitação rejeitada.");
    await refreshData();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs mb-2">● Produção</div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
            <p className="muted">Gestão central de guichês, empresas e fechamento.</p>
          </div>
          <button onClick={logout} className="btn-ghost">Sair</button>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Total" value={`R$ ${summary.totalDia.toFixed(2)}`} />
          <Card label="Comissão" value={`R$ ${summary.totalComissao.toFixed(2)}`} />
          <Card label="Turnos abertos" value={String(summary.abertos)} />
          <Card label="Pendências" value={String(summary.pendencias)} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={createCompany} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Empresa</h2>
            <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} required placeholder="Nome da empresa" className="field" />
            <input value={companyPct} onChange={(e)=>setCompanyPct(e.target.value)} required type="number" min="0" step="0.001" placeholder="% comissão" className="field" />
            <button className="btn-primary">Salvar empresa</button>
          </form>

          <form onSubmit={createBooth} className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Cadastrar Guichê</h2>
            <input value={boothCode} onChange={(e)=>setBoothCode(e.target.value)} required placeholder="Código (ex: G02)" className="field" />
            <input value={boothName} onChange={(e)=>setBoothName(e.target.value)} required placeholder="Nome (ex: Guichê 02)" className="field" />
            <button className="btn-primary">Salvar guichê</button>
          </form>
        </section>

        {message && (
          <section className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-3 text-blue-300 text-sm">
            {message}
          </section>
        )}

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Empresas</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Nome</th><th>%</th><th>Status</th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2">{c.name}</td>
                    <td>{Number(c.commission_percent).toFixed(3)}%</td>
                    <td>{c.active ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
            <h2 className="font-semibold mb-3">Guichês</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Código</th><th>Nome</th><th>Status</th></tr>
              </thead>
              <tbody>
                {booths.map((b) => (
                  <tr key={b.id} className="border-t border-slate-800">
                    <td className="py-2">{b.code}</td>
                    <td>{b.name}</td>
                    <td>{b.active ? "Ativo" : "Inativo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Solicitações de ajuste</h2>
          {adjustments.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma solicitação pendente.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="py-2">Hora</th><th>Operador</th><th>Empresa</th><th>Método</th><th>Valor</th><th>Motivo</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {adjustments.map((a) => {
                  const op = Array.isArray(a.profiles) ? a.profiles[0]?.full_name : a.profiles?.full_name;
                  const comp = Array.isArray(a.transactions?.companies) ? a.transactions?.companies[0]?.name : a.transactions?.companies?.name;
                  return (
                    <tr key={a.id} className="border-t border-slate-800">
                      <td className="py-2">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                      <td>{op ?? "-"}</td>
                      <td>{comp ?? "-"}</td>
                      <td>{a.transactions?.payment_method ?? "-"}</td>
                      <td>R$ {Number(a.transactions?.amount ?? 0).toFixed(2)}</td>
                      <td>{a.reason}</td>
                      <td className="space-x-3">
                        <button onClick={() => approveAdjustment(a.id, a.transaction_id)} className="text-green-300 hover:underline">Aprovar</button>
                        <button onClick={() => rejectAdjustment(a.id)} className="text-red-300 hover:underline">Rejeitar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-card p-4 overflow-auto">
          <h2 className="font-semibold mb-3">Últimos turnos</h2>
          {loading ? <p className="text-slate-400">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2">Guichê</th><th>Operador</th><th>Status</th><th>Total</th><th>PIX</th><th>Crédito</th><th>Débito</th><th>Pendências</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.shift_id} className="border-t border-slate-800">
                    <td className="py-2">{r.booth_name}</td>
                    <td>{r.operator_name}</td>
                    <td>{r.status}</td>
                    <td>R$ {Number(r.gross_amount).toFixed(2)}</td>
                    <td>R$ {Number(r.total_pix).toFixed(2)}</td>
                    <td>R$ {Number(r.total_credit).toFixed(2)}</td>
                    <td>R$ {Number(r.total_debit).toFixed(2)}</td>
                    <td>{r.missing_card_receipts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-semibold mt-2">{value}</p>
    </div>
  );
}
