"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type Option = { id: string; name: string; commission_percent: number };
type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
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

type Punch = {
  id: string;
  punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim";
  punched_at: string;
  note: string | null;
};

type CashMovement = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
};

export default function OperatorPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [booths, setBooths] = useState<{ booth_id: string; booths: { name: string } }[]>([]);
  const [boothId, setBoothId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "debit" | "cash">("pix");
  const [ticketReference, setTicketReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashType, setCashType] = useState<"suprimento" | "sangria" | "ajuste">("suprimento");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
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

      const [{ data: bData }, { data: cData }, { data: catData }, { data: subData }, { data: sData }] = await Promise.all([
        supabase.from("operator_booths").select("booth_id, booths(name)").eq("operator_id", authData.user.id).eq("active", true),
        supabase.from("companies").select("id, name, commission_percent").eq("active", true).order("name"),
        supabase.from("transaction_categories").select("id, name").eq("active", true).order("name"),
        supabase.from("transaction_subcategories").select("id, name, category_id").eq("active", true).order("name"),
        supabase.from("shifts").select("id, booth_id, status").eq("operator_id", authData.user.id).eq("status", "open").maybeSingle(),
      ]);

      setBooths((bData as any) ?? []);
      setCompanies((cData as Option[]) ?? []);
      const cats = (catData as Category[]) ?? [];
      const subs = (subData as Subcategory[]) ?? [];
      setCategories(cats);
      setSubcategories(subs);
      if (cats[0]) {
        setCategoryId(cats[0].id);
        const firstSub = subs.find((s) => s.category_id === cats[0].id);
        if (firstSub) setSubcategoryId(firstSub.id);
      }
      if (sData) {
        setShift(sData as Shift);
        await loadTxs((sData as Shift).id);
        await loadCashMovements((sData as Shift).id);
      }
      await loadPunches(authData.user.id);
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

  async function loadPunches(uid: string) {
    const { data } = await supabase
      .from("time_punches")
      .select("id,punch_type,punched_at,note")
      .eq("user_id", uid)
      .order("punched_at", { ascending: false })
      .limit(20);

    setPunches(((data ?? []) as unknown) as Punch[]);
  }

  async function loadCashMovements(shiftId: string) {
    const { data } = await supabase
      .from("cash_movements")
      .select("id,movement_type,amount,note,created_at")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false })
      .limit(100);

    setCashMovements(((data ?? []) as unknown) as CashMovement[]);
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      created_by: userId,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      details: details ?? {},
    });
  }

  async function openShift() {
    if (!boothId) {
      setMessage("Selecione um guichê para abrir o turno.");
      return;
    }

    const { data, error } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });
    if (error) {
      setMessage(`Não foi possível abrir turno: ${error.message}`);
      return;
    }

    await logAction("OPEN_SHIFT", "shifts", (data as Shift).id, { booth_id: boothId });
    setShift(data as Shift);
    setMessage("Turno aberto com sucesso.");
    await loadTxs((data as Shift).id);
    await loadCashMovements((data as Shift).id);
  }

  async function closeShift() {
    if (!shift || !userId) return;

    const pendencias = txs.filter(
      (t) => (t.payment_method === "credit" || t.payment_method === "debit") && (!t.transaction_receipts || t.transaction_receipts.length === 0)
    ).length;

    if (pendencias > 0) {
      setMessage(`Existem ${pendencias} lançamento(s) de cartão sem comprovante.`);
      return;
    }

    const cashSales = txs.filter((t) => t.payment_method === "cash").reduce((a, t) => a + Number(t.amount || 0), 0);
    const suprimento = cashMovements.filter((m) => m.movement_type === "suprimento").reduce((a, m) => a + Number(m.amount || 0), 0);
    const sangria = cashMovements.filter((m) => m.movement_type === "sangria").reduce((a, m) => a + Number(m.amount || 0), 0);
    const ajuste = cashMovements.filter((m) => m.movement_type === "ajuste").reduce((a, m) => a + Number(m.amount || 0), 0);
    const expectedCash = cashSales + suprimento - sangria + ajuste;

    const declaredRaw = window.prompt(`Fechamento de caixa\nValor esperado: R$ ${expectedCash.toFixed(2)}\n\nInforme o valor contado no caixa:`);
    if (declaredRaw === null) return;
    const declaredCash = Number(declaredRaw.replace(",", "."));
    if (Number.isNaN(declaredCash)) return setMessage("Valor de caixa inválido.");

    const note = window.prompt("Observação do fechamento (opcional):") || null;
    const difference = Number((declaredCash - expectedCash).toFixed(2));

    const closeCash = await supabase.from("shift_cash_closings").upsert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      user_id: userId,
      expected_cash: Number(expectedCash.toFixed(2)),
      declared_cash: Number(declaredCash.toFixed(2)),
      difference,
      note,
    });

    if (closeCash.error) return setMessage(`Erro ao salvar fechamento de caixa: ${closeCash.error.message}`);

    const { error } = await supabase.rpc("close_shift", { p_shift_id: shift.id, p_ip: null, p_notes: note });
    if (error) return setMessage(error.message);

    await logAction("CLOSE_SHIFT", "shifts", shift.id, {
      expected_cash: Number(expectedCash.toFixed(2)),
      declared_cash: Number(declaredCash.toFixed(2)),
      difference,
    });

    setShift(null);
    setTxs([]);
    setCashMovements([]);
    setMessage(`Turno encerrado. Diferença de caixa: R$ ${difference.toFixed(2)}.`);
  }

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;

    const note = type === "entrada" ? "Entrada" : type === "saida" ? "Saída" : type === "pausa_inicio" ? "Início de pausa" : "Fim de pausa";

    const { error } = await supabase.from("time_punches").insert({
      user_id: userId,
      booth_id: (shift?.booth_id ?? boothId) || null,
      shift_id: shift?.id ?? null,
      punch_type: type,
      note,
    });

    if (error) return setMessage(`Erro ao bater ponto: ${error.message}`);
    await logAction("TIME_PUNCH", "time_punches", undefined, { type, shift_id: shift?.id ?? null });
    await loadPunches(userId);
    setMessage(`Ponto registrado: ${note}.`);
  }

  async function submitCashMovement(e: FormEvent) {
    e.preventDefault();
    if (!shift || !userId || !cashAmount) return;

    const { error } = await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      user_id: userId,
      movement_type: cashType,
      amount: Number(cashAmount),
      note: cashNote.trim() || null,
    });

    if (error) return setMessage(`Erro no movimento de caixa: ${error.message}`);

    await logAction("CASH_MOVEMENT", "cash_movements", undefined, {
      shift_id: shift.id,
      movement_type: cashType,
      amount: Number(cashAmount),
    });

    setCashAmount("");
    setCashNote("");
    await loadCashMovements(shift.id);
    setMessage("Movimento de caixa registrado.");
  }

  async function submitTx(e: FormEvent) {
    e.preventDefault();
    if (!shift || !companyId || !categoryId || !subcategoryId || !amount || !userId) return;

    const payload = {
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: companyId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      amount: Number(amount),
      payment_method: paymentMethod,
      commission_percent: null,
      ticket_reference: ticketReference || null,
      note: note || null,
    };

    const { data: inserted, error } = await supabase.from("transactions").insert(payload).select("id").single();
    if (error) return setMessage(error.message);

    await logAction("CREATE_TRANSACTION", "transactions", inserted?.id, {
      amount: Number(amount),
      payment_method: paymentMethod,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    });

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

    await logAction("UPLOAD_RECEIPT", "transactions", txId, { path });
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

  const cashTotals = useMemo(() => {
    const suprimento = cashMovements.filter((m) => m.movement_type === "suprimento").reduce((a, m) => a + Number(m.amount || 0), 0);
    const sangria = cashMovements.filter((m) => m.movement_type === "sangria").reduce((a, m) => a + Number(m.amount || 0), 0);
    const ajuste = cashMovements.filter((m) => m.movement_type === "ajuste").reduce((a, m) => a + Number(m.amount || 0), 0);
    return { suprimento, sangria, ajuste, saldo: suprimento - sangria + ajuste };
  }, [cashMovements]);

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [subcategories, categoryId]
  );

  const operatorFlow = useMemo(() => {
    const cardPending = txs.filter((t) => (t.payment_method === "credit" || t.payment_method === "debit") && !t.transaction_receipts?.length).length;
    const totalTx = txs.length;
    const lastTxAt = txs[0]?.sold_at ?? null;
    return { cardPending, totalTx, lastTxAt };
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
    await logAction("REQUEST_ADJUSTMENT", "transactions", txId, { reason });
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

        <section className="glass-card p-4">
          <h2 className="font-semibold mb-2">Fluxo do operador</h2>
          <div className="grid md:grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border border-slate-800 p-2">Turno: <b>{shift ? "Aberto" : "Fechado"}</b></div>
            <div className="rounded-lg border border-slate-800 p-2">Lançamentos: <b>{operatorFlow.totalTx}</b></div>
            <div className="rounded-lg border border-slate-800 p-2">Pend. cartão: <b>{operatorFlow.cardPending}</b></div>
            <div className="rounded-lg border border-slate-800 p-2">Último lançamento: <b>{operatorFlow.lastTxAt ? new Date(operatorFlow.lastTxAt).toLocaleTimeString("pt-BR") : "-"}</b></div>
          </div>
        </section>

        <section className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Bater ponto</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={() => registerPunch("entrada")}>Entrada</button>
            <button className="btn-ghost" type="button" onClick={() => registerPunch("pausa_inicio")}>Início pausa</button>
            <button className="btn-ghost" type="button" onClick={() => registerPunch("pausa_fim")}>Fim pausa</button>
            <button className="btn-ghost" type="button" onClick={() => registerPunch("saida")}>Saída</button>
          </div>
          <div className="text-xs text-slate-400">Últimos registros de ponto</div>
          <ul className="space-y-1 text-sm">
            {punches.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-300">{p.note ?? p.punch_type}</span>
                <span className="text-slate-400">{new Date(p.punched_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </section>

        {!shift ? (
          <section className="glass-card p-4 space-y-3">
            <h2 className="font-semibold">Abrir turno</h2>
            <select value={boothId} onChange={(e) => setBoothId(e.target.value)} className="field">
              <option value="">Selecione o guichê</option>
              {booths.map((b: any) => (
                <option key={b.booth_id} value={b.booth_id}>{b.booths?.name ?? b.booth_id}</option>
              ))}
            </select>
            {booths.length === 0 && (
              <p className="text-amber-300 text-sm">Seu usuário não está vinculado a nenhum guichê ativo. Peça ao admin para vincular em Configurações.</p>
            )}
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

        <section className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Caixa (PDV)</h2>
          <form onSubmit={submitCashMovement} className="grid md:grid-cols-4 gap-2 items-end">
            <select value={cashType} onChange={(e) => setCashType(e.target.value as any)} className="field" disabled={!shift}>
              <option value="suprimento">Suprimento</option>
              <option value="sangria">Sangria</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Valor" className="field" disabled={!shift} />
            <input value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Observação" className="field" disabled={!shift} />
            <button className="btn-primary" disabled={!shift}>Registrar</button>
          </form>
          <div className="grid md:grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border border-slate-800 p-2">Suprimento: <b>R$ {cashTotals.suprimento.toFixed(2)}</b></div>
            <div className="rounded-lg border border-slate-800 p-2">Sangria: <b>R$ {cashTotals.sangria.toFixed(2)}</b></div>
            <div className="rounded-lg border border-slate-800 p-2">Ajuste: <b>R$ {cashTotals.ajuste.toFixed(2)}</b></div>
            <div className="rounded-lg border border-emerald-700/60 p-2">Saldo caixa: <b>R$ {cashTotals.saldo.toFixed(2)}</b></div>
          </div>
        </section>

        <form onSubmit={submitTx} className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Novo lançamento</h2>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="field" required>
            <option value="">Selecione a empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.commission_percent}%)</option>)}
          </select>
          <select
            value={categoryId}
            onChange={(e) => {
              const next = e.target.value;
              setCategoryId(next);
              const firstSub = subcategories.find((s) => s.category_id === next);
              setSubcategoryId(firstSub?.id ?? "");
            }}
            className="field"
            required
          >
            <option value="">Selecione a categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="field" required>
            <option value="">Selecione a subcategoria</option>
            {filteredSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="Valor" className="field" required />
          <input value={ticketReference} onChange={(e) => setTicketReference(e.target.value)} placeholder="Referência da passagem (opcional)" className="field" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="field">
            <option value="pix">PIX</option>
            <option value="credit">Crédito</option>
            <option value="debit">Débito</option>
            <option value="cash">Dinheiro</option>
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="Observação (opcional)" />
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
