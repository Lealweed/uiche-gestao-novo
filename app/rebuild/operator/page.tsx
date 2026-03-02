"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowDown, BanknoteArrowUp, CheckCircle2, Clock3, CreditCard, HandCoins, Receipt, RotateCcw, TriangleAlert, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { EmptyState } from "@/components/rebuild/ui/empty-state";
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { LoadingState } from "@/components/rebuild/ui/loading-state";
import { Card, CardDescription, CardTitle } from "@/components/rebuild/ui/card";

type Profile = { role: "tenant_admin" | "operator" | "financeiro" | "admin"; active?: boolean | null; tenant_id?: string | null; full_name?: string | null; user_id?: string };
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
  user_id: string | null;
};
type TimePunch = {
  id: string;
  punch_type: "entrada" | "pausa_inicio" | "pausa_fim" | "saida";
  punched_at: string;
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
type FeedbackTone = "success" | "error" | "info";

function brl(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentMethodMeta(method: "pix" | "credit" | "debit" | "cash") {
  if (method === "credit") return { label: "Crédito", className: "rb-payment-badge rb-payment-credit" };
  if (method === "debit") return { label: "Débito", className: "rb-payment-badge rb-payment-debit" };
  if (method === "cash") return { label: "Dinheiro", className: "rb-payment-badge rb-payment-cash" };
  return { label: "PIX", className: "rb-payment-badge rb-payment-pix" };
}

type OperatorSection = "resumo" | "lancamentos" | "caixa-pdv" | "ponto-digital" | "configuracoes";

export default function RebuildOperatorPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<OperatorSection>("resumo");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [txErrors, setTxErrors] = useState<Partial<Record<"amount" | "companyId" | "categoryId" | "subcategoryId", string>>>({});
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
    timePunches: true,
    shiftCashClosings: true,
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [booths, setBooths] = useState<Array<{ booth_id: string; booth_name: string }>>([]);
  const linkedBoothIds = useMemo(() => new Set(booths.map((b) => b.booth_id)), [booths]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [transactions, setTransactions] = useState<TxView[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [timePunches, setTimePunches] = useState<TimePunch[]>([]);

  const [boothId, setBoothId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit" | "debit" | "cash">("pix");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [cashType, setCashType] = useState<"suprimento" | "sangria" | "ajuste">("suprimento");
  const [cashDirection, setCashDirection] = useState<"entrada" | "saida">("entrada");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [cashFilterType, setCashFilterType] = useState<"" | "suprimento" | "sangria" | "ajuste">("");
  const [cashFilterFrom, setCashFilterFrom] = useState("");
  const [cashFilterTo, setCashFilterTo] = useState("");
  const [cashFilterText, setCashFilterText] = useState("");
  const [cashDeclared, setCashDeclared] = useState("");
  const [cashClosingNote, setCashClosingNote] = useState("");
  const [cashOperatorMap, setCashOperatorMap] = useState<Record<string, string>>({});
  const [uploadingTxId, setUploadingTxId] = useState<string | null>(null);
  const [txMethodFilter, setTxMethodFilter] = useState<"" | "pix" | "credit" | "debit" | "cash">("");
  const [txPeriodFilter, setTxPeriodFilter] = useState<"all" | "lastHour" | "today" | "custom">("all");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const receiptInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    return transactions.filter((tx) => {
      if (txMethodFilter && tx.payment_method !== txMethodFilter) return false;
      const soldAt = new Date(tx.sold_at);
      if (txPeriodFilter === "lastHour") {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        if (soldAt < oneHourAgo) return false;
      }
      if (txPeriodFilter === "today" && soldAt < startToday) return false;
      if (txPeriodFilter === "custom") {
        if (txDateFrom) {
          const from = new Date(txDateFrom);
          if (soldAt < from) return false;
        }
        if (txDateTo) {
          const to = new Date(txDateTo);
          if (soldAt > to) return false;
        }
      }
      return true;
    });
  }, [transactions, txMethodFilter, txPeriodFilter, txDateFrom, txDateTo]);

  const cashTotals = useMemo(() => {
    const suprimento = cashMovements.filter((m) => m.movement_type === "suprimento").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const sangria = cashMovements.filter((m) => m.movement_type === "sangria").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const ajuste = cashMovements.filter((m) => m.movement_type === "ajuste").reduce((acc, m) => acc + Number(m.amount || 0), 0);
    return { suprimento, sangria, ajuste, saldo: suprimento - sangria + ajuste + totals.cash };
  }, [cashMovements, totals.cash]);

  const dailyGoal = 5000;
  const goalProgress = Math.min(100, Math.round((totalSales / dailyGoal) * 100));

  useEffect(() => {
    const syncSectionFromHash = () => {
      const raw = window.location.hash.replace("#", "") as OperatorSection | "";
      const valid: OperatorSection[] = ["resumo", "lancamentos", "caixa-pdv", "ponto-digital", "configuracoes"];
      setActiveSection(valid.includes(raw as OperatorSection) ? (raw as OperatorSection) : "resumo");
    };
    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("rebuild:section-change", syncSectionFromHash as EventListener);
    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("rebuild:section-change", syncSectionFromHash as EventListener);
    };
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key === "1") { event.preventDefault(); setPaymentMethod("pix"); }
      if (event.key === "2") { event.preventDefault(); setPaymentMethod("credit"); }
      if (event.key === "3") { event.preventDefault(); setPaymentMethod("debit"); }
      if (event.key === "4") { event.preventDefault(); setPaymentMethod("cash"); }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const sideHistory = useMemo(() => {
    const txEntries = transactions.map((tx) => ({
      id: `tx-${tx.id}`,
      kind: "tx" as const,
      label: tx.company_name || "Lançamento",
      amount: Number(tx.amount || 0),
      signedAmount: Number(tx.amount || 0),
      payment: paymentMethodMeta(tx.payment_method).label,
      at: tx.sold_at,
    }));

    const cashEntries = cashMovements.map((mov) => ({
      id: `cash-${mov.id}`,
      kind: "cash" as const,
      label: mov.movement_type === "suprimento" ? "Suprimento" : mov.movement_type === "sangria" ? "Sangria" : "Ajuste",
      amount: Number(mov.amount || 0),
      signedAmount: mov.movement_type === "sangria" ? -Number(mov.amount || 0) : Number(mov.amount || 0),
      payment: "Caixa",
      at: mov.created_at,
    }));

    return [...txEntries, ...cashEntries]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [transactions, cashMovements]);

  function setFeedbackMessage(message: string, tone: FeedbackTone = "info") {
    setFeedbackTone(tone);
    setFeedback(message);
  }

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
      .select("id,movement_type,amount,note,created_at,user_id")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false })
      .limit(120);

    if (res.error) { addWarning("Caixa PDV", res.error.message); if (isMissingStructure(res.error.message)) setAvailability((prev) => ({ ...prev, cashMovements: false })); setCashMovements([]); return; }
    const loaded = (res.data as CashMovement[] | null) ?? [];
    setCashMovements(loaded);

    const operatorIds = Array.from(new Set(loaded.map((m) => m.user_id).filter(Boolean))) as string[];
    if (!operatorIds.length) {
      setCashOperatorMap({});
      return;
    }

    const profileRes = await supabase.from("profiles").select("user_id,full_name").in("user_id", operatorIds);
    if (profileRes.error) {
      addWarning("Caixa PDV", `Não foi possível carregar operadores dos movimentos: ${profileRes.error.message}`);
      setCashOperatorMap({});
      return;
    }

    const map: Record<string, string> = {};
    for (const row of ((profileRes.data as Array<{ user_id: string; full_name: string | null }> | null) ?? [])) {
      map[row.user_id] = row.full_name?.trim() || row.user_id.slice(0, 8);
    }
    setCashOperatorMap(map);
  }


  async function loadTimePunches() {
    if (!userId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const res = await supabase
      .from("time_punches")
      .select("id,punch_type,punched_at")
      .eq("user_id", userId)
      .gte("punched_at", today.toISOString())
      .order("punched_at", { ascending: false })
      .limit(80);

    if (res.error) {
      addWarning("Ponto Digital", res.error.message);
      if (isMissingStructure(res.error.message)) setAvailability((prev) => ({ ...prev, timePunches: false }));
      setTimePunches([]);
      return;
    }

    setTimePunches((res.data as TimePunch[] | null) ?? []);
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
      timePunches: true,
      shiftCashClosings: true,
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
      if (typedProfile.role === "tenant_admin" || typedProfile.role === "admin" || typedProfile.role === "financeiro") {
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
        await Promise.all([loadTransactions(openShift.id), loadCashMovements(openShift.id), loadTimePunches()]);
      } else {
        setTransactions([]);
        setCashMovements([]);
        await loadTimePunches();
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
      setFeedbackMessage("Sessão inválida. Faça login novamente.", "error");
      return;
    }

    if (shift) {
      setFeedbackMessage("Já existe um turno aberto. Encerre o turno atual antes de abrir outro.", "error");
      return;
    }

    if (!boothId) {
      setFeedbackMessage("Selecione um guichê para abrir o turno.", "error");
      return;
    }

    if (!linkedBoothIds.has(boothId)) {
      setFeedbackMessage("O guichê selecionado não está vinculado ao seu usuário. Solicite ajuste ao administrador.", "error");
      return;
    }

    setBusy("open-shift");
    setFeedback(null);

    const existingOpenShift = await supabase
      .from("shifts")
      .select("id,booth_id,status")
      .eq("operator_id", userId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1);

    if (existingOpenShift.error) {
      setBusy(null);
      setFeedbackMessage(`Não foi possível validar turno existente: ${existingOpenShift.error.message}`, "error");
      return;
    }

    const existingShift = ((existingOpenShift.data as Shift[] | null) ?? [])[0] ?? null;
    if (existingShift) {
      setShift(existingShift);
      await Promise.all([loadTransactions(existingShift.id), loadCashMovements(existingShift.id), loadTimePunches()]);
      setBusy(null);
      setFeedbackMessage("Você já possui um turno aberto e ele foi retomado automaticamente.", "info");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });

    let newShift: Shift | null = null;
    if (rpcError) {
      const fallback = await supabase.from("shifts").insert({ booth_id: boothId, operator_id: userId, status: "open" }).select("id,booth_id,status").single();
      if (fallback.error) {
        setBusy(null);
        setFeedbackMessage(`Não foi possível abrir o turno: ${rpcError.message}. Fallback também falhou: ${fallback.error.message}`, "error");
        return;
      }
      newShift = fallback.data as Shift;
      addWarning("Turno", "RPC open_shift indisponível. Foi usado fallback direto na tabela shifts.");
    } else {
      newShift = data as Shift;
    }

    if (!newShift) {
      setBusy(null);
      setFeedbackMessage("Não foi possível determinar o turno aberto.", "error");
      return;
    }

    setShift(newShift);
    await Promise.all([loadTransactions(newShift.id), loadCashMovements(newShift.id), loadTimePunches()]);

    setBusy(null);
    setFeedbackMessage("Turno aberto com sucesso.", "success");
  }

  async function closeShift() {
    if (!shift) return;

    const pendencias = pendingReceiptTxs.length;
    if (pendencias > 0) {
      setFeedbackMessage(`Fechamento bloqueado: existem ${pendencias} lançamento(s) de cartão sem comprovante. Anexe os comprovantes pendentes para continuar.`, "error");
      return;
    }

    setBusy("close-shift");
    setFeedback(null);

    const notes = closeNotes.trim() || null;
    const { error: rpcError } = await supabase.rpc("close_shift", { p_shift_id: shift.id, p_ip: null, p_notes: notes });

    if (rpcError) {
      const fallback = await supabase.from("shifts").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", shift.id).eq("status", "open");
      if (fallback.error) {
        setBusy(null);
        setFeedbackMessage(`Não foi possível encerrar o turno: ${rpcError.message}. Fallback também falhou: ${fallback.error.message}`, "error");
        return;
      }
      addWarning("Turno", "RPC close_shift indisponível. Foi usado fallback direto na tabela shifts.");
    }

    setShift(null);
    setTransactions([]);
    setCashMovements([]);
    setShowCloseModal(false);
    setCloseNotes("");
    await loadTimePunches();
    setBusy(null);
    setFeedbackMessage("Turno encerrado com sucesso.", "success");
  }

  function requestCloseShift() {
    if (!shift) {
      setFeedbackMessage("Nenhum turno aberto para encerrar.", "error");
      return;
    }
    if (pendingReceiptTxs.length > 0) {
      setFeedbackMessage(`Fechamento bloqueado: existem ${pendingReceiptTxs.length} comprovante(s) de cartão pendente(s).`, "error");
    }
    setShowCloseModal(true);
  }

  async function submitTransaction(e: FormEvent) {
    e.preventDefault();

    if (!shift || !userId) {
      setFeedbackMessage("Abra um turno para lançar vendas.", "error");
      return;
    }

    if (!availability.transactions || !availability.companies || !availability.categories || !availability.subcategories) {
      setFeedbackMessage("Lançamentos indisponíveis até corrigir as tabelas base (transactions, companies, transaction_categories e transaction_subcategories). Consulte RECOVERY.md.", "error");
      return;
    }

    const nextErrors: Partial<Record<"amount" | "companyId" | "categoryId" | "subcategoryId", string>> = {};
    if (!amount) nextErrors.amount = "Informe o valor da transação.";
    if (!companyId) nextErrors.companyId = "Selecione a empresa/fornecedor.";
    if (!categoryId) nextErrors.categoryId = "Selecione a categoria.";
    if (!subcategoryId) nextErrors.subcategoryId = "Selecione a subcategoria.";

    const parsedAmount = Number(amount);
    if (amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      nextErrors.amount = "Informe um valor válido maior que zero.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setTxErrors(nextErrors);
      setFeedbackMessage("Revise os campos obrigatórios destacados para continuar.", "error");
      return;
    }

    if (reference.trim().length > 60) {
      setFeedbackMessage("A referência deve ter no máximo 60 caracteres.", "error");
      return;
    }

    if (note.trim().length > 280) {
      setFeedbackMessage("A observação deve ter no máximo 280 caracteres.", "error");
      return;
    }

    setTxErrors({});
    setBusy("transaction");
    setFeedback(null);

    const insertRes = await supabase.from("transactions").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: companyId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      payment_method: paymentMethod,
      amount: parsedAmount,
      ticket_reference: reference.trim() || null,
      note: note.trim() || null,
      commission_percent: null,
    }).select("id").single();

    if (insertRes.error || !insertRes.data?.id) {
      setBusy(null);
      setFeedbackMessage(`Falha ao salvar lançamento: ${insertRes.error?.message || "ID não retornado."}`, "error");
      return;
    }

    if (receiptFile) {
      const uploaded = await uploadReceiptFile(insertRes.data.id, receiptFile);
      if (!uploaded.ok) {
        setBusy(null);
        setFeedbackMessage(uploaded.message, "error");
        return;
      }
    }

    setAmount("");
    setReference("");
    setNote("");
    setReceiptFile(null);
    await loadTransactions(shift.id);

    setBusy(null);
    setFeedbackMessage("Lançamento registrado com sucesso.", "success");
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

    const parsedCashAmount = Number(cashAmount);
    if (!Number.isFinite(parsedCashAmount) || parsedCashAmount <= 0) {
      setFeedback("Informe um valor de caixa válido maior que zero.");
      return;
    }

    if (cashNote.trim().length > 180) {
      setFeedback("A observação do caixa deve ter no máximo 180 caracteres.");
      return;
    }

    setBusy("cash");
    setFeedback(null);

    const signedAmount = cashType === "ajuste" ? (cashDirection === "saida" ? -parsedCashAmount : parsedCashAmount) : parsedCashAmount;

    const { error: insertError } = await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      user_id: userId,
      movement_type: cashType,
      amount: signedAmount,
      note: cashNote.trim() || null,
    });

    if (insertError) {
      setBusy(null);
      setFeedback(`Falha ao registrar caixa: ${insertError.message}`);
      return;
    }

    setCashAmount("");
    setCashNote("");
    setCashDirection("entrada");
    await loadCashMovements(shift.id);

    setBusy(null);
    setFeedback("Movimento de caixa registrado.");
  }



  const cashSummary = useMemo(() => {
    const initialBalance = Number(totals.cash || 0);
    let entries = 0;
    let exits = 0;

    for (const m of cashMovements) {
      const amount = Number(m.amount || 0);
      if (m.movement_type === "sangria") exits += Math.abs(amount);
      else if (m.movement_type === "ajuste") {
        if (amount >= 0) entries += amount;
        else exits += Math.abs(amount);
      } else {
        entries += Math.abs(amount);
      }
    }

    const currentBalance = initialBalance + entries - exits;
    return { initialBalance, entries, exits, currentBalance };
  }, [cashMovements, totals.cash]);

  const filteredCashMovements = useMemo(() => {
    const term = cashFilterText.trim().toLowerCase();
    return cashMovements.filter((m) => {
      if (cashFilterType && m.movement_type !== cashFilterType) return false;
      const created = new Date(m.created_at);
      if (cashFilterFrom) {
        const from = new Date(cashFilterFrom);
        if (created < from) return false;
      }
      if (cashFilterTo) {
        const to = new Date(cashFilterTo);
        if (created > to) return false;
      }
      if (term && !(m.note || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [cashMovements, cashFilterType, cashFilterFrom, cashFilterTo, cashFilterText]);

  const cashExpected = cashSummary.currentBalance;
  const cashDeclaredValue = Number(cashDeclared || 0);
  const cashDifference = cashDeclared ? cashDeclaredValue - cashExpected : 0;
  const cashDifferenceOk = Math.abs(cashDifference) < 0.01;

  async function submitCashClosing(e: FormEvent) {
    e.preventDefault();

    if (!shift || !userId) return setFeedbackMessage("Abra um turno para registrar o fechamento de caixa.", "error");
    if (!cashDeclared) return setFeedbackMessage("Informe o valor declarado para fechar o caixa.", "error");

    const parsedDeclared = Number(cashDeclared);
    if (!Number.isFinite(parsedDeclared) || parsedDeclared < 0) return setFeedbackMessage("Informe um valor declarado válido.", "error");

    setBusy("cash-closing");
    const payload = {
      shift_id: shift.id,
      booth_id: shift.booth_id,
      user_id: userId,
      expected_cash: cashExpected,
      declared_cash: parsedDeclared,
      difference: parsedDeclared - cashExpected,
      note: cashClosingNote.trim() || null,
    };

    const res = await supabase.from("shift_cash_closings").upsert(payload, { onConflict: "shift_id" });
    if (res.error) {
      if (isMissingStructure(res.error.message)) {
        setAvailability((prev) => ({ ...prev, shiftCashClosings: false }));
        addWarning("Fechamento de caixa", "Tabela shift_cash_closings indisponível. O cálculo do fechamento continua disponível em tela.");
        setFeedbackMessage(`Fechamento calculado (diferença ${brl(parsedDeclared - cashExpected)}), mas não foi possível persistir agora.`, "info");
      } else {
        setFeedbackMessage(`Erro ao salvar fechamento de caixa: ${res.error.message}`, "error");
      }
      setBusy(null);
      return;
    }

    setBusy(null);
    setFeedbackMessage("Fechamento de caixa salvo com sucesso.", "success");
  }

  async function registerPunch(type: "entrada" | "pausa_inicio" | "pausa_fim" | "saida") {
    if (!userId) return;
    setBusy(`punch-${type}`);
    const payload = {
      user_id: userId,
      booth_id: shift?.booth_id ?? null,
      shift_id: shift?.id ?? null,
      punch_type: type,
      punched_at: new Date().toISOString(),
    };
    const res = await supabase.from("time_punches").insert(payload);
    setBusy(null);
    if (res.error) {
      setFeedback(`Não foi possível registrar ponto (${type}): ${res.error.message}`);
      return;
    }
    await loadTimePunches();
    setFeedback(`Ponto registrado: ${type}.`);
  }


  async function uploadReceiptFile(txId: string, file: File) {
    if (!userId) return { ok: false, message: "Sessão inválida. Faça login novamente." };
    if (!availability.receipts) {
      return { ok: false, message: "Comprovantes indisponíveis até corrigir transaction_receipts/payment-receipts. Consulte RECOVERY.md." };
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${txId}.${ext}`;

    const upload = await supabase.storage.from("payment-receipts").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (upload.error) {
      return { ok: false, message: `Falha no upload do comprovante: ${upload.error.message}` };
    }

    const register = await supabase.from("transaction_receipts").upsert({
      transaction_id: txId,
      storage_path: path,
      mime_type: file.type || "image/jpeg",
      uploaded_by: userId,
    });

    if (register.error) {
      return { ok: false, message: `Falha ao registrar comprovante: ${register.error.message}` };
    }

    return { ok: true, message: "Comprovante enviado com sucesso." };
  }

  async function uploadReceipt(txId: string, ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;

    setUploadingTxId(txId);
    setFeedback(null);

    const uploaded = await uploadReceiptFile(txId, file);

    if (!uploaded.ok) {
      setUploadingTxId(null);
      setFeedback(uploaded.message);
      return;
    }

    if (shift) await loadTransactions(shift.id);
    setUploadingTxId(null);
    setFeedback(uploaded.message);
  }

  function triggerReceiptReupload(txId: string) {
    const target = receiptInputRefs.current[txId];
    target?.click();
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

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`btn-ghost ${activeSection === "resumo" ? "ring-1 ring-blue-400" : ""}`} onClick={() => { window.location.hash = "resumo"; }}>Resumo do Turno</button>
        <button className={`btn-ghost ${activeSection === "lancamentos" ? "ring-1 ring-blue-400" : ""}`} onClick={() => { window.location.hash = "lancamentos"; }}>Lançamentos</button>
        <button className={`btn-ghost ${activeSection === "caixa-pdv" ? "ring-1 ring-blue-400" : ""}`} onClick={() => { window.location.hash = "caixa-pdv"; }}>Caixa PDV</button>
        <button className={`btn-ghost ${activeSection === "ponto-digital" ? "ring-1 ring-blue-400" : ""}`} onClick={() => { window.location.hash = "ponto-digital"; }}>Ponto Digital</button>
        <button className={`btn-ghost ${activeSection === "configuracoes" ? "ring-1 ring-blue-400" : ""}`} onClick={() => { window.location.hash = "configuracoes"; }}>Configurações</button>
      </div>

      <div className={activeSection === "resumo" ? "block" : "hidden"}>
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
          <p className={`rb-card-description ${feedbackTone === "error" ? "text-rose-700" : feedbackTone === "success" ? "text-emerald-700" : "text-slate-700"}`} style={{ marginTop: 0 }}>
            {feedback}
          </p>
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
            <button className="btn-ghost" disabled={busy === "close-shift"} onClick={requestCloseShift}>
              {busy === "close-shift" ? "Encerrando..." : "Encerrar turno"}
            </button>
          </div>
        </Card>
      )}

      <section className="rb-operator-layout" aria-label="Fluxo operacional">
        <Card className="rb-operator-main">
          <CardTitle>Novo Lançamento</CardTitle>
          <CardDescription>Preencha os dados da transação e registre no turno atual.</CardDescription>

          <form onSubmit={submitTransaction} className="mt-4 space-y-3">
            <label className="rb-form-label">Valor da transação</label>
            <input className={`field ${txErrors.amount ? "border-rose-400" : ""}`} type="number" min="0" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setTxErrors((prev) => ({ ...prev, amount: undefined })); }} placeholder="R$ 0,00" required />
            {txErrors.amount ? <p className="text-xs text-rose-600 mt-1">{txErrors.amount}</p> : null}

            <label className="rb-form-label">Empresa / Fornecedor</label>
            <select className={`field ${txErrors.companyId ? "border-rose-400" : ""}`} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setTxErrors((prev) => ({ ...prev, companyId: undefined })); }} required>
              <option value="">Selecione a empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {txErrors.companyId ? <p className="text-xs text-rose-600 mt-1">{txErrors.companyId}</p> : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="rb-form-label">Categoria</label>
                <select
                  className={`field ${txErrors.categoryId ? "border-rose-400" : ""}`}
                  value={categoryId}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setCategoryId(nextCategory);
                    setTxErrors((prev) => ({ ...prev, categoryId: undefined, subcategoryId: undefined }));
                    setSubcategoryId(subcategories.find((s) => s.category_id === nextCategory)?.id ?? "");
                  }}
                  required
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {txErrors.categoryId ? <p className="text-xs text-rose-600 mt-1">{txErrors.categoryId}</p> : null}
              </div>

              <div>
                <label className="rb-form-label">Subcategoria</label>
                <select className={`field ${txErrors.subcategoryId ? "border-rose-400" : ""}`} value={subcategoryId} onChange={(e) => { setSubcategoryId(e.target.value); setTxErrors((prev) => ({ ...prev, subcategoryId: undefined })); }} required>
                  <option value="">Selecione a subcategoria</option>
                  {filteredSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {txErrors.subcategoryId ? <p className="text-xs text-rose-600 mt-1">{txErrors.subcategoryId}</p> : null}
              </div>
            </div>

            <label className="rb-form-label">Ref / Reserva</label>
            <input className="field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex.: RES-10293" />

            <label className="rb-form-label">Método de pagamento</label>
            <p className="text-xs text-slate-500 -mt-1">Atalhos: Alt+1 PIX • Alt+2 Crédito • Alt+3 Débito • Alt+4 Dinheiro</p>
            <div className="rb-pay-methods">
              {([
                { id: "pix", label: "PIX" },
                { id: "credit", label: "Crédito" },
                { id: "debit", label: "Débito" },
                { id: "cash", label: "Dinheiro" },
              ] as const).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPaymentMethod(item.id)}
                  className={`rb-pay-chip ${paymentMethod === item.id ? "is-active" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="rb-upload-highlight">
              <p className="rb-form-label">Comprovante (opcional no lançamento)</p>
              <label className="btn-ghost cursor-pointer text-sm inline-flex items-center gap-2">
                <Receipt size={14} /> {receiptFile ? receiptFile.name : "Selecionar comprovante"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              </label>
              {pendingReceiptTxs.length > 0 ? <p className="text-xs text-amber-700 mt-2">Pendências de cartão: {pendingReceiptTxs.length}</p> : null}
            </div>

            <label className="rb-form-label">Observações</label>
            <textarea className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação" rows={3} />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setAmount(""); setReference(""); setNote(""); setReceiptFile(null); setTxErrors({}); }}
              >
                Limpar
              </button>
              <button className="btn-primary" disabled={!shift || busy === "transaction" || !availability.transactions || !availability.companies || !availability.categories || !availability.subcategories}>
                {busy === "transaction" ? "Registrando..." : "Registrar Lançamento"}
              </button>
            </div>
          </form>
        </Card>

        <aside className="rb-operator-side">
          <Card>
            <CardTitle>Saldo em Caixa</CardTitle>
            <CardDescription>Controle do turno atual.</CardDescription>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Saldo atual</p>
              <p className="text-2xl font-extrabold text-slate-900">{brl(cashTotals.saldo)}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={() => setCashType("suprimento")}>Suprimento</button>
              <button type="button" className="btn-ghost text-sm" onClick={() => setCashType("sangria")}>Sangria</button>
              <button type="button" className="btn-ghost text-sm" onClick={requestCloseShift} disabled={!shift || busy === "close-shift"}>Fechar</button>
            </div>
            <form onSubmit={submitCashMovement} className="mt-3 space-y-2">
              <input className="field" type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Valor" disabled={!shift} />
              <input className="field" value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Observação" disabled={!shift} />
              <button className="btn-primary w-full" disabled={!shift || busy === "cash" || !availability.cashMovements}>{busy === "cash" ? "Registrando..." : `Registrar ${cashType}`}</button>
            </form>
          </Card>

          <Card>
            <CardTitle>Histórico do Turno</CardTitle>
            <CardDescription>Movimentos recentes com valores positivos e negativos.</CardDescription>
            <div className="mt-3 space-y-2 max-h-[280px] overflow-auto pr-1">
              {sideHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Sem movimentos no turno.</p>
              ) : sideHistory.map((item) => (
                <div key={item.id} className="rb-side-history-item">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{new Date(item.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {item.payment}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.signedAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {item.signedAmount >= 0 ? "+" : "-"}{brl(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rb-goal-card">
            <CardTitle>Meta diária</CardTitle>
            <CardDescription>{brl(totalSales)} de {brl(dailyGoal)}</CardDescription>
            <div className="rb-goal-track mt-3">
              <div className="rb-goal-fill" style={{ width: `${goalProgress}%` }} />
            </div>
            <p className="text-xs text-slate-600 mt-2">{goalProgress}% da meta concluída</p>
          </Card>
        </aside>
      </section>
      </div>

      {activeSection === "caixa-pdv" && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Caixa PDV avançado</CardTitle>
            <CardDescription>Resumo financeiro do caixa com filtros, histórico completo e ação rápida.</CardDescription>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
              <StatCard label="Saldo inicial" value={brl(cashSummary.initialBalance)} icon={<Wallet size={16} />} />
              <StatCard label="Entradas" value={brl(cashSummary.entries)} icon={<BanknoteArrowUp size={16} />} />
              <StatCard label="Saídas" value={brl(cashSummary.exits)} icon={<BanknoteArrowDown size={16} />} />
              <StatCard label="Saldo atual" value={brl(cashSummary.currentBalance)} icon={<HandCoins size={16} />} />
            </div>

            <div className="mt-4 grid lg:grid-cols-[1.2fr_2fr] gap-3">
              <form onSubmit={submitCashMovement} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-semibold text-slate-800">Ação rápida de movimento</p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className={`btn-ghost text-sm ${cashType === "suprimento" ? "ring-1 ring-blue-400" : ""}`} onClick={() => setCashType("suprimento")}>Suprimento</button>
                  <button type="button" className={`btn-ghost text-sm ${cashType === "sangria" ? "ring-1 ring-blue-400" : ""}`} onClick={() => setCashType("sangria")}>Sangria</button>
                  <button type="button" className={`btn-ghost text-sm ${cashType === "ajuste" ? "ring-1 ring-blue-400" : ""}`} onClick={() => setCashType("ajuste")}>Ajuste</button>
                </div>
                {cashType === "ajuste" ? (
                  <select className="field" value={cashDirection} onChange={(e) => setCashDirection(e.target.value as "entrada" | "saida")}>
                    <option value="entrada">Ajuste + (entrada)</option>
                    <option value="saida">Ajuste - (saída)</option>
                  </select>
                ) : null}
                <input className="field" type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Valor (obrigatório > 0)" disabled={!shift} />
                <input className="field" value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Observação" disabled={!shift} />
                <button className="btn-primary w-full" disabled={!shift || busy === "cash" || !availability.cashMovements}>{busy === "cash" ? "Registrando..." : "Registrar movimento"}</button>
              </form>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-semibold text-slate-800">Filtros do histórico</p>
                <div className="grid md:grid-cols-4 gap-2">
                  <select className="field" value={cashFilterType} onChange={(e) => setCashFilterType(e.target.value as "" | "suprimento" | "sangria" | "ajuste")}>
                    <option value="">Todos os tipos</option>
                    <option value="suprimento">Suprimento</option>
                    <option value="sangria">Sangria</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                  <input className="field" type="datetime-local" value={cashFilterFrom} onChange={(e) => setCashFilterFrom(e.target.value)} />
                  <input className="field" type="datetime-local" value={cashFilterTo} onChange={(e) => setCashFilterTo(e.target.value)} />
                  <input className="field" value={cashFilterText} onChange={(e) => setCashFilterText(e.target.value)} placeholder="Filtrar por observação" />
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-auto max-h-[380px] rounded-xl border border-slate-200">
              <table className="w-full text-sm min-w-[760px]">
                <thead><tr className="text-slate-500 bg-slate-50"><th className="text-left py-2 px-3">Data/hora</th><th className="text-left">Tipo</th><th className="text-right">Valor</th><th className="text-left">Observação</th><th className="text-left pr-3">Operador</th></tr></thead>
                <tbody>
                  {filteredCashMovements.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 px-3 text-slate-500">Nenhum movimento encontrado com os filtros atuais.</td></tr>
                  ) : filteredCashMovements.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-2 px-3">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                      <td className="capitalize">{m.movement_type}</td>
                      <td className={`text-right font-semibold ${Number(m.amount || 0) < 0 ? "text-rose-600" : "text-emerald-700"}`}>{brl(Number(m.amount || 0))}</td>
                      <td>{m.note || "-"}</td>
                      <td className="pr-3">{(m.user_id && cashOperatorMap[m.user_id]) || (m.user_id === userId ? "Você" : "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle>Fechamento de caixa</CardTitle>
            <CardDescription>Registre o valor declarado e valide automaticamente a diferença do turno.</CardDescription>
            <form className="mt-3 grid lg:grid-cols-2 gap-3" onSubmit={submitCashClosing}>
              <div className="space-y-2">
                <input className="field" type="number" min="0" step="0.01" placeholder="Valor declarado" value={cashDeclared} onChange={(e) => setCashDeclared(e.target.value)} />
                <textarea className="field" rows={3} placeholder="Observação do fechamento" value={cashClosingNote} onChange={(e) => setCashClosingNote(e.target.value)} />
                <button className="btn-primary" disabled={!shift || busy === "cash-closing"}>{busy === "cash-closing" ? "Salvando..." : "Salvar fechamento"}</button>
                {!availability.shiftCashClosings ? <p className="text-xs text-amber-700">Persistência indisponível no momento (tabela <code>shift_cash_closings</code>). O cálculo segue disponível sem quebrar a tela.</p> : null}
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Esperado</span><b>{brl(cashExpected)}</b></div>
                <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Declarado</span><b>{brl(cashDeclared ? cashDeclaredValue : 0)}</b></div>
                <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Diferença</span><b className={cashDifferenceOk ? "text-emerald-700" : "text-amber-700"}>{brl(cashDifference)}</b></div>
                <div className={`rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 ${cashDifferenceOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                  {cashDifferenceOk ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} Status: {cashDifferenceOk ? "OK" : "Atenção"}
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}


      {activeSection === "lancamentos" && (
        <Card>
          <CardTitle>Transações do Turno</CardTitle>
          <CardDescription>Lista completa de lançamentos do operador com filtros por método e período do turno.</CardDescription>
          <div className="mt-3 grid md:grid-cols-4 gap-2">
            <select className="field" value={txMethodFilter} onChange={(e) => setTxMethodFilter(e.target.value as "" | "pix" | "credit" | "debit" | "cash")}>
              <option value="">Todos os métodos</option>
              <option value="pix">PIX</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
              <option value="cash">Dinheiro</option>
            </select>
            <select className="field" value={txPeriodFilter} onChange={(e) => setTxPeriodFilter(e.target.value as "all" | "lastHour" | "today" | "custom")}>
              <option value="all">Período: turno inteiro</option>
              <option value="lastHour">Última hora</option>
              <option value="today">Hoje</option>
              <option value="custom">Intervalo personalizado</option>
            </select>
            <input className="field" type="datetime-local" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} disabled={txPeriodFilter !== "custom"} />
            <input className="field" type="datetime-local" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} disabled={txPeriodFilter !== "custom"} />
          </div>
          <div className="mt-4 overflow-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-500"><th className="text-left py-2">Data</th><th className="text-left">Empresa</th><th className="text-left">Pagamento</th><th className="text-right">Valor</th><th className="text-left">Comprovante</th><th className="text-left">Ação</th></tr></thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-t">
                    <td className="py-2">{new Date(tx.sold_at).toLocaleString("pt-BR")}</td>
                    <td>{tx.company_name}</td>
                    <td>{paymentMethodMeta(tx.payment_method).label}</td>
                    <td className="text-right">{brl(Number(tx.amount || 0))}</td>
                    <td>{tx.receipt_count > 0 ? "OK" : "Pendente"}</td>
                    <td>
                      {tx.receipt_count > 0 ? (
                        <span className="text-slate-400 text-xs">-</span>
                      ) : (
                        <>
                          <button type="button" className="btn-ghost text-xs" onClick={() => triggerReceiptReupload(tx.id)}>
                            Reenviar comprovante
                          </button>
                          <input
                            ref={(el) => { receiptInputRefs.current[tx.id] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => uploadReceipt(tx.id, e)}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeSection === "ponto-digital" && (
        <Card>
          <CardTitle>Ponto Digital</CardTitle>
          <CardDescription>Registro rápido de jornada e histórico operacional do turno.</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => registerPunch("entrada")} disabled={busy === "punch-entrada"}>Entrada</button>
            <button className="btn-ghost" onClick={() => registerPunch("pausa_inicio")} disabled={busy === "punch-pausa_inicio"}>Pausa início</button>
            <button className="btn-ghost" onClick={() => registerPunch("pausa_fim")} disabled={busy === "punch-pausa_fim"}>Pausa fim</button>
            <button className="btn-ghost" onClick={() => registerPunch("saida")} disabled={busy === "punch-saida"}>Saída</button>
          </div>
          <div className="mt-4 rounded-lg border p-3">
            <p className="text-sm font-semibold text-slate-800">Histórico do dia</p>
            {timePunches.length === 0 ? (
              <p className="text-xs text-slate-500 mt-2">Nenhuma batida registrada hoje.</p>
            ) : (
              <ul className="mt-2 space-y-2 max-h-[260px] overflow-auto pr-1">
                {timePunches.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm border-b pb-1">
                    <span className="font-medium text-slate-700">{p.punch_type.replace("_", " ")}</span>
                    <span className="text-xs text-slate-500">{new Date(p.punched_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">As batidas de ponto ficam disponíveis para o painel administrativo.</p>
        </Card>
      )}

      {showCloseModal && shift && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">Fechamento de turno</h3>
            <p className="text-sm text-slate-400 mt-1">Confira o resumo final antes de encerrar.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">PIX</p><p className="font-semibold text-slate-100">{brl(totals.pix)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Crédito</p><p className="font-semibold text-slate-100">{brl(totals.credit)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Débito</p><p className="font-semibold text-slate-100">{brl(totals.debit)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Dinheiro</p><p className="font-semibold text-slate-100">{brl(totals.cash)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Saldo de caixa</p><p className="font-semibold text-slate-100">{brl(cashTotals.saldo)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Suprimento</p><p className="font-semibold text-slate-100">{brl(cashTotals.suprimento)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Sangria</p><p className="font-semibold text-slate-100">{brl(cashTotals.sangria)}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-slate-400">Pendências</p><p className={`font-semibold ${pendingReceiptTxs.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>{pendingReceiptTxs.length}</p></div>
            </div>
            <textarea className="field mt-4" placeholder="Observações de fechamento (opcional)" rows={3} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowCloseModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={closeShift} disabled={busy === "close-shift" || pendingReceiptTxs.length > 0}>{busy === "close-shift" ? "Encerrando..." : "Confirmar encerramento"}</button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "configuracoes" && (
        <Card>
          <CardTitle>Configurações do Operador</CardTitle>
          <CardDescription>Dados de perfil e vínculo operacional.</CardDescription>
          <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3"><p className="text-slate-500">Usuário</p><p className="font-semibold">{userId || "-"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-slate-500">Guichês vinculados</p><p className="font-semibold">{booths.length}</p></div>
            <div className="rounded-lg border p-3 md:col-span-2"><p className="text-slate-500">Lista de guichês</p><p className="font-semibold">{booths.map((b) => b.booth_name).join(", ") || "Nenhum guichê vinculado"}</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}


































