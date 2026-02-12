"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type Option = { id: string; name: string; commission_percent: number };
type Shift = { id: string; booth_id: string; status: "open" | "closed" };
type Tx = {
  id: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  sold_at: string;
  ticket_reference: string | null;
  note: string | null;
  companies: { name: string } | { name: string }[] | null;
  transaction_receipts?: { id: string }[];
};

export default function OperatorPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [booths, setBooths] = useState<{ booth_id: string; booths: { name: string } }[]>([]);
  const [boothId, setBoothId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "debit" | "cash">("pix");
  const [ticketReference, setTicketReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [uploadingTxId, setUploadingTxId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");
      setUserId(authData.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (profile?.role === "admin") return router.push("/admin");

      const [{ data: bData }, { data: cData }, { data: sData }] = await Promise.all([
        supabase.from("operator_booths").select("booth_id, booths(name)").eq("operator_id", authData.user.id).eq("active", true),
        supabase.from("companies").select("id, name, commission_percent").eq("active", true).order("name"),
        supabase.from("shifts").select("id, booth_id, status").eq("operator_id", authData.user.id).eq("status", "open").maybeSingle(),
      ]);

      setBooths((bData as any) ?? []);
      setCompanies((cData as Option[]) ?? []);
      if (sData) {
        setShift(sData as Shift);
        await loadTxs((sData as Shift).id);
      }
      if (!sData && bData?.[0]) setBoothId((bData[0] as any).booth_id);
    })();
  }, [router]);

  async function loadTxs(shiftId: string) {
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, payment_method, sold_at, ticket_reference, note, companies(name), transaction_receipts(id)")
      .eq("shift_id", shiftId)
      .eq("status", "posted")
      .order("sold_at", { ascending: false })
      .limit(100);

    setTxs(((data ?? []) as unknown) as Tx[]);
  }

  async function openShift() {
    if (!boothId) return;
    const { data, error } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });
    if (error) return setMessage(error.message);
    setShift(data as Shift);
    setMessage("Turno aberto com sucesso.");
    await loadTxs((data as Shift).id);
  }

  async function closeShift() {
    if (!shift) return;

    const pendencias = txs.filter(
      (t) => (t.payment_method === "credit" || t.payment_method === "debit") && (!t.transaction_receipts || t.transaction_receipts.length === 0)
    ).length;

    if (pendencias > 0) {
      setMessage(`Existem ${pendencias} lançamento(s) de cartão sem comprovante.`);
      return;
    }

    const { error } = await supabase.rpc("close_shift", { p_shift_id: shift.id, p_ip: null, p_notes: null });
    if (error) return setMessage(error.message);
    setShift(null);
    setTxs([]);
    setMessage("Turno encerrado.");
  }

  async function submitTx(e: FormEvent) {
    e.preventDefault();
    if (!shift || !companyId || !amount || !userId) return;

    const payload = {
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: companyId,
      amount: Number(amount),
      payment_method: paymentMethod,
      commission_percent: null,
      ticket_reference: ticketReference || null,
      note: note || null,
    };

    const { error } = await supabase.from("transactions").insert(payload);
    if (error) return setMessage(error.message);

    setAmount("");
    setTicketReference("");
    setNote("");
    setMessage("Lançamento salvo.");
    await loadTxs(shift.id);
  }

  async function handleUploadReceipt(txId: string, ev: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = ev.target.files?.[0];
    if (!file) return;

    setUploadingTxId(txId);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${txId}.${ext}`;

    const up = await supabase.storage.from("payment-receipts").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (up.error) {
      setMessage(`Erro no upload: ${up.error.message}`);
      setUploadingTxId(null);
      return;
    }

    const ins = await supabase.from("transaction_receipts").upsert({
      transaction_id: txId,
      storage_path: path,
      mime_type: file.type || "image/jpeg",
      uploaded_by: userId,
    });

    if (ins.error) {
      setMessage(`Erro ao salvar comprovante: ${ins.error.message}`);
      setUploadingTxId(null);
      return;
    }

    setMessage("Comprovante enviado com sucesso.");
    if (shift) await loadTxs(shift.id);
    setUploadingTxId(null);
  }

  const totals = useMemo(() => {
    return txs.reduce(
      (acc, tx) => {
        acc[tx.payment_method] += Number(tx.amount || 0);
        return acc;
      },
      { pix: 0, credit: 0, debit: 0, cash: 0 }
    );
  }, [txs]);

  async function requestAdjustment(txId: string) {
    const reason = window.prompt("Descreva o motivo do ajuste:");
    if (!reason || !userId) return;

    const { error } = await supabase.from("adjustment_requests").insert({
      transaction_id: txId,
      requested_by: userId,
      reason,
    });

    if (error) return setMessage(`Erro ao solicitar ajuste: ${error.message}`);
    setMessage("Solicitação de ajuste enviada para o admin.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="app-shell">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs mb-2">● Operação ativa</div>
            <h1 className="text-2xl font-bold tracking-tight">Operador de Guichê</h1>
            <p className="muted">Turno e lançamentos.</p>
          </div>
          <button onClick={logout} className="btn-ghost">Sair</button>
        </header>

        <section className="grid md:grid-cols-4 gap-3">
          <MiniCard label="PIX" value={totals.pix} />
          <MiniCard label="Crédito" value={totals.credit} />
          <MiniCard label="Débito" value={totals.debit} />
          <MiniCard label="Dinheiro" value={totals.cash} />
        </section>

        {!shift ? (
          <section className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Abrir turno</h2>
            <select value={boothId} onChange={(e) => setBoothId(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
              <option value="">Selecione o guichê</option>
              {booths.map((b: any) => (
                <option key={b.booth_id} value={b.booth_id}>{b.booths?.name ?? b.booth_id}</option>
              ))}
            </select>
            <button onClick={openShift} className="btn-primary">Abrir turno</button>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-green-400">Turno aberto</p>
              <button onClick={closeShift} className="px-3 py-2 rounded-lg border border-red-500 text-red-300">Encerrar turno</button>
            </div>
          </section>
        )}

        <form onSubmit={submitTx} className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Novo lançamento</h2>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" required>
            <option value="">Selecione a empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.commission_percent}%)</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="Valor" className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" required />
          <input value={ticketReference} onChange={(e) => setTicketReference(e.target.value)} placeholder="Referência da passagem (opcional)" className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
            <option value="pix">PIX</option>
            <option value="credit">Crédito</option>
            <option value="debit">Débito</option>
            <option value="cash">Dinheiro</option>
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2" placeholder="Observação (opcional)" />
          <button disabled={!shift} className="btn-primary disabled:opacity-50">Salvar lançamento</button>
          {message && <p className="text-sm text-blue-300">{message}</p>}
        </form>

        <section className="glass-card p-4 overflow-auto">
          <h2 className="font-semibold mb-2">Lançamentos do turno</h2>
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-left">
              <tr>
                <th className="py-2">Hora</th>
                <th>Empresa</th>
                <th>Ref</th>
                <th>Método</th>
                <th>Valor</th>
                <th>Comprovante</th>
                <th>Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => {
                const need = tx.payment_method === "credit" || tx.payment_method === "debit";
                const has = !!tx.transaction_receipts?.length;
                return (
                  <tr key={tx.id} className="border-t border-slate-800">
                    <td className="py-2">{new Date(tx.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{Array.isArray(tx.companies) ? (tx.companies[0]?.name ?? "-") : (tx.companies?.name ?? "-")}</td>
                    <td>{tx.ticket_reference ?? "-"}</td>
                    <td>{tx.payment_method}</td>
                    <td>R$ {Number(tx.amount).toFixed(2)}</td>
                    <td>
                      {!need ? (
                        <span className="text-slate-500">Não obrigatório</span>
                      ) : has ? (
                        <span className="text-green-400">OK</span>
                      ) : (
                        <label className="inline-flex items-center gap-2 cursor-pointer text-blue-300">
                          <span>{uploadingTxId === tx.id ? "Enviando..." : "Anexar"}</span>
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingTxId === tx.id} onChange={(e) => handleUploadReceipt(tx.id, e)} />
                        </label>
                      )}
                    </td>
                    <td>
                      <button onClick={() => requestAdjustment(tx.id)} className="text-amber-300 hover:underline">
                        Solicitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function MiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-lg font-semibold mt-1">R$ {value.toFixed(2)}</p>
    </div>
  );
}
