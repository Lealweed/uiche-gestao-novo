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
type SectionWarning = { section: string; message: string };

function brl(value: number) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function paymentMethodMeta(method: "pix" | "credit" | "debit" | "cash") {
  if (method === "credit") return { label: "Crédito", className: "rb-payment-badge rb-payment-credit" };
  if (method === "debit") return { label: "Débito", className: "rb-payment-badge rb-payment-debit" };
  if (method === "cash") return { label: "Dinheiro", className: "rb-payment-badge rb-payment-cash" };
  return { label: "PIX", className: "rb-payment-badge rb-payment-pix" };
}

export default function RebuildOperatorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sectionWarnings, setSectionWarnings] = useState<SectionWarning[]>([]);
  const [availability, setAvailability] = useState({
    operatorBooths: true,
    booths: true,
    companies: true,
    categories: true,
    subcategories: true,
    shifts: true,
    transactions: true,
    receipts: true,
    cashMovements: true,
  });

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

  function addWarning(section: string, message: string) {
    setSectionWarnings((prev) => {
      if (prev.some((item) => item.section === section && item.message === message)) return prev;
      return [...prev, { section, message }];
    });
  }

  function isMissingStructure(message: string) {
    const lower = message.toLowerCase();
    return lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find");
  }

  async function safeLoadArray<T>(
    section: string,
    promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
    onMissing?: () => void
  ) {
    const res = await promise;
    if (res.error) {
      addWarning(section, res.error.message);
      if (isMissingStructure(res.error.message)) onMissing?.();
      return [] as T[];
    }
    return (res.data ?? []) as T[];
  }

  async function loadTransactions(shiftId: string) {
    const txRes = await supabase
      .from("transactions")
      .select("id,amount,payment_method,sold_at,ticket_reference,note,company_id")
      .eq("shift_id", shiftId)
      .eq("status", "posted")
      .order("sold_at", { ascending: false })
      .limit(120);

    if (txRes.error) { addWarning("Lançamentos", txRes.error.message); if (isMissingStructure(txRes.error.message)) setAvailability((prev) => ({ ...prev, transactions: false })); setTransactions([]); return; }

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

    if (receiptRes.error) { addWarning("Comprovantes", receiptRes.error.message); if (isMissingStructure(receiptRes.error.message)) setAvailability((prev) => ({ ...prev, receipts: false })); }
    if (companyRes.error) { addWarning("Empresas", companyRes.error.message); if (isMissingStructure(companyRes.error.message)) setAvailability((prev) => ({ ...prev, companies: false })); }

    const receiptCountByTx = new Map<string, number>();
    for (const item of (receiptRes.data as Array<{ id: string; transaction_id: string }> | null) ?? []) {
      receiptCountByTx.set(item.transaction_id, (receiptCountByTx.get(item.transaction_id) ?? 0) + 1);
    }

    const companyNameById = new Map<string, string>(
      (((companyRes.data as Array<{ id: string; name: string }> | null) ?? []).map((c) => [c.id, c.name]))
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

    if (res.error) { addWarning("Caixa PDV", res.error.message); if (isMissingStructure(res.error.message)) setAvailability((prev) => ({ ...prev, cashMovements: false })); setCashMovements([]); return; }
    setCashMovements((res.data as CashMovement[] | null) ?? []);
  }

  async function bootstrap() {
    setLoading(true);
    setError(null);
    setAvailability({
      operatorBooths: true,
      booths: true,
      companies: true,
      categories: true,
      subcategories: true,
      shifts: true,
      transactions: true,
      receipts: true,
      cashMovements: true,
    });

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

      const typedProfile = profile as Profile;
      if (typedProfile.role === "admin") {
        router.replace("/rebuild/admin");
        return;
      }
      if (typedProfile.active === false) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setUserId(authUserId);

      setSectionWarnings([]);

      const [links, allBooths, loadedCompanies, loadedCategories, loadedSubcategories] = await Promise.all([
        safeLoadArray<BoothLink>("Guichês do operador", supabase.from("operator_booths").select("booth_id").eq("operator_id", authUserId).eq("active", true), () => setAvailability((prev) => ({ ...prev, operatorBooths: false }))),
        safeLoadArray<Booth>("Guichês", supabase.from("booths").select("id,name").eq("active", true), () => setAvailability((prev) => ({ ...prev, booths: false }))),
        safeLoadArray<Company>("Empresas", supabase.from("companies").select("id,name").eq("active", true).order("name"), () => setAvailability((prev) => ({ ...prev, companies: false }))),
        safeLoadArray<Category>("Categorias", supabase.from("transaction_categories").select("id,name").eq("active", true).order("name"), () => setAvailability((prev) => ({ ...prev, categories: false }))),
        safeLoadArray<Subcategory>("Subcategorias", supabase.from("transaction_subcategories").select("id,name,category_id").eq("active", true).order("name"), () => setAvailability((prev) => ({ ...prev, subcategories: false }))),
      ]);

      const shiftRes = await supabase.from("shifts").select("id,booth_id,status").eq("operator_id", authUserId).eq("status", "open").maybeSingle();
      if (shiftRes.error) {
        addWarning("Turno", shiftRes.error.message);
        if (isMissingStructure(shiftRes.error.message)) setAvailability((prev) => ({ ...prev, shifts: false }));
      }

      const boothMap = new Map(allBooths.map((b) => [b.id, b.name]));
      const hydratedBooths = links.map((l) => ({ booth_id: l.booth_id, booth_name: boothMap.get(l.booth_id) ?? l.booth_id }));

      setBooths(hydratedBooths);
      setBoothId(hydratedBooths[0]?.booth_id ?? "");
      setCompanies(loadedCompanies);
      setCategories(loadedCategories);
      setSubcategories(loadedSubcategories);

      const firstCategory = loadedCategories[0]?.id ?? "";
      setCategoryId(firstCategory);
      setSubcategoryId(loadedSubcategories.find((sub) => sub.category_id === firstCategory)?.id ?? "");

      const openShift = (shiftRes.data as Shift | null) ?? null;
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
    if (!userId) {
      setFeedback("Sessão inválida. Faça login novamente.");
      return;
    }

    if (!boothId) {
      setFeedback("Selecione um guichê para abrir o turno.");
      return;
    }

    setBusy("open-shift");
    setFeedback(null);

    const { data, error: rpcError } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });

    let newShift: Shift | null = null;
    if (rpcError) {
      const fallback = await supabase.from("shifts").insert({ booth_id: boothId, operator_id: userId, status: "open" }).select("id,booth_id,status").single();
      if (fallback.error) {
        setBusy(null);
        setFeedback(`Não foi possível abrir o turno: ${rpcError.message}. Fallback também falhou: ${fallback.error.message}`);
        return;
      }
      newShift = fallback.data as Shift;
      addWarning("Turno", "RPC open_shift indisponível. Foi usado fallback direto na tabela shifts.");
    } else {
      newShift = data as Shift;
    }

    if (!newShift) {
      setBusy(null);
      setFeedback("Não foi possível determinar o turno aberto.");
      return;
    }

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
      const fallback = await supabase.from("shifts").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", shift.id).eq("status", "open");
      if (fallback.error) {
        setBusy(null);
        setFeedback(`Não foi possível encerrar o turno: ${rpcError.message}. Fallback também falhou: ${fallback.error.message}`);
        return;
      }
      addWarning("Turno", "RPC close_shift indisponível. Foi usado fallback direto na tabela shifts.");
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

    if (!availability.transactions || !availability.companies || !availability.categories || !availability.subcategories) {
      setFeedback("Lançamentos indisponíveis até corrigir as tabelas base (transactions, companies, transaction_categories e transaction_subcategories). Consulte RECOVERY.md.");
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

    if (!availability.cashMovements) {
      setFeedback("Caixa PDV indisponível até corrigir a tabela cash_movements. Consulte RECOVERY.md.");
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
    if (!availability.receipts) {
      setFeedback("Comprovantes indisponíveis até corrigir a tabela transaction_receipts/bucket payment-receipts. Consulte RECOVERY.md.");
      return;
    }

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

      {sectionWarnings.length > 0 ? (
        <Card>
          <CardTitle>Avisos de recuperação</CardTitle>
          <CardDescription>Algumas seções operam com limitação até o banco estar completo.</CardDescription>
          <ul className="mt-3 list-disc pl-5 text-sm text-amber-700 space-y-1">
            {sectionWarnings.map((warning) => (
              <li key={`${warning.section}-${warning.message}`}>{warning.section}: {warning.message}</li>
            ))}
          </ul>
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
            <button className="btn-primary" disabled={busy === "open-shift" || booths.length === 0 || !availability.shifts} onClick={openShift}>
              {busy === "open-shift" ? "Abrindo..." : "Abrir turno"}
            </button>
          </div>
          {!availability.shifts ? (
            <p className="rb-card-description mt-3">Abertura de turno indisponível enquanto a tabela <code>shifts</code> não estiver disponível.</p>
          ) : booths.length === 0 ? (
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

      <section className="rb-operator-layout" aria-label="Fluxo operacional">
        <Card className="rb-operator-main">
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
              <button className="btn-primary" disabled={!shift || busy === "transaction" || !availability.transactions || !availability.companies || !availability.categories || !availability.subcategories}>
                {busy === "transaction" ? "Salvando..." : "Salvar lançamento"}
              </button>
            </div>
          </form>
        </Card>

        <Card className="rb-operator-side">
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
            <button className="btn-primary" disabled={!shift || busy === "cash" || !availability.cashMovements}>{busy === "cash" ? "Registrando..." : "Registrar"}</button>
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

      <Card className="rb-operator-feed">
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
          <div className="mt-4 rb-pending-feed">
            {pendingReceiptTxs.slice(0, 8).map((tx, idx) => {
              const payment = paymentMethodMeta(tx.payment_method);
              return (
                <div key={`pending-${tx.id}`} className="rb-pending-item">
                  <div className="rb-pending-dot" aria-hidden />
                  <div className="rb-pending-content">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{tx.company_name}</p>
                      <span className={payment.className}>{payment.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>{new Date(tx.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span>{brl(tx.amount)}</span>
                    </div>
                    <div className="mt-3">
                      <label className="btn-ghost cursor-pointer text-sm">
                        {uploadingTxId === tx.id ? "Enviando..." : "Anexar comprovante"}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingTxId === tx.id} onChange={(e) => uploadReceipt(tx.id, e)} />
                      </label>
                    </div>
                  </div>
                  {idx < Math.min(pendingReceiptTxs.length, 8) - 1 ? <div className="rb-pending-line" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="rb-operator-history">
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
          <div className="mt-4 rb-table-wrap">
            <table className="rb-table">
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
                      <td><span className={paymentMethodMeta(tx.payment_method).className}>{paymentMethodMeta(tx.payment_method).label}</span></td>
                      <td>{brl(tx.amount)}</td>
                      <td>{tx.ticket_reference ?? "-"}</td>
                      <td>
                        {!needsReceipt ? (
                          <span className="text-slate-500">Não obrigatório</span>
                        ) : hasReceipt ? (
                          <span className="rb-badge rb-badge-success inline-flex items-center gap-1"><HandCoins size={14} /> OK</span>
                        ) : (
                          <span className="rb-badge rb-badge-warning inline-flex items-center gap-1"><Receipt size={14} /> Pendente</span>
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















