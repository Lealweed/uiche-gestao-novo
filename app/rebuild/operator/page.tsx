"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowDown, BanknoteArrowUp, Clock3, CreditCard, HandCoins, Receipt, RotateCcw, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { LoadingState } from "@/components/rebuild/ui/loading-state";
import { Card, CardDescription, CardTitle } from "@/components/rebuild/ui/card";

type Profile = { role: "admin" | "operator"; active?: boolean | null };
type BoothLink = { booth_id: string };
type Booth = { id: string; name: string };
type Shift = { id: string; booth_id: string; status: "open" | "closed" };
type Company = { id: string; name: string };
type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
type CashMovement = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  note: string | null;
  created_at: string;
};
type TxBase = {
  id: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  sold_at: string;
  ticket_reference: string | null;
  note: string | null;
  company_id: string | null;
};
type TxView = TxBase & { company_name: string; receipt_count: number };

function brl(value: number) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

export default function RebuildOperatorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [booths, setBooths] = useState<Array<{ booth_id: string; booth_name: string }>>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [transactions, setTransactions] = useState<TxView[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  const [boothId, setBoothId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "debit" | "cash">("pix");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [cashType, setCashType] = useState<"suprimento" | "sangria" | "ajuste">("suprimento");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [uploadingTxId, setUploadingTxId] = useState<string | null>(null);

  const filteredSubcategories = useMemo(
    () => subcategories.filter((sub) => sub.category_id === categoryId),
    [subcategories, categoryId]
  );

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          acc[tx.payment_method] += Number(tx.amount || 0);
          return acc;
        },
        { pix: 0, credit: 0, debit: 0, cash: 0 }
      ),
    [transactions]
  );

  const totalSales = useMemo(() => totals.pix + totals.credit + totals.debit + totals.cash, [totals]);

  const pendingReceiptTxs = useMemo(
    () => transactions.filter((t) => (t.payment_method === "credit" || t.payment_method === "debit") && t.receipt_count === 0),
    [transactions]
  );

  const cashTotals = useMemo(() => {
    const suprimento = cashMovements.filter((m) => m.movement_type === "suprimento").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const sangria = cashMovements.filter((m) => m.movement_type === "sangria").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const ajuste = cashMovements.filter((m) => m.movement_type === "ajuste").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    return { suprimento, sangria, ajuste, saldo: suprimento - sangria + ajuste + totals.cash };
  }, [cashMovements, totals.cash]);

  async function loadTransactions(shiftId: string) {
    const txRes = await supabase
      .from("transactions")
      .select("id,amount,payment_method,sold_at,ticket_reference,note,company_id")
      .eq("shift_id", shiftId)
      .eq("status", "posted")
      .order("sold_at", { ascending: false })
      .limit(120);

    if (txRes.error) throw new Error(`Falha ao carregar lançamentos: ${txRes.error.message}`);

    const baseTxs = (txRes.data as TxBase[] | null) ?? [];
    const txIds = baseTxs.map((t) => t.id);
    const companyIds = Array.from(new Set(baseTxs.map((t) => t.company_id).filter(Boolean))) as string[];

    const [receiptRes, companyRes] = await Promise.all([
      txIds.length
        ? supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id", txIds)
        : Promise.resolve({ data: [], error: null } as any),
      companyIds.length
        ? supabase.from("companies").select("id,name").in("id", companyIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (receiptRes.error) throw new Error(`Falha ao carregar comprovantes: ${receiptRes.error.message}`);
    if (companyRes.error) throw new Error(`Falha ao carregar empresas dos lançamentos: ${companyRes.error.message}`);

    const receiptCountByTx = new Map<string, number>();
    for (const item of (receiptRes.data as Array<{ id: string; transaction_id: string }> | null) ?? []) {
      receiptCountByTx.set(item.transaction_id, (receiptCountByTx.get(item.transaction_id) ?? 0) + 1);
    }

    const companyNameById = new Map<string, string>(
      (((companyRes.data as Array<{ id: string; name: string }> | null) ?? [])).map((c) => [c.id, c.name])
    );

    setTransactions(
      baseTxs.map((tx) => ({
        ...tx,
        company_name: tx.company_id ? companyNameById.get(tx.company_id) ?? "-" : "-",
        receipt_count: receiptCountByTx.get(tx.id) ?? 0,
      }))
    );
  }

  async function loadCashMovements(shiftId: string) {
    const res = await supabase
      .from("cash_movements")
      .select("id,movement_type,amount,note,created_at")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false })
      .limit(120);

    if (res.error) throw new Error(`Falha ao carregar caixa: ${res.error.message}`);
    setCashMovements((res.data as CashMovement[] | null) ?? []);
  }

  async function bootstrap() {
    setLoading(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;

      if (!authUserId) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,active")
        .eq("user_id", authUserId)
        .single();

      if (profileError || !profile) {
        throw new Error("Perfil do usuário não encontrado.");
      }

      if ((profile as Profile).role === "admin") {
        router.replace("/rebuild/admin");
        return;
      }

      setUserId(authUserId);

      const [boothLinksRes, boothRes, companiesRes, categoriesRes, subcategoriesRes, shiftRes] = await Promise.all([
        supabase.from("operator_booths").select("booth_id").eq("operator_id", authUserId).eq("active", true),
        supabase.from("booths").select("id,name").eq("active", true),
        supabase.from("companies").select("id,name").eq("active", true).order("name"),
        supabase.from("transaction_categories").select("id,name").eq("active", true).order("name"),
        supabase.from("transaction_subcategories").select("id,name,category_id").eq("active", true).order("name"),
        supabase.from("shifts").select("id,booth_id,status").eq("operator_id", authUserId).eq("status", "open").maybeSingle(),
      ]);

      if (boothLinksRes.error) throw new Error(`Falha ao carregar guichês do operador: ${boothLinksRes.error.message}`);
      if (boothRes.error) throw new Error(`Falha ao carregar guichês: ${boothRes.error.message}`);
      if (companiesRes.error) throw new Error(`Falha ao carregar empresas: ${companiesRes.error.message}`);
      if (categoriesRes.error) throw new Error(`Falha ao carregar categorias: ${categoriesRes.error.message}`);
      if (subcategoriesRes.error) throw new Error(`Falha ao carregar subcategorias: ${subcategoriesRes.error.message}`);
      if (shiftRes.error) throw new Error(`Falha ao carregar turno atual: ${shiftRes.error.message}`);

      const links = (boothLinksRes.data as BoothLink[] | null) ?? [];
      const allBooths = (boothRes.data as Booth[] | null) ?? [];
      const boothMap = new Map(allBooths.map((b) => [b.id, b.name]));
      const hydratedBooths = links.map((l) => ({ booth_id: l.booth_id, booth_name: boothMap.get(l.booth_id) ?? l.booth_id }));

      setBooths(hydratedBooths);
      setBoothId(hydratedBooths[0]?.booth_id ?? "");

      const loadedCategories = (categoriesRes.data as Category[] | null) ?? [];
      const loadedSubcategories = (subcategoriesRes.data as Subcategory[] | null) ?? [];

      setCompanies((companiesRes.data as Company[] | null) ?? []);
      setCategories(loadedCategories);
      setSubcategories(loadedSubcategories);

      const firstCategory = loadedCategories[0]?.id ?? "";
      setCategoryId(firstCategory);
      setSubcategoryId(loadedSubcategories.find((sub) => sub.category_id === firstCategory)?.id ?? "");

      const openShift = shiftRes.data as Shift | null;
      setShift(openShift);

      if (openShift) {
        await Promise.all([loadTransactions(openShift.id), loadCashMovements(openShift.id)]);
      } else {
        setTransactions([]);
        setCashMovements([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o painel do operador.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function openShift() {
    if (!boothId) {
      setFeedback("Selecione um guichê para abrir o turno.");
      return;
    }

    setBusy("open-shift");
    setFeedback(null);

    const { data, error: rpcError } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });

    if (rpcError) {
      setBusy(null);
      setFeedback(`Não foi possível abrir o turno: ${rpcError.message}`);
      return;
    }

    const newShift = data as Shift;
    setShift(newShift);
    await Promise.all([loadTransactions(newShift.id), loadCashMovements(newShift.id)]);

    setBusy(null);
    setFeedback("Turno aberto com sucesso.");
  }

  async function closeShift() {
    if (!shift) return;

    const pendencias = pendingReceiptTxs.length;
    if (pendencias > 0) {
      setFeedback(`Existem ${pendencias} lançamento(s) de cartão sem comprovante.`);
      return;
    }

    setBusy("close-shift");
    setFeedback(null);

    const { error: rpcError } = await supabase.rpc("close_shift", { p_shift_id: shift.id, p_ip: null, p_notes: null });

    if (rpcError) {
      setBusy(null);
      setFeedback(`Não foi possível encerrar o turno: ${rpcError.message}`);
      return;
    }

    setShift(null);
    setTransactions([]);
    setCashMovements([]);
    setBusy(null);
    setFeedback("Turno encerrado com sucesso.");
  }

  async function submitTransaction(e: FormEvent) {
    e.preventDefault();

    if (!shift || !userId) {
      setFeedback("Abra um turno para lançar vendas.");
      return;
    }

    if (!companyId || !categoryId || !subcategoryId || !amount) {
      setFeedback("Preencha todos os campos obrigatórios do lançamento.");
      return;
    }

    setBusy("transaction");
    setFeedback(null);

    const { error: insertError } = await supabase.from("transactions").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: companyId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      payment_method: paymentMethod,
      amount: Number(amount),
      ticket_reference: reference.trim() || null,
      note: note.trim() || null,
      commission_percent: null,
    });

    if (insertError) {
      setBusy(null);
      setFeedback(`Falha ao salvar lançamento: ${insertError.message}`);
      return;
    }

    setAmount("");
    setReference("");
    setNote("");
    await loadTransactions(shift.id);

    setBusy(null);
    setFeedback("Lançamento registrado com sucesso.");
  }

  async function submitCashMovement(e: FormEvent) {
    e.preventDefault();

    if (!shift || !userId) {
      setFeedback("Abra um turno para registrar movimentos de caixa.");
      return;
    }

    if (!cashAmount) {
      setFeedback("Informe o valor do movimento de caixa.");
      return;
    }

    setBusy("cash");
    setFeedback(null);

    const { error: insertError } = await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      user_id: userId,
      movement_type: cashType,
      amount: Number(cashAmount),
      note: cashNote.trim() || null,
    });

    if (insertError) {
      setBusy(null);
      setFeedback(`Falha ao registrar caixa: ${insertError.message}`);
      return;
    }

    setCashAmount("");
    setCashNote("");
    await loadCashMovements(shift.id);

    setBusy(null);
    setFeedback("Movimento de caixa registrado.");
  }

  async function uploadReceipt(txId: string, ev: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;

    const file = ev.target.files?.[0];
    if (!file) return;

    setUploadingTxId(txId);
    setFeedback(null);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${txId}.${ext}`;

    const upload = await supabase.storage.from("payment-receipts").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (upload.error) {
      setUploadingTxId(null);
      setFeedback(`Falha no upload do comprovante: ${upload.error.message}`);
      return;
    }

    const register = await supabase.from("transaction_receipts").upsert({
      transaction_id: txId,
      storage_path: path,
      mime_type: file.type || "image/jpeg",
      uploaded_by: userId,
    });

    if (register.error) {
      setUploadingTxId(null);
      setFeedback(`Falha ao registrar comprovante: ${register.error.message}`);
      return;
    }

    if (shift) await loadTransactions(shift.id);
    setUploadingTxId(null);
    setFeedback("Comprovante enviado com sucesso.");
  }

  if (loading) {
    return (
      <div className="rb-page">
        <SectionHeader title="Painel do Operador" subtitle="Preparando ambiente operacional." />
        <LoadingState title="Carregando operação" message="Buscando autenticação, turno e parâmetros de venda." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rb-page">
        <SectionHeader title="Painel do Operador" subtitle="Não foi possível concluir a carga inicial." />
        <ErrorState title="Falha ao abrir o painel" message={error} />
      </div>
    );
  }

  return (
    <div className="rb-page">
      <SectionHeader
        title="Painel do Operador"
        subtitle="Abra/encerre turno, registre lançamentos, anexe comprovantes e controle o caixa em tempo real."
      />

      <section className="rb-stat-grid" aria-label="Resumo do turno">
        <StatCard
          label="Status do turno"
          value={shift ? "Aberto" : "Fechado"}
          delta={shift ? "Operação em andamento" : "Aguardando abertura"}
          icon={<Clock3 size={16} />}
        />
        <StatCard label="Vendas no turno" value={brl(totalSales)} delta={`${transactions.length} lançamento(s)`} icon={<CreditCard size={16} />} />
        <StatCard
          label="Comprovantes pendentes"
          value={String(pendingReceiptTxs.length)}
          delta={pendingReceiptTxs.length === 0 ? "Tudo em dia" : "Envie antes de fechar o turno"}
          icon={<Receipt size={16} />}
        />
      </section>

      {feedback ? (
        <Card>
          <p className="rb-card-description" style={{ marginTop: 0 }}>{feedback}</p>
        </Card>
      ) : null}

      {!shift ? (
        <Card>
          <CardTitle>Abertura de turno</CardTitle>
          <CardDescription>Selecione seu guichê para iniciar o atendimento.</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <select className="field" value={boothId} onChange={(e) => setBoothId(e.target.value)}>
              <option value="">Selecione o guichê</option>
              {booths.map((booth) => (
                <option key={booth.booth_id} value={booth.booth_id}>
                  {booth.booth_name}
                </option>
              ))}
            </select>
            <button className="btn-primary" disabled={busy === "open-shift" || booths.length === 0} onClick={openShift}>
              {busy === "open-shift" ? "Abrindo..." : "Abrir turno"}
            </button>
          </div>
          {booths.length === 0 ? (
            <p className="rb-card-description mt-3">Você não possui guichê vinculado. Solicite liberação ao administrador.</p>
          ) : null}
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Turno em andamento</CardTitle>
              <CardDescription>Turno ativo no guichê atual. Finalize somente após anexar comprovantes pendentes.</CardDescription>
            </div>
            <button className="btn-ghost" disabled={busy === "close-shift"} onClick={closeShift}>
              {busy === "close-shift" ? "Encerrando..." : "Encerrar turno"}
            </button>
          </div>
        </Card>
      )}

      <section className="rb-grid-3" aria-label="Fluxo operacional">
        <Card className="md:col-span-2">
          <CardTitle>Novo lançamento</CardTitle>
          <CardDescription>Registre empresa, categoria, método, valor e observações.</CardDescription>
          <form onSubmit={submitTransaction} className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="field" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
              <option value="">Selecione a empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              className="field"
              value={categoryId}
              onChange={(e) => {
                const nextCategory = e.target.value;
                setCategoryId(nextCategory);
                setSubcategoryId(subcategories.find((s) => s.category_id === nextCategory)?.id ?? "");
              }}
              required
            >
              <option value="">Selecione a categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select className="field" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} required>
              <option value="">Selecione a subcategoria</option>
              {filteredSubcategories.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select className="field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
              <option value="pix">PIX</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="cash">Dinheiro</option>
            </select>

            <input className="field" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" required />
            <input className="field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referência" />

            <textarea className="field md:col-span-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação" rows={3} />

            <div className="md:col-span-2">
              <button className="btn-primary" disabled={!shift || busy === "transaction"}>
                {busy === "transaction" ? "Salvando..." : "Salvar lançamento"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle>Caixa PDV</CardTitle>
          <CardDescription>Registre suprimento, sangria e ajuste do turno.</CardDescription>
          <form onSubmit={submitCashMovement} className="mt-4 space-y-3">
            <select className="field" value={cashType} onChange={(e) => setCashType(e.target.value as typeof cashType)} disabled={!shift}>
              <option value="suprimento">Suprimento</option>
              <option value="sangria">Sangria</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <input className="field" type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Valor" disabled={!shift} />
            <input className="field" value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Observação" disabled={!shift} />
            <button className="btn-primary" disabled={!shift || busy === "cash"}>{busy === "cash" ? "Registrando..." : "Registrar"}</button>
          </form>

          <div className="mt-4 space-y-2 text-sm">
            <p className="rb-card-description" style={{ marginTop: 0 }}>Totais do caixa</p>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><BanknoteArrowUp size={14} /> Suprimento</span><b>{brl(cashTotals.suprimento)}</b></div>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><BanknoteArrowDown size={14} /> Sangria</span><b>{brl(cashTotals.sangria)}</b></div>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><RotateCcw size={14} /> Ajuste</span><b>{brl(cashTotals.ajuste)}</b></div>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Wallet size={14} /> Saldo caixa</span><b>{brl(cashTotals.saldo)}</b></div>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Comprovantes pendentes</CardTitle>
            <CardDescription>Anexe comprovantes para lançamentos no crédito/débito.</CardDescription>
          </div>
          <p className="rb-card-description" style={{ marginTop: 0 }}>Pendências: {pendingReceiptTxs.length}</p>
        </div>

        {pendingReceiptTxs.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sem pendências de comprovante" message="Todas as transações de cartão estão com comprovante anexado." />
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {pendingReceiptTxs.slice(0, 8).map((tx) => (
              <div key={`pending-${tx.id}`} className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{tx.company_name} • {brl(tx.amount)}</p>
                  <p className="text-xs text-slate-600">{tx.payment_method.toUpperCase()} • {new Date(tx.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <label className="btn-ghost cursor-pointer text-sm">
                  {uploadingTxId === tx.id ? "Enviando..." : "Anexar comprovante"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingTxId === tx.id} onChange={(e) => uploadReceipt(tx.id, e)} />
                </label>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Lançamentos do turno</CardTitle>
        <CardDescription>Histórico operacional do turno atual.</CardDescription>

        {!shift ? (
          <div className="mt-4">
            <EmptyState title="Turno fechado" message="Abra o turno para visualizar os lançamentos operacionais." />
          </div>
        ) : transactions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sem lançamentos" message="Os lançamentos aparecerão aqui após o primeiro registro." />
          </div>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">Hora</th>
                  <th>Empresa</th>
                  <th>Método</th>
                  <th>Valor</th>
                  <th>Referência</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const needsReceipt = tx.payment_method === "credit" || tx.payment_method === "debit";
                  const hasReceipt = tx.receipt_count > 0;

                  return (
                    <tr key={tx.id} className="border-t border-slate-200">
                      <td className="py-2">{new Date(tx.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{tx.company_name}</td>
                      <td>{tx.payment_method.toUpperCase()}</td>
                      <td>{brl(tx.amount)}</td>
                      <td>{tx.ticket_reference ?? "-"}</td>
                      <td>
                        {!needsReceipt ? (
                          <span className="text-slate-500">Não obrigatório</span>
                        ) : hasReceipt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><HandCoins size={14} /> OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600"><Receipt size={14} /> Pendente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
