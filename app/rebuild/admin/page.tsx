"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type Profile = { user_id: string; full_name: string; role: "admin" | "operator"; active?: boolean | null };
type Shift = { id: string; status: "open" | "closed"; opened_at: string; operator_id: string; booth_id: string };
type TransactionBase = {
  id: string;
  sold_at: string;
  amount: number;
  commission_amount: number | null;
  payment_method: "pix" | "credit" | "debit" | "cash";
  status: "posted" | "voided";
  operator_id?: string | null;
};
type Receipt = { id: string; transaction_id: string };
type AdjustmentRequest = {
  id: string;
  transaction_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type AdminSection = "dashboard" | "historico" | "relatorios" | "usuarios" | "configuracoes";

const sections: Array<{ key: AdminSection; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "historico", label: "Histórico" },
  { key: "relatorios", label: "Relatórios" },
  { key: "usuarios", label: "Usuários" },
  { key: "configuracoes", label: "Configurações" },
];

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentLabel(method: TransactionBase["payment_method"]) {
  if (method === "credit") return "Crédito";
  if (method === "debit") return "Débito";
  if (method === "cash") return "Dinheiro";
  return "Pix";
}

function paymentIcon(method: TransactionBase["payment_method"]) {
  if (method === "credit" || method === "debit") return "credit_card";
  if (method === "cash") return "payments";
  return "qr_code_2";
}

export default function RebuildAdminPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [operators, setOperators] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<TransactionBase[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>([]);

  const sectionParam = (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("section") as AdminSection | null) : null) ?? "dashboard";
  const activeSection: AdminSection = sections.some((s) => s.key === sectionParam) ? sectionParam : "dashboard";

  const operatorNameById = useMemo(() => new Map(operators.map((o) => [o.user_id, o.full_name])), [operators]);
  const postedTx = useMemo(() => transactions.filter((tx) => tx.status === "posted"), [transactions]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const txToday = useMemo(() => postedTx.filter((tx) => tx.sold_at.slice(0, 10) === todayKey), [postedTx, todayKey]);

  const kpis = useMemo(() => {
    const revenue = txToday.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const commission = txToday.reduce((acc, tx) => acc + Number(tx.commission_amount || 0), 0);
    const avgTicket = txToday.length ? revenue / txToday.length : 0;
    const openShifts = shifts.filter((s) => s.status === "open").length;
    return { revenue, commission, avgTicket, openShifts };
  }, [txToday, shifts]);

  const pendingReceiptCount = useMemo(() => {
    const cardTx = postedTx.filter((tx) => tx.payment_method === "credit" || tx.payment_method === "debit");
    const receiptSet = new Set(receipts.map((r) => r.transaction_id));
    return cardTx.filter((tx) => !receiptSet.has(tx.id)).length;
  }, [postedTx, receipts]);

  const pendingAdjustments = useMemo(() => adjustments.filter((a) => a.status === "pending"), [adjustments]);

  const alerts = useMemo(() => {
    const list: Array<{ title: string; ref: string; detail: string }> = [];
    pendingAdjustments.slice(0, 2).forEach((adj) => {
      list.push({
        title: "Ajuste Pendente",
        ref: `#${adj.transaction_id.slice(0, 8)}`,
        detail: adj.reason,
      });
    });
    if (pendingReceiptCount > 0) {
      list.push({
        title: "Comprovantes Pendentes",
        ref: "Cartão",
        detail: `${pendingReceiptCount} transação(ões) aguardando comprovante.`,
      });
    }
    if (list.length === 0) {
      list.push({ title: "Operação Estável", ref: "Agora", detail: "Nenhum alerta crítico no momento." });
    }
    return list.slice(0, 3);
  }, [pendingAdjustments, pendingReceiptCount]);

  const chartDays = useMemo(() => {
    const out: Array<{ key: string; label: string; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ key, label: d.toLocaleDateString("pt-BR", { weekday: "short" }), total: 0 });
    }
    postedTx.forEach((tx) => {
      const item = out.find((d) => d.key === tx.sold_at.slice(0, 10));
      if (item) item.total += Number(tx.amount || 0);
    });
    return out;
  }, [postedTx]);

  const chartPath = useMemo(() => {
    const max = Math.max(1, ...chartDays.map((d) => d.total));
    const width = 760;
    const height = 220;
    const step = width / Math.max(1, chartDays.length - 1);
    const points = chartDays.map((d, idx) => {
      const x = idx * step;
      const y = height - (d.total / max) * 200 - 10;
      return { x, y };
    });
    if (!points.length) return { line: "", area: "" };
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L ${width},${height} L 0,${height} Z`;
    return { line, area };
  }, [chartDays]);

  useEffect(() => {
    async function guard() {
      setAuthLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const authUserId = data.user?.id;
        if (!authUserId) return router.replace("/login");

        const profileRes = await supabase.from("profiles").select("role,active").eq("user_id", authUserId).single();
        if (profileRes.error || !profileRes.data) return router.replace("/login");

        const profile = profileRes.data as { role: "admin" | "operator"; active?: boolean | null };
        if (profile.active === false) {
          await supabase.auth.signOut();
          return router.replace("/login");
        }
        if (profile.role !== "admin") return router.replace("/rebuild/operator");
      } finally {
        setAuthLoading(false);
      }
    }

    guard();
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        from.setHours(0, 0, 0, 0);

        const [opsRes, txRes, shiftsRes, adjRes] = await Promise.all([
          supabase.from("profiles").select("user_id,full_name,role,active").eq("role", "operator").order("full_name"),
          supabase
            .from("transactions")
            .select("id,sold_at,amount,commission_amount,payment_method,status,operator_id")
            .gte("sold_at", from.toISOString())
            .order("sold_at", { ascending: false })
            .limit(600),
          supabase.from("shifts").select("id,status,opened_at,operator_id,booth_id").order("opened_at", { ascending: false }).limit(150),
          supabase.from("adjustment_requests").select("id,transaction_id,requested_by,reason,status,created_at").order("created_at", { ascending: false }).limit(120),
        ]);

        if (opsRes.error || txRes.error || shiftsRes.error || adjRes.error) {
          setError("Não foi possível carregar o dashboard administrativo.");
          return;
        }

        const txList = (txRes.data as TransactionBase[] | null) ?? [];
        const txIds = txList.map((t) => t.id);
        const recRes = txIds.length
          ? await supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id", txIds)
          : ({ data: [], error: null } as { data: Receipt[]; error: null });

        setOperators((opsRes.data as Profile[] | null) ?? []);
        setTransactions(txList);
        setShifts((shiftsRes.data as Shift[] | null) ?? []);
        setAdjustments((adjRes.data as AdjustmentRequest[] | null) ?? []);
        setReceipts((recRes.data as Receipt[] | null) ?? []);
      } catch {
        setError("Falha inesperada ao carregar os dados.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading]);

  if (authLoading || loading) return <div className="text-sm text-slate-500">Carregando dashboard...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {activeSection !== "dashboard" ? (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-bold text-slate-900">{sections.find((s) => s.key === activeSection)?.label}</h2>
          <p className="mt-1 text-sm text-slate-500">Use o menu lateral para voltar ao dashboard visual completo.</p>
        </div>
      ) : null}

      {activeSection === "dashboard" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-5 rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 h-[140px]">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Receita Hoje</p><h3 className="text-3xl font-extrabold text-slate-900 mt-2">{brl(kpis.revenue)}</h3></div><div className="p-2 bg-blue-50 text-[#0da2e7] rounded-lg"><span className="material-symbols-outlined text-[24px]">payments</span></div></div>
              <div className="flex items-center mt-2"><span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">Dados reais</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 h-[140px]">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Comissão Estimada</p><h3 className="text-3xl font-extrabold text-slate-900 mt-2">{brl(kpis.commission)}</h3></div><div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><span className="material-symbols-outlined text-[24px]">percent</span></div></div>
              <div className="flex items-center mt-2"><span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 h-[140px]">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Ticket Médio</p><h3 className="text-3xl font-extrabold text-slate-900 mt-2">{brl(kpis.avgTicket)}</h3></div><div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><span className="material-symbols-outlined text-[24px]">receipt</span></div></div>
              <div className="flex items-center mt-2"><span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{txToday.length} venda(s)</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 h-[140px]">
              <div className="flex justify-between items-start"><div><p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Turnos Abertos</p><h3 className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.openShifts}</h3></div><div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><span className="material-symbols-outlined text-[24px]">storefront</span></div></div>
              <div className="flex items-center mt-2"><span className="bg-amber-50 text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full">{pendingAdjustments.length} pendente(s)</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-bold text-slate-900">Evolução de Receita</h2><p className="text-sm text-slate-500">Últimos 7 dias</p></div></div>
              <div className="relative h-64 w-full">
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400">
                  <div className="flex w-full items-center"><span className="w-10 text-right pr-2">máx</span><div className="h-px bg-slate-100 w-full"></div></div>
                  <div className="flex w-full items-center"><span className="w-10 text-right pr-2">75%</span><div className="h-px bg-slate-100 w-full"></div></div>
                  <div className="flex w-full items-center"><span className="w-10 text-right pr-2">50%</span><div className="h-px bg-slate-100 w-full"></div></div>
                  <div className="flex w-full items-center"><span className="w-10 text-right pr-2">25%</span><div className="h-px bg-slate-100 w-full"></div></div>
                  <div className="flex w-full items-center"><span className="w-10 text-right pr-2">0</span><div className="h-px bg-slate-100 w-full"></div></div>
                </div>
                <svg className="absolute inset-0 left-10 h-full w-[calc(100%-2.5rem)]" viewBox="0 0 760 220" preserveAspectRatio="none">
                  <defs><linearGradient id="gradient-real" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0da2e7" stopOpacity="0.2" /><stop offset="100%" stopColor="#0da2e7" stopOpacity="0" /></linearGradient></defs>
                  <path d={chartPath.area} fill="url(#gradient-real)" />
                  <path d={chartPath.line} fill="none" stroke="#0da2e7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute -bottom-6 left-10 right-0 flex justify-between text-xs font-medium text-slate-400 px-2">
                  {chartDays.map((d) => <span key={d.key}>{d.label}</span>)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">warning</span>Atenção Necessária</h3><span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span></div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.title + alert.ref} className="p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-start mb-1"><p className="text-sm font-semibold text-slate-800">{alert.title}</p><span className="text-[10px] text-slate-400 font-mono">{alert.ref}</span></div>
                    <p className="text-xs text-slate-500">{alert.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><h3 className="font-bold text-lg text-slate-900">Últimas Transações</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100"><th className="px-6 py-3 font-semibold w-24">ID</th><th className="px-6 py-3 font-semibold">Data/Hora</th><th className="px-6 py-3 font-semibold">Operador</th><th className="px-6 py-3 font-semibold">Método</th><th className="px-6 py-3 font-semibold text-right">Valor</th><th className="px-6 py-3 font-semibold text-center">Status</th></tr></thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {postedTx.slice(0, 8).map((tx, idx) => (
                    <tr key={tx.id} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-6 py-3 font-mono text-slate-400 text-xs">#{tx.id.slice(0, 8)}</td>
                      <td className="px-6 py-3 text-slate-600">{new Date(tx.sold_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-6 py-3 font-medium text-slate-900">{operatorNameById.get(tx.operator_id || "") || "Não informado"}</td>
                      <td className="px-6 py-3 text-slate-600"><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-slate-400">{paymentIcon(tx.payment_method)}</span>{paymentLabel(tx.payment_method)}</div></td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">{brl(Number(tx.amount || 0))}</td>
                      <td className="px-6 py-3 text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Confirmado</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
