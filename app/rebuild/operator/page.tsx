"use client";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminArea, getHomeRouteForRole } from "@/lib/rbac";
import { tolerantData, isSchemaToleranceError } from "@/lib/schema-tolerance";
import { OperatorPunchSection } from "@/components/rebuild/operator/operator-punch-section";
import { OperatorSummarySection } from "@/components/rebuild/operator/operator-summary-section";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Card, CardTitle } from "@/components/rebuild/ui/card";
import { Select, Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge, PaymentBadge } from "@/components/rebuild/ui/badge";
import { Toast } from "@/components/rebuild/ui/toast";
import { Plus, RefreshCw, Banknote, CreditCard, Clock, AlertTriangle, Delete, Send, MessageSquare, Link2, Smartphone, Wallet, MapPin, Settings, X, Check, ChevronRight, Bell } from "lucide-react";

const supabase = createClient();

type Option     = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null };
type Category   = { id: string; name: string };
type Subcategory= { id: string; name: string; category_id: string };
type Shift      = { id: string; booth_id: string; status: "open" | "closed" };
type Tx = { id: string; amount: number; payment_method: "pix"|"credit"|"debit"|"cash"; sold_at: string; ticket_reference: string|null; note: string|null; company_id: string|null; company_name: string; receipt_count: number; boarding_tax_state: number; boarding_tax_federal: number };
type BoothLink  = { booth_id: string; booth_name: string };
type Punch      = { id: string; punch_type: "entrada"|"saida"|"pausa_inicio"|"pausa_fim"; punched_at: string; note: string|null };
type CashMovement={ id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string; user_name?: string };
type TaxaEmbarque = { id: string; name: string; amount: number; tax_type: "estadual" | "federal"; active: boolean };
type LastCloseResult = {
  expectedCash: number;
  declaredCash: number;
  difference: number;
  note: string | null;
  closedAt: string;
};

const DEFAULT_BOARDING_TAXES: TaxaEmbarque[] = [
  { id: "fallback-goiania", name: "Goiania", amount: 8.5, tax_type: "estadual", active: true },
  { id: "fallback-belem", name: "Belem", amount: 12, tax_type: "estadual", active: true },
];

function getCompanyPct(c: Option) { return Number(c.commission_percent ?? c.comission_percent ?? 0); }

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function parseMoneyInput(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

function hasNativeInputFocus(element: EventTarget | null) {
  if (typeof document === "undefined") return false;
  const activeElement = element as HTMLElement | null;
  if (!activeElement || activeElement === document.body) return false;

  const tagName = activeElement.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || activeElement.isContentEditable;
}

export default function OperatorRebuildPage() {
  const router = useRouter();
  const [userId, setUserId]             = useState<string|null>(null);
  const [operatorActive, setOperatorActive] = useState<boolean|null>(null);
  const [shift, setShift]               = useState<Shift|null>(null);
  const [companies, setCompanies]       = useState<Option[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [booths, setBooths]             = useState<BoothLink[]>([]);
  const [boothId, setBoothId]           = useState("");
  const [companyId, setCompanyId]       = useState("");
  const [categoryId, setCategoryId]     = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [amount, setAmount]             = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix"|"credit"|"debit"|"cash">("pix");
  const [ticketReference, setTicketReference] = useState("");
  const [note, setNote]                 = useState("");
  const [message, setMessage]           = useState<string|null>(null);
  const [txs, setTxs]                   = useState<Tx[]>([]);
  const [punches, setPunches]           = useState<Punch[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashType, setCashType]         = useState<"suprimento"|"sangria"|"ajuste">("suprimento");
  const [cashAmount, setCashAmount]     = useState("");
  const [cashNote, setCashNote]         = useState("");
  const [uploadingTxId, setUploadingTxId] = useState<string|null>(null);

  const [boardingTaxState, setBoardingTaxState]     = useState("");
  const [boardingTaxFederal, setBoardingTaxFederal] = useState("");

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [lastCloseResult, setLastCloseResult] = useState<LastCloseResult | null>(null);
  
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<"suprimento"|"sangria">("suprimento");
  
  const [section, setSection] = useState("caixa-pdv");
  const [isMounted, setIsMounted] = useState(false);

  // Estados PDV Calculadora
  const [pdvDisplay, setPdvDisplay] = useState("0");
  const [pdvPaymentMethod, setPdvPaymentMethod] = useState<"cash"|"pix"|"credit"|"debit"|"link">("cash");
  const [pdvCompanyId, setPdvCompanyId] = useState("");
  const [pdvTicketRef, setPdvTicketRef] = useState("");
  const [pdvNote, setPdvNote] = useState("");
  const [pdvInstallments, setPdvInstallments] = useState("1");
  const [pdvBoardingTaxState, setPdvBoardingTaxState] = useState("");
  const [pdvBoardingTaxFederal, setPdvBoardingTaxFederal] = useState("");
  const [showPdvConfirm, setShowPdvConfirm] = useState(false);
  const [pdvAccumulator, setPdvAccumulator] = useState<number | null>(null);
  const [pdvPendingOperation, setPdvPendingOperation] = useState<"+" | "-" | null>(null);
  const [pdvResetOnNextDigit, setPdvResetOnNextDigit] = useState(false);

  // Taxa de embarque
  const [taxasEmbarque, setTaxasEmbarque] = useState<TaxaEmbarque[]>(DEFAULT_BOARDING_TAXES);
  const [showTaxaConfig, setShowTaxaConfig] = useState(false);

  // Chat privado admin <-> guiche
  type ChatMessage = {
    id: string;
    message: string;
    created_at: string;
    read: boolean;
    booth_id: string | null;
    sender_role: "operator" | "admin";
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const showChatRef = useRef(showChat);
  showChatRef.current = showChat;

  const activeChatBoothId = shift?.booth_id ?? boothId ?? booths[0]?.booth_id ?? "";
  const activeChatBoothName = booths.find((item) => item.booth_id === activeChatBoothId)?.booth_name ?? "Guiche";

  useEffect(() => {
    setIsMounted(true);
    const handleSectionChange = (e: CustomEvent<string>) => setSection(e.detail);
    window.addEventListener("rebuild:section-change", handleSectionChange as EventListener);
    
    const hash = window.location.hash.replace("#", "");
    if (hash) setSection(hash);
    
    return () => window.removeEventListener("rebuild:section-change", handleSectionChange as EventListener);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? "";
      if (!uid) return router.push("/login");
      setUserId(uid);

      const { data: profile } = await supabase.from("profiles").select("role,active").eq("user_id",uid).single();
      const role = (profile as { role?: string; active?: boolean } | null)?.role ?? "";
      const isActive = (profile as { role?: string; active?: boolean } | null)?.active !== false;
      setOperatorActive((profile as { active?: boolean }|null)?.active ?? null);

      if (!isActive) {
        await supabase.auth.signOut();
        return router.replace("/login");
      }

      const destination = getHomeRouteForRole(role);
      if (!destination) {
        await supabase.auth.signOut();
        return router.replace("/login");
      }

      if (canAccessAdminArea(role)) return router.replace(destination);
      if (role !== "operator") {
        await supabase.auth.signOut();
        return router.replace("/login");
      }

      const [boothLinksRes, companiesRes, categoriesRes, subcategoriesRes, boardingTaxesRes, shiftRes, allBoothsRes] = await Promise.all([
        supabase.from("operator_booths").select("booth_id").eq("operator_id",uid).eq("active",true),
        supabase.from("companies").select("*").eq("active",true).order("name"),
        supabase.from("transaction_categories").select("id,name").eq("active",true).order("name"),
        supabase.from("transaction_subcategories").select("id,name,category_id").eq("active",true).order("name"),
        supabase.from("boarding_taxes").select("id,name,amount,tax_type,active").eq("active",true).order("tax_type").order("name"),
        supabase.from("shifts").select("id,booth_id,status").eq("operator_id",uid).eq("status","open").maybeSingle(),
        supabase.from("booths").select("id,name").eq("active",true),
      ]);

      const bData  = tolerantData((boothLinksRes.data as {booth_id:string}[]|null)??[], boothLinksRes.error, [], "Vinculos").data;
      const cData  = tolerantData((companiesRes.data as Option[]|null)??[], companiesRes.error, [], "Empresas").data;
      const catData= tolerantData((categoriesRes.data as Category[]|null)??[], categoriesRes.error, [], "Categorias").data;
      const subData= tolerantData((subcategoriesRes.data as Subcategory[]|null)??[], subcategoriesRes.error, [], "Subcategorias").data;
      const taxData= tolerantData((boardingTaxesRes.data as TaxaEmbarque[]|null)??[], boardingTaxesRes.error, DEFAULT_BOARDING_TAXES, "Taxas de embarque").data;
      const allBooths= tolerantData((allBoothsRes.data as {id:string;name:string}[]|null)??[], allBoothsRes.error, [], "Guiches").data;

      const boothNameMap = new Map((allBooths??[]).map((b:{id:string;name:string})=>[b.id,b.name]));
      const boothRows = ((bData??[]) as {booth_id:string}[]).map(b=>({ booth_id:b.booth_id, booth_name:boothNameMap.get(b.booth_id)??b.booth_id }));
      setBooths(boothRows); setCompanies(cData??[]); setTaxasEmbarque((taxData ?? DEFAULT_BOARDING_TAXES).filter((tax) => tax.active !== false));
      const cats = catData??[]; const subs = subData??[];
      setCategories(cats); setSubcategories(subs);
      if (cats[0]) { setCategoryId(cats[0].id); const first=subs.find(s=>s.category_id===cats[0].id); setSubcategoryId(first?.id??""); }

      const sData = shiftRes.data as Shift|null;
      if (sData) { setShift(sData); await loadTxs(sData.id); await loadCashMovements(sData.id); }
      await loadPunches(uid);
      if (!sData && bData?.[0]) setBoothId((bData[0] as {booth_id:string}).booth_id);

      // Ponto Digital: clock_in automatico na entrada
      try {
        const today = new Date(); today.setHours(0,0,0,0);
        const { data: openPunch } = await supabase
          .from("user_attendance")
          .select("id")
          .eq("user_id", uid)
          .is("clock_out", null)
          .gte("clock_in", today.toISOString())
          .maybeSingle();
        if (!openPunch) {
          await supabase.from("user_attendance").insert({ user_id: uid });
        }
      } catch { /* silencioso */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTxs(shiftId: string) {
    const txRes = await supabase.from("transactions").select("id,amount,payment_method,sold_at,ticket_reference,note,company_id,boarding_tax_state,boarding_tax_federal").eq("shift_id",shiftId).eq("status","posted").order("sold_at",{ascending:false}).limit(100);
    if (txRes.error) return;
    const baseTxs = (txRes.data??[]) as Array<{id:string;amount:number;payment_method:"pix"|"credit"|"debit"|"cash";sold_at:string;ticket_reference:string|null;note:string|null;company_id:string|null;boarding_tax_state:number;boarding_tax_federal:number}>;
    const txIds = baseTxs.map(t=>t.id);
    const companyIds = Array.from(new Set(baseTxs.map(t=>t.company_id).filter(Boolean))) as string[];
    const [receiptRes,companyRes] = await Promise.all([
      txIds.length ? supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id",txIds) : Promise.resolve({data:[],error:null} as {data:unknown[];error:null}),
      companyIds.length ? supabase.from("companies").select("id,name").in("id",companyIds) : Promise.resolve({data:[],error:null} as {data:unknown[];error:null}),
    ]);
    const receiptCounts = new Map<string,number>();
    for (const r of (receiptRes.data??[]) as {transaction_id:string}[]) receiptCounts.set(r.transaction_id,(receiptCounts.get(r.transaction_id)??0)+1);
    const companyNames = new Map<string,string>();
    for (const c of (companyRes.data??[]) as {id:string;name:string}[]) companyNames.set(c.id,c.name);
    setTxs(baseTxs.map(tx=>({ ...tx, company_name:tx.company_id?companyNames.get(tx.company_id)??"-":"-", receipt_count:receiptCounts.get(tx.id)??0 })));
  }

  async function loadPunches(uid: string) {
    const res = await supabase.from("time_punches").select("id,punch_type,punched_at,note").eq("user_id",uid).order("punched_at",{ascending:false}).limit(20);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setPunches((res.data as Punch[]|null)??[]);
  }

  async function loadCashMovements(shiftId: string) {
    const res = await supabase.from("cash_movements").select("id,movement_type,amount,note,created_at").eq("shift_id",shiftId).order("created_at",{ascending:false}).limit(100);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setCashMovements((res.data as CashMovement[]|null)??[]);
  }

  async function syncAttendanceAfterPunch(type: Punch["punch_type"], uid: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === "entrada") {
      const { data: openRow, error: selectError } = await supabase
        .from("user_attendance")
        .select("id")
        .eq("user_id", uid)
        .is("clock_out", null)
        .gte("clock_in", today.toISOString())
        .maybeSingle();

      if (selectError && !isSchemaToleranceError(selectError)) {
        return "Falha ao sincronizar a presenca do dia.";
      }

      if (!openRow) {
        const { error } = await supabase.from("user_attendance").insert({ user_id: uid });
        if (error && !isSchemaToleranceError(error)) {
          return "Falha ao sincronizar a presenca do dia.";
        }
      }

      return null;
    }

    if (type === "saida") {
      const { error } = await supabase
        .from("user_attendance")
        .update({ clock_out: new Date().toISOString() })
        .eq("user_id", uid)
        .is("clock_out", null)
        .gte("clock_in", today.toISOString());

      if (error && !isSchemaToleranceError(error)) {
        return "Falha ao finalizar a presenca do dia.";
      }
    }

    return null;
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string,unknown>) {
    if (!userId) return;
    await supabase.from("audit_logs").insert({ created_by:userId, action, entity:entity??null, entity_id:entityId??null, details:details??{} });
  }

  async function openShift() {
    if (!boothId) return setMessage("Selecione um guiche.");
    const { data, error } = await supabase.rpc("open_shift",{p_booth_id:boothId});
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("OPEN_SHIFT","shifts",(data as Shift).id,{booth_id:boothId});
    setLastCloseResult(null);
    setShift(data as Shift); setMessage("Turno aberto.");
    await loadTxs((data as Shift).id); await loadCashMovements((data as Shift).id);
  }

  async function openCloseShiftModal() {
    if (!shift||!userId) return;
    const pending = pendingReceiptTxs.length;
    if (pending>0) return setMessage(`${pending} lancamento(s) sem comprovante. Envie os comprovantes antes de fechar o caixa.`);
    setExpectedCashVal(Number(cashTotals.saldo.toFixed(2)));
    setCloseDeclared("");
    setCloseObs("");
    setShowCloseModal(true);
  }

  async function confirmCloseShift() {
    if (!shift||!userId) return;
    setIsClosing(true);
    try {
      const declaredCash = Number(closeDeclared.replace(",","."));
      if (Number.isNaN(declaredCash) || declaredCash < 0) { setMessage("Informe um valor contado valido."); return; }
      const difference = Number((declaredCash-expectedCashVal).toFixed(2));
      const obs = closeObs.trim() || null;
      const normalizedExpected = Number(expectedCashVal.toFixed(2));
      const normalizedDeclared = Number(declaredCash.toFixed(2));
      const { error: saveClosingError } = await supabase.from("shift_cash_closings").upsert({ shift_id:shift.id, booth_id:shift.booth_id, user_id:userId, expected_cash:normalizedExpected, declared_cash:normalizedDeclared, difference, note:obs });
      if (saveClosingError) { setMessage(`Erro ao registrar fechamento: ${saveClosingError.message}`); return; }
      const { error } = await supabase.rpc("close_shift",{p_shift_id:shift.id,p_notes:obs});
      if (error) { setMessage(`Erro: ${error.message}`); return; }
      await logAction("CLOSE_SHIFT","shifts",shift.id,{expected_cash:expectedCashVal,declared_cash:declaredCash,difference});
      setLastCloseResult({ expectedCash: normalizedExpected, declaredCash: normalizedDeclared, difference, note: obs, closedAt: new Date().toISOString() });
      setShift(null); setTxs([]); setCashMovements([]); setShowCloseModal(false); setSection("resumo"); setMessage(`Fechamento concluido. Resultado: ${difference === 0 ? "caixa conferido" : difference > 0 ? `sobra de ${formatCurrency(difference)}` : `falta de ${formatCurrency(Math.abs(difference))}`}.`);
    } finally {
      setIsClosing(false);
    }
  }

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;
    const label = type==="entrada"?"Entrada":type==="saida"?"Saida":type==="pausa_inicio"?"Inicio de pausa":"Fim de pausa";
    const { error } = await supabase.from("time_punches").insert({ user_id:userId, booth_id:(shift?.booth_id??boothId)||null, shift_id:shift?.id??null, punch_type:type, note:label });
    if (error) return setMessage(`Erro: ${error.message}`);
    const attendanceWarning = await syncAttendanceAfterPunch(type, userId);
    await logAction("TIME_PUNCH","time_punches",undefined,{type});
    await loadPunches(userId); setMessage(attendanceWarning ? `Ponto: ${label}. ${attendanceWarning}` : `Ponto: ${label}.`);
  }

  async function submitCashMovement(e: FormEvent) {
    e.preventDefault();
    if (!shift||!userId) return;
    const parsedAmount = Number(cashAmount.replace(",","."));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return setMessage("Informe um valor maior que zero para o movimento de caixa.");
    const { error } = await supabase.from("cash_movements").insert({ shift_id:shift.id, booth_id:shift.booth_id, user_id:userId, movement_type:cashType, amount:Number(parsedAmount.toFixed(2)), note:cashNote.trim()||null });
    if (error) return setMessage(`Erro: ${error.message}`);
    setCashAmount(""); setCashNote(""); setShowCashModal(false); await loadCashMovements(shift.id); setMessage("Movimento registrado.");
  }

  async function submitTx(e: FormEvent) {
    e.preventDefault();
    if (!shift||!companyId||!categoryId||!subcategoryId||!amount||!userId) return;
    const taxState   = Number(boardingTaxState.replace(",","."))   || 0;
    const taxFederal = Number(boardingTaxFederal.replace(",",".")) || 0;
    const totalAmount = Number(amount) + taxState + taxFederal;
    const { data: inserted, error } = await supabase.from("transactions").insert({ shift_id:shift.id, booth_id:shift.booth_id, operator_id:userId, company_id:companyId, category_id:categoryId, subcategory_id:subcategoryId, amount:totalAmount, payment_method:paymentMethod, commission_percent:null, ticket_reference:ticketReference||null, note:note||null, boarding_tax_state:taxState, boarding_tax_federal:taxFederal }).select("id").single();
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CREATE_TRANSACTION","transactions",inserted?.id,{amount:totalAmount,payment_method:paymentMethod,boarding_tax_state:taxState,boarding_tax_federal:taxFederal});
    setAmount(""); setTicketReference(""); setNote(""); setBoardingTaxState(""); setBoardingTaxFederal(""); setMessage("Lancamento salvo."); await loadTxs(shift.id);
  }

  // ===== FUNCOES PDV CALCULADORA =====
  function pdvFormatAmount(value: number) {
    return Number.isFinite(value) ? value.toFixed(2) : "0";
  }

  function pdvResolveCurrentValue() {
    const current = parseMoneyInput(pdvDisplay);

    if (!pdvPendingOperation || pdvAccumulator === null) {
      return current;
    }

    const resolved = pdvResetOnNextDigit
      ? pdvAccumulator
      : pdvPendingOperation === "+"
        ? pdvAccumulator + current
        : Math.max(0, pdvAccumulator - current);

    setPdvDisplay(pdvFormatAmount(resolved));
    setPdvAccumulator(null);
    setPdvPendingOperation(null);
    setPdvResetOnNextDigit(true);

    return resolved;
  }

  function pdvDigit(d: string) {
    setPdvDisplay((prev) => {
      const base = pdvResetOnNextDigit ? "0" : prev;
      if (d === "." && base.includes(".")) return base;
      if (base === "0" && d !== ".") return d;
      return base + d;
    });
    setPdvResetOnNextDigit(false);
  }

  function pdvHandleNumber(key: string) {
    pdvDigit(key);
  }

  function pdvClear() {
    setPdvDisplay("0");
    setPdvBoardingTaxState("");
    setPdvBoardingTaxFederal("");
    setPdvInstallments("1");
    setPdvAccumulator(null);
    setPdvPendingOperation(null);
    setPdvResetOnNextDigit(false);
  }

  function pdvBackspace() {
    if (pdvResetOnNextDigit) {
      setPdvDisplay("0");
      setPdvResetOnNextDigit(false);
      return;
    }

    setPdvDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  }

  function pdvHandleBackspace() {
    pdvBackspace();
  }

  function pdvSetOperation(operation: "+" | "-") {
    const current = pdvResolveCurrentValue();
    setPdvAccumulator(current);
    setPdvPendingOperation(operation);
    setPdvResetOnNextDigit(true);
  }

  function pdvAddTaxa(taxa: TaxaEmbarque) {
    const nextValue = Number(taxa.amount ?? 0).toFixed(2);

    if (taxa.tax_type === "estadual") {
      setPdvBoardingTaxState((prev) => {
        const current = parseMoneyInput(prev);
        return Math.abs(current - Number(taxa.amount ?? 0)) < 0.001 ? "" : nextValue;
      });
      return;
    }

    setPdvBoardingTaxFederal((prev) => {
      const current = parseMoneyInput(prev);
      return Math.abs(current - Number(taxa.amount ?? 0)) < 0.001 ? "" : nextValue;
    });
  }

  function pdvOpenConfirm() {
    const baseValue = pdvResolveCurrentValue();

    if (!pdvCompanyId) {
      setMessage("Selecione a empresa para concluir a venda.");
      return;
    }

    if (baseValue <= 0) {
      setMessage("Informe um valor valido para a venda.");
      return;
    }

    setShowPdvConfirm(true);
  }

  async function pdvSubmitSale() {
    if (!shift || !pdvCompanyId) return;

    const baseAmount = pdvResolveCurrentValue();
    if (isNaN(baseAmount) || baseAmount <= 0) return setMessage("Valor invalido.");

    const defaultCat = categories[0];
    const defaultSub = subcategories.find((s) => s.category_id === defaultCat?.id);
    const taxState = parseMoneyInput(pdvBoardingTaxState);
    const taxFederal = parseMoneyInput(pdvBoardingTaxFederal);
    const totalAmount = Number((baseAmount + taxState + taxFederal).toFixed(2));
    const parsedInstallments = Math.min(12, Math.max(1, Number.parseInt(pdvInstallments, 10) || 1));
    const composedNote = [
      pdvPaymentMethod === "link" ? "Link de Pagamento" : null,
      pdvPaymentMethod === "credit" ? `Parcelado em ${parsedInstallments}x` : null,
      pdvNote.trim() || null,
    ].filter(Boolean).join(" - ") || null;

    const { data: inserted, error } = await supabase.from("transactions").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: pdvCompanyId,
      category_id: defaultCat?.id || null,
      subcategory_id: defaultSub?.id || null,
      amount: totalAmount,
      payment_method: pdvPaymentMethod === "link" ? "pix" : pdvPaymentMethod,
      ticket_reference: pdvTicketRef || null,
      note: composedNote,
      boarding_tax_state: taxState,
      boarding_tax_federal: taxFederal,
    }).select("id").single();

    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CREATE_TRANSACTION", "transactions", inserted?.id, {
      amount: totalAmount,
      base_amount: baseAmount,
      payment_method: pdvPaymentMethod,
      installments: pdvPaymentMethod === "credit" ? parsedInstallments : 1,
      boarding_tax_state: taxState,
      boarding_tax_federal: taxFederal,
    });

    // Reset PDV
    setPdvDisplay("0");
    setPdvTicketRef("");
    setPdvNote("");
    setPdvInstallments("1");
    setPdvBoardingTaxState("");
    setPdvBoardingTaxFederal("");
    setPdvAccumulator(null);
    setPdvPendingOperation(null);
    setPdvResetOnNextDigit(false);
    setShowPdvConfirm(false);
    setMessage(`Venda de ${formatCurrency(totalAmount)} registrada!`);
    await loadTxs(shift.id);
  }

  // ===== FUNCOES CHAT =====
  const loadChatMessages = useCallback(async () => {
    if (!userId) return;

    const query = await supabase
      .from("operator_messages")
      .select("id, message, created_at, read, booth_id, sender_role")
      .eq("operator_id", userId)
      .order("created_at", { ascending: true })
      .limit(150);

    if (!query.error && query.data) {
      const allMessages: ChatMessage[] = ((query.data as ChatMessage[]) || []).map((msg) => ({
        ...msg,
        booth_id: msg.booth_id ?? null,
        sender_role: msg.sender_role === "admin" ? "admin" : "operator",
      }));
      const visibleMessages: ChatMessage[] = activeChatBoothId
        ? allMessages.filter((msg) => (msg.booth_id ?? activeChatBoothId) === activeChatBoothId)
        : allMessages;

      setChatMessages(visibleMessages);
      setUnreadChatCount(allMessages.filter((msg) => !msg.read && msg.sender_role === "admin").length);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      return;
    }

    if (isSchemaToleranceError(query.error)) {
      const fallback = await supabase
        .from("operator_messages")
        .select("id, message, created_at, read")
        .eq("operator_id", userId)
        .order("created_at", { ascending: true })
        .limit(150);

      if (!fallback.error) {
        const legacyMessages = (((fallback.data as Array<{ id: string; message: string; created_at: string; read: boolean }>) || [])).map((msg) => ({
          ...msg,
          booth_id: activeChatBoothId || null,
          sender_role: "operator" as const,
        }));
        setChatMessages(legacyMessages);
        setUnreadChatCount(0);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    }
  }, [activeChatBoothId, userId]);

  async function markAdminChatAsRead() {
    if (!userId || !activeChatBoothId) return;
    const { error } = await supabase
      .from("operator_messages")
      .update({ read: true, read_at: new Date().toISOString(), read_by: userId })
      .eq("operator_id", userId)
      .eq("sender_role", "admin")
      .eq("read", false)
      .eq("booth_id", activeChatBoothId);

    if (error && !isSchemaToleranceError(error)) return;
    await loadChatMessages();
  }

  async function openChatPanel() {
    if (!activeChatBoothId) {
      setMessage("Selecione um guiche para abrir a conversa privada.");
      return;
    }

    setShowChat(true);
    await loadChatMessages();
    await markAdminChatAsRead();
  }

  useEffect(() => {
    if (!showChat || !userId || !activeChatBoothId) return;
    void loadChatMessages();
    void markAdminChatAsRead();
  }, [activeChatBoothId, loadChatMessages, showChat, userId]);

  // Realtime: escutar novos inserts na tabela operator_messages
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`op-messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        const raw = payload.new as ChatMessage;
        const normalized: ChatMessage = {
          ...raw,
          booth_id: raw.booth_id ?? null,
          sender_role: raw.sender_role === "admin" ? "admin" : "operator",
        };
        const belongsToCurrentBooth = !activeChatBoothId || (normalized.booth_id ?? activeChatBoothId) === activeChatBoothId;

        if (belongsToCurrentBooth) {
          setChatMessages((prev) => (prev.some((msg) => msg.id === normalized.id) ? prev : [...prev, normalized]));
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }

        if (normalized.sender_role === "admin") {
          if (showChatRef.current && belongsToCurrentBooth) {
            void markAdminChatAsRead();
          } else {
            setUnreadChatCount((prev) => prev + 1);
            setMessage(`Nova mensagem do administrador para ${activeChatBoothName}.`);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        const raw = payload.new as ChatMessage;
        const updated: ChatMessage = {
          ...raw,
          booth_id: raw.booth_id ?? null,
          sender_role: raw.sender_role === "admin" ? "admin" : "operator",
        };
        const belongsToCurrentBooth = !activeChatBoothId || (updated.booth_id ?? activeChatBoothId) === activeChatBoothId;
        if (belongsToCurrentBooth) {
          setChatMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatBoothId, activeChatBoothName, userId]);

  async function sendChatMessage() {
    if (!userId || !activeChatBoothId || !newChatMessage.trim()) return;
    const payload = {
      operator_id: userId,
      booth_id: activeChatBoothId,
      sender_role: "operator" as const,
      message: newChatMessage.trim(),
      read: false,
    };
    const { error } = await supabase.from("operator_messages").insert(payload);
    if (error) return setMessage(`Erro: ${error.message}`);
    setNewChatMessage("");
    setMessage(`Mensagem enviada para o admin do guiche ${activeChatBoothName}.`);
    await loadChatMessages();
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
  }

  async function handleUploadReceipt(txId: string, ev: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = ev.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isImage && !isPdf) {
      setMessage("Envie o comprovante em imagem ou PDF.");
      ev.target.value = "";
      return;
    }

    setUploadingTxId(txId);
    const ext = (file.name.split(".").pop() || (isPdf ? "pdf" : "jpg")).toLowerCase();
    const contentType = isPdf ? "application/pdf" : file.type || "image/jpeg";
    const path = `${userId}/${txId}-${Date.now()}.${ext}`;

    const up = await supabase.storage.from("payment-receipts").upload(path, file, {
      upsert: true,
      contentType,
    });
    if (up.error) {
      setMessage(`Erro upload: ${up.error.message}`);
      setUploadingTxId(null);
      ev.target.value = "";
      return;
    }

    const { error: receiptError } = await supabase
      .from("transaction_receipts")
      .upsert(
        { transaction_id: txId, storage_path: path, mime_type: contentType, uploaded_by: userId },
        { onConflict: "transaction_id" },
      );

    if (receiptError) {
      setMessage(`Erro ao registrar comprovante: ${receiptError.message}`);
      setUploadingTxId(null);
      ev.target.value = "";
      return;
    }

    await logAction("UPLOAD_RECEIPT", "transactions", txId, { path, mime_type: contentType });
    setMessage("Comprovante enviado com sucesso.");
    if (shift) await loadTxs(shift.id);
    setUploadingTxId(null);
    ev.target.value = "";
  }

  const totals = useMemo(()=>txs.reduce((acc,tx)=>{ acc[tx.payment_method]+=Number(tx.amount||0); acc.taxState+=Number(tx.boarding_tax_state||0); acc.taxFederal+=Number(tx.boarding_tax_federal||0); return acc; },{pix:0,credit:0,debit:0,cash:0,taxState:0,taxFederal:0}),[txs]);
  const totalGeral = totals.pix+totals.credit+totals.debit+totals.cash;
  const cashTotals = useMemo(()=>{
    const s=cashMovements.filter(m=>m.movement_type==="suprimento").reduce((a,m)=>a+Number(m.amount||0),0);
    const g=cashMovements.filter(m=>m.movement_type==="sangria").reduce((a,m)=>a+Number(m.amount||0),0);
    const j=cashMovements.filter(m=>m.movement_type==="ajuste").reduce((a,m)=>a+Number(m.amount||0),0);
    return {suprimento:s,sangria:g,ajuste:j,saldo:totals.cash+s-g+j};
  },[cashMovements, totals.cash]);
  const closeDeclaredValue = useMemo(() => parseMoneyInput(closeDeclared), [closeDeclared]);
  const closeDifferencePreview = useMemo(() => Number((closeDeclaredValue - expectedCashVal).toFixed(2)), [closeDeclaredValue, expectedCashVal]);
  const closeDifferenceStatus = closeDeclared.trim() === ""
    ? { label: "Aguardando contagem", variant: "neutral" as const }
    : closeDifferencePreview === 0
      ? { label: "Conferido", variant: "success" as const }
      : closeDifferencePreview > 0
        ? { label: "Sobra", variant: "warning" as const }
        : { label: "Falta", variant: "danger" as const };
  const closeDifferenceToneClass = closeDeclared.trim() === ""
    ? "border-border bg-slate-800/60 text-foreground"
    : closeDifferencePreview === 0
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : closeDifferencePreview > 0
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-rose-500/30 bg-rose-500/10 text-rose-400";
  const recentCashMovements = useMemo(() => cashMovements.slice(0, 4), [cashMovements]);
  const pdvBaseAmount = useMemo(() => parseMoneyInput(pdvDisplay), [pdvDisplay]);
  const pdvTaxStateValue = useMemo(() => parseMoneyInput(pdvBoardingTaxState), [pdvBoardingTaxState]);
  const pdvTaxFederalValue = useMemo(() => parseMoneyInput(pdvBoardingTaxFederal), [pdvBoardingTaxFederal]);
  const pdvInstallmentsValue = useMemo(() => Math.min(12, Math.max(1, Number.parseInt(pdvInstallments, 10) || 1)), [pdvInstallments]);
  const pdvTotalAmount = pdvBaseAmount + pdvTaxStateValue + pdvTaxFederalValue;
  const digitalTotal = totals.pix + totals.credit + totals.debit;
  const filteredSubs = useMemo(()=>subcategories.filter(s=>s.category_id===categoryId),[subcategories,categoryId]);
  const pendingReceiptTxs = useMemo(()=>txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0),[txs]);
  const operatorBlocked = operatorActive===false;

  useEffect(() => {
    if (!isMounted) return;

    function handleGlobalPdvKeydown(event: KeyboardEvent) {
      const isPdvSection = section === "caixa-pdv" || section === "nova-venda";
      if (!isPdvSection || !shift || operatorBlocked || showPdvConfirm || showCashModal || showCloseModal || showChat || showTaxaConfig) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (hasNativeInputFocus(document.activeElement)) return;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        pdvHandleNumber(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        pdvHandleBackspace();
        return;
      }

      if (event.key === "." || event.key === ",") {
        event.preventDefault();
        pdvHandleNumber(".");
        return;
      }

      if (event.key === "Enter") {
        if (parseMoneyInput(pdvDisplay) > 0) {
          event.preventDefault();
          pdvOpenConfirm();
        }
        return;
      }

      if (event.key === "Escape" || event.key.toLowerCase() === "c") {
        event.preventDefault();
        pdvClear();
      }
    }

    window.addEventListener("keydown", handleGlobalPdvKeydown);
    return () => window.removeEventListener("keydown", handleGlobalPdvKeydown);
  }, [
    isMounted,
    operatorBlocked,
    pdvClear,
    pdvDisplay,
    pdvHandleBackspace,
    pdvHandleNumber,
    pdvOpenConfirm,
    section,
    shift,
    showCashModal,
    showChat,
    showCloseModal,
    showPdvConfirm,
    showTaxaConfig,
  ]);

  const show = (s: string) => section === s;

  return (
    <RebuildShell>
      <Toast message={message} onClose={() => setMessage(null)} type="info" />

      {/* ===== RESUMO DO TURNO ===== */}
      {show("resumo") && (
        <OperatorSummarySection
          shift={shift}
          boothId={boothId}
          booths={booths}
          operatorBlocked={operatorBlocked}
          totals={totals}
          cashTotals={cashTotals}
          totalGeral={totalGeral}
          txs={txs}
          lastCloseResult={lastCloseResult}
          unreadChatCount={unreadChatCount}
          isMounted={isMounted}
          onBoothChange={setBoothId}
          onOpenShift={openShift}
          onOpenCloseShiftModal={openCloseShiftModal}
          onOpenChat={openChatPanel}
        />
      )}

      {/* ===== CAIXA PDV ===== */}
      {show("caixa-pdv") && (
        <div className="space-y-6">
          {/* Header com acoes */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Caixa PDV</h1>
              <p className="text-sm text-muted">Sistema de venda rapida</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                className="relative w-full sm:w-auto"
                onClick={() => { void openChatPanel(); }}
              >
                <MessageSquare size={16} className="mr-1" />
                Chat
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="success" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => { setCashModalType("suprimento"); setCashType("suprimento"); setShowCashModal(true); }}
                disabled={!shift || operatorBlocked}
              >
                <Plus size={16} className="mr-1" />
                Suprimento
              </Button>
              <Button 
                variant="danger" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => { setCashModalType("sangria"); setCashType("sangria"); setShowCashModal(true); }}
                disabled={!shift || operatorBlocked}
              >
                Sangria
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => { void openCloseShiftModal(); }}
                disabled={!shift || operatorBlocked}
              >
                <Wallet size={16} className="mr-1" />
                Fechar Caixa PDV
              </Button>
            </div>
          </div>

          {/* Layout Principal: Calculadora + Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calculadora PDV */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-0 overflow-hidden">
                {/* Display */}
                <div className="bg-slate-900 p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Total da Venda</span>
                    {shift && <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Turno Ativo</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-bold text-white tracking-tight">
                      {formatCurrency(pdvTotalAmount)}
                    </span>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-400">
                      <span>Base: {formatCurrency(pdvBaseAmount)}</span>
                      <span>Taxas: {formatCurrency(pdvTaxStateValue + pdvTaxFederalValue)}</span>
                    </div>
                    {pdvPendingOperation && (
                      <p className="mt-2 text-xs text-amber-400">Operacao pendente: {pdvPendingOperation}</p>
                    )}
                  </div>
                </div>

                {/* Taxas de Embarque */}
                <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} />
                      Taxa de Embarque
                    </span>
                    <button 
                      onClick={() => setShowTaxaConfig(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Settings size={12} />
                      Ver taxas
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {taxasEmbarque.length === 0 ? (
                      <div className="w-full rounded-lg border border-dashed border-slate-600 px-3 py-4 text-center text-sm text-slate-400">
                        Nenhuma taxa rapida ativa foi configurada no admin.
                      </div>
                    ) : (
                      taxasEmbarque.map(taxa => (
                        <button
                          key={taxa.id}
                          onClick={() => pdvAddTaxa(taxa)}
                          disabled={!shift || operatorBlocked}
                          className="flex-1 py-3 px-4 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                        >
                          <span className="block text-sm">{taxa.name}</span>
                          <span className="block text-lg">{formatCurrency(Number(taxa.amount ?? 0))}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Teclado Numerico */}
                <div className="p-4 bg-slate-800/30">
                  <div className="grid grid-cols-5 gap-2">
                    {["7","8","9","C","+","4","5","6","<","-","1","2","3",".","=","00","0","000","OK"].map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === "C") pdvClear();
                          else if (key === "<") pdvHandleBackspace();
                          else if (key === "+") pdvSetOperation("+");
                          else if (key === "-") pdvSetOperation("-");
                          else if (key === "=") pdvResolveCurrentValue();
                          else if (key === "OK") pdvOpenConfirm();
                          else pdvHandleNumber(key);
                        }}
                        disabled={!shift || operatorBlocked}
                        className={`py-4 rounded-lg font-bold text-xl transition-all disabled:opacity-50 ${
                          key === "C" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30" :
                          key === "<" ? "bg-slate-600 text-slate-300 hover:bg-slate-500" :
                          key === "OK" ? "bg-emerald-500 text-white hover:bg-emerald-600" :
                          key === "+" || key === "-" || key === "=" ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30" :
                          "bg-slate-700 text-slate-200 hover:bg-slate-600"
                        }`}
                      >
                        {key === "<" ? <Delete size={20} className="mx-auto" /> : key}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Selecao Empresa e Forma de Pagamento */}
              <Card>
                <div className="space-y-4">
                  {/* Empresa */}
                  <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-2">Empresa / Viacao</label>
                    <Select
                      value={pdvCompanyId}
                      onChange={e => setPdvCompanyId(e.target.value)}
                      disabled={!shift || operatorBlocked}
                      className="w-full"
                    >
                      <option value="">Selecione a empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({getCompanyPct(c)}%)</option>)}
                    </Select>
                  </div>

                  {/* Formas de Pagamento */}
                  <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-2">Forma de Pagamento</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: "cash", label: "Dinheiro", icon: Banknote, color: "emerald" },
                        { id: "pix", label: "PIX", icon: Smartphone, color: "cyan" },
                        { id: "credit", label: "Credito", icon: CreditCard, color: "purple" },
                        { id: "debit", label: "Debito", icon: Wallet, color: "blue" },
                        { id: "link", label: "Link", icon: Link2, color: "orange" },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPdvPaymentMethod(method.id as typeof pdvPaymentMethod)}
                          disabled={!shift || operatorBlocked}
                          className={`py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 disabled:opacity-50 ${
                            pdvPaymentMethod === method.id
                              ? `bg-${method.color}-500/20 border-${method.color}-500 text-${method.color}-400`
                              : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                          }`}
                          style={{
                            backgroundColor: pdvPaymentMethod === method.id ? `rgb(var(--${method.color}-500) / 0.2)` : undefined,
                            borderColor: pdvPaymentMethod === method.id ? `hsl(var(--${method.color === "emerald" ? "success" : method.color === "cyan" ? "info" : "primary"}))` : undefined,
                            color: pdvPaymentMethod === method.id ? `hsl(var(--${method.color === "emerald" ? "success" : method.color === "cyan" ? "info" : "primary"}))` : undefined,
                          }}
                        >
                          <method.icon size={20} />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos adicionais */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Ref. Bilhete"
                      value={pdvTicketRef}
                      onChange={e => setPdvTicketRef(e.target.value)}
                      placeholder="Ex: 12345"
                      disabled={!shift || operatorBlocked}
                    />
                    <Input
                      label="Observacao"
                      value={pdvNote}
                      onChange={e => setPdvNote(e.target.value)}
                      placeholder="Opcional"
                      disabled={!shift || operatorBlocked}
                    />
                  </div>

                  {pdvPaymentMethod === "credit" && (
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wider text-muted">Parcelamento no credito</label>
                      <Select
                        value={pdvInstallments}
                        onChange={e => setPdvInstallments(e.target.value)}
                        disabled={!shift || operatorBlocked}
                        className="w-full"
                      >
                        {Array.from({ length: 12 }, (_, index) => {
                          const installment = String(index + 1);
                          return (
                            <option key={installment} value={installment}>
                              {installment}x {index === 0 ? "sem parcelamento" : "no cartao"}
                            </option>
                          );
                        })}
                      </Select>
                      <p className="mt-2 text-xs text-muted">Informe em quantas vezes o cliente parcelou a compra no cartao de credito.</p>
                    </div>
                  )}
                  {/* Taxas de Embarque */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Taxa Estadual (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pdvBoardingTaxState}
                      onChange={e => setPdvBoardingTaxState(e.target.value)}
                      placeholder="0,00"
                      disabled={!shift || operatorBlocked}
                    />
                    <Input
                      label="Taxa Federal (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pdvBoardingTaxFederal}
                      onChange={e => setPdvBoardingTaxFederal(e.target.value)}
                      placeholder="0,00"
                      disabled={!shift || operatorBlocked}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Painel Lateral - Resumo */}
            <div className="space-y-4">
              {/* Status Turno */}
              <Card className={shift ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-600"}>
                {shift ? (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-400">Turno Aberto</p>
                      <p className="text-xs text-muted">{booths.find(b => b.booth_id === shift.booth_id)?.booth_name || "Guiche"}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted mb-3">Selecione um guiche para abrir turno:</p>
                    <Select
                      value={boothId}
                      onChange={e => setBoothId(e.target.value)}
                      disabled={operatorBlocked}
                      className="mb-3"
                    >
                      <option value="">Selecione guiche</option>
                      {booths.map(b => <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>)}
                    </Select>
                    <Button variant="success" onClick={openShift} disabled={operatorBlocked || !boothId} className="w-full">
                      Abrir Turno
                    </Button>
                  </div>
                )}
              </Card>

              {/* KPIs Resumo */}
              <Card>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Resumo do Turno</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Banknote size={16} className="text-emerald-400" /> Dinheiro</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(totals.cash)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Smartphone size={16} className="text-cyan-400" /> PIX</span>
                    <span className="font-bold text-cyan-400">{formatCurrency(totals.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><CreditCard size={16} className="text-purple-400" /> Credito</span>
                    <span className="font-bold text-purple-400">{formatCurrency(totals.credit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Wallet size={16} className="text-blue-400" /> Debito</span>
                    <span className="font-bold text-blue-400">{formatCurrency(totals.debit)}</span>
                  </div>
                  {totals.taxState > 0 && (
                    <div className="flex justify-between items-center p-3 bg-indigo-500/10 rounded-lg">
                      <span className="text-sm text-muted">Taxa Estadual</span>
                      <span className="font-bold text-indigo-400">{formatCurrency(totals.taxState)}</span>
                    </div>
                  )}
                  {totals.taxFederal > 0 && (
                    <div className="flex justify-between items-center p-3 bg-rose-500/10 rounded-lg">
                      <span className="text-sm text-muted">Taxa Federal</span>
                      <span className="font-bold text-rose-400">{formatCurrency(totals.taxFederal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <span className="text-sm text-muted">Taxas de Embarque</span>
                    <span className="font-bold text-amber-400">{formatCurrency(totals.taxState + totals.taxFederal)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-t-2 border-primary">
                    <span className="text-sm font-semibold text-foreground">Total Geral</span>
                    <span className="font-bold text-xl text-foreground">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
              </Card>

              {/* Acoes Rapidas */}
              <Card>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Acoes Rapidas</h3>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => setSection("historico")}
                  >
                    <ChevronRight size={16} className="mr-2" />
                    Ver Historico Completo
                  </Button>
                  <Button 
                    variant="danger" 
                    className="w-full" 
                    onClick={openCloseShiftModal}
                    disabled={!shift || operatorBlocked}
                  >
                    Fechar Caixa PDV
                  </Button>
                  {!shift && (
                    <p className="text-xs text-muted">Abra um turno para habilitar o fechamento do caixa.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Ultimas Vendas */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Ultimas Vendas</h3>
              <Badge variant="secondary">{txs.length} hoje</Badge>
            </div>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => tx.company_name },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
                { key: "comp", header: "Comprovante", render: (tx) => tx.receipt_count > 0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : <span className="text-muted">-</span> },
              ]}
              rows={txs.slice(0, 8)}
              emptyMessage="Nenhuma venda registrada."
            />
          </Card>
        </div>
      )}

      {/* ===== HISTORICO ===== */}
      {show("historico") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Historico de Lancamentos</h1>
              <p className="text-sm text-muted">Todos os lancamentos do turno atual</p>
            </div>
            <Button variant="primary" onClick={() => setSection("caixa-pdv")}>
              <Plus size={16} className="mr-1" />
              Novo Lancamento
            </Button>
          </div>

          {/* Comprovantes Pendentes */}
          {pendingReceiptTxs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-warning" size={20} />
                <h3 className="font-semibold text-warning">Comprovantes Pendentes ({pendingReceiptTxs.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingReceiptTxs.slice(0,8).map(tx=>(
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tx.company_name} - {formatCurrency(Number(tx.amount))}</p>
                      <p className="text-xs text-muted">{tx.payment_method.toUpperCase()} - {isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--"}</p>
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploadingTxId===tx.id||operatorBlocked}
                        onClick={() => document.getElementById(`receipt-input-${tx.id}`)?.click()}
                      >
                        {uploadingTxId===tx.id ? "Enviando..." : "Anexar Comprovante"}
                      </Button>
                      <input
                        id={`receipt-input-${tx.id}`}
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        disabled={uploadingTxId===tx.id||operatorBlocked}
                        onChange={e=>handleUploadReceipt(tx.id,e)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Resumo do Turno */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="text-center p-4">
              <p className="text-xs text-muted uppercase mb-1">Dinheiro</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.cash)}</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-xs text-muted uppercase mb-1">PIX</p>
              <p className="text-xl font-bold text-cyan-400">{formatCurrency(totals.pix)}</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-xs text-muted uppercase mb-1">Credito</p>
              <p className="text-xl font-bold text-purple-400">{formatCurrency(totals.credit)}</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-xs text-muted uppercase mb-1">Debito</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(totals.debit)}</p>
            </Card>
            {totals.taxState > 0 && (
              <Card className="text-center p-4 bg-indigo-500/10">
                <p className="text-xs text-muted uppercase mb-1">Taxa Estadual</p>
                <p className="text-xl font-bold text-indigo-400">{formatCurrency(totals.taxState)}</p>
              </Card>
            )}
            {totals.taxFederal > 0 && (
              <Card className="text-center p-4 bg-rose-500/10">
                <p className="text-xs text-muted uppercase mb-1">Taxa Federal</p>
                <p className="text-xl font-bold text-rose-400">{formatCurrency(totals.taxFederal)}</p>
              </Card>
            )}
            <Card className="text-center p-4 border-primary/30 bg-primary/5">
              <p className="text-xs text-muted uppercase mb-1">Total</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
            </Card>
          </div>

          {/* Tabela de Lancamentos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Lancamentos ({txs.length})</h3>
              <Badge variant="secondary">{txs.length} registro{txs.length !== 1 ? "s" : ""}</Badge>
            </div>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => <span className="font-semibold">{tx.company_name}</span> },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
                { key: "comprovante", header: "Comprovante", render: (tx) => tx.receipt_count>0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : <span className="text-muted">-</span> },
              ]}
              rows={txs}
              emptyMessage="Sem lancamentos neste turno."
            />
          </Card>
        </div>
      )}

      {/* ===== PONTO DIGITAL ===== */}
      {show("ponto") && (
        <OperatorPunchSection
          punches={punches}
          operatorBlocked={operatorBlocked}
          isMounted={isMounted}
          onRegisterPunch={registerPunch}
        />
      )}

      {/* ===== CONFIGURACOES ===== */}
      {show("configuracoes") && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
            <p className="text-sm text-muted">Preferencias do operador</p>
          </div>
          <Card>
            <p className="text-muted">Em breve: configuracoes do operador.</p>
          </Card>
        </div>
      )}

      {/* Modal Fechamento */}
      {showCloseModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl">
            <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Fechamento de Caixa do Turno</h2>
                <p className="text-sm text-muted">
                  Confira o resumo financeiro do guiche {booths.find((item) => item.booth_id === shift.booth_id)?.booth_name ?? "atual"} antes de encerrar o turno.
                </p>
              </div>
              <Badge variant={closeDifferenceStatus.variant}>{closeDifferenceStatus.label}</Badge>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-success/20 bg-success/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Total esperado em caixa</p>
                  <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(expectedCashVal)}</p>
                  <p className="text-xs text-muted">Dinheiro + suprimentos - sangrias ± ajustes</p>
                </div>
                <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Valor contado</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{closeDeclared.trim() ? formatCurrency(closeDeclaredValue) : "A informar"}</p>
                  <p className="text-xs text-muted">Informe o valor real contado na gaveta</p>
                </div>
                <div className={`rounded-lg border p-4 ${closeDifferenceToneClass}`}>
                  <p className="text-xs uppercase tracking-wide">Diferenca projetada</p>
                  <p className="mt-1 text-2xl font-bold">{closeDeclared.trim() ? formatCurrency(closeDifferencePreview) : formatCurrency(0)}</p>
                  <p className="text-xs opacity-80">
                    {closeDeclared.trim() ? (closeDifferencePreview === 0 ? "Caixa conferido" : closeDifferencePreview > 0 ? "Valor declarado acima do esperado" : "Valor declarado abaixo do esperado") : "Aguardando valor contado manual"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">Totais por forma de pagamento</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <p className="text-xs text-muted">Dinheiro</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(totals.cash)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 p-3">
                    <p className="text-xs text-muted">PIX</p>
                    <p className="text-lg font-bold text-cyan-400">{formatCurrency(totals.pix)}</p>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-3">
                    <p className="text-xs text-muted">Credito</p>
                    <p className="text-lg font-bold text-purple-400">{formatCurrency(totals.credit)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <p className="text-xs text-muted">Debito</p>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(totals.debit)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">Movimentos de caixa relevantes</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs text-muted">Suprimento</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(cashTotals.suprimento)}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs text-muted">Sangria</p>
                    <p className="text-lg font-bold text-amber-400">{formatCurrency(cashTotals.sangria)}</p>
                  </div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                    <p className="text-xs text-muted">Ajuste</p>
                    <p className="text-lg font-bold text-sky-400">{formatCurrency(cashTotals.ajuste)}</p>
                  </div>
                </div>
                {recentCashMovements.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-3">
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted">Ultimos movimentos</p>
                    <div className="space-y-2">
                      {recentCashMovements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{movement.movement_type === "suprimento" ? "Suprimento" : movement.movement_type === "sangria" ? "Sangria" : "Ajuste"}</p>
                            <p className="text-xs text-muted">{movement.note ?? "Sem observacao"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{formatCurrency(Number(movement.amount || 0))}</p>
                            <p className="text-xs text-muted">{isMounted ? new Date(movement.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Valor contado manual (gaveta)"
                  value={closeDeclared}
                  onChange={e => setCloseDeclared(e.target.value)}
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={expectedCashVal ? expectedCashVal.toFixed(2) : "0,00"}
                />
                <Input
                  label="Observacoes do fechamento (opcional)"
                  value={closeObs}
                  onChange={e => setCloseObs(e.target.value)}
                  placeholder="Ex.: troco inicial, divergencia identificada, observacoes finais"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted">
                Ao confirmar, o sistema registra o fechamento em `shift_cash_closings` e encerra o turno atual com seguranca.
              </p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)}>Continuar operando</Button>
                <Button type="button" variant="danger" onClick={confirmCloseShift} disabled={isClosing || !closeDeclared.trim()}>
                  {isClosing ? "Concluindo fechamento..." : "Concluir fechamento e encerrar turno"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Suprimento/Sangria */}
      {showCashModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {cashModalType === "suprimento" ? "Novo Suprimento" : "Nova Sangria"}
            </h2>
            <form onSubmit={submitCashMovement} className="space-y-4">
              <Input
                label="Valor (R$)"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                required
              />
              <Input
                label="Observacao (Opcional)"
                value={cashNote}
                onChange={e => setCashNote(e.target.value)}
                placeholder="Motivo ou descricao"
              />
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowCashModal(false)}>Cancelar</Button>
                <Button type="submit" variant={cashModalType === "suprimento" ? "success" : "danger"}>
                  Confirmar {cashModalType === "suprimento" ? "Suprimento" : "Sangria"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Confirmacao Venda PDV */}
      {showPdvConfirm && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Confirmar Venda</h2>
            <div className="space-y-4">
              <div className="bg-slate-800 p-6 rounded-lg text-center">
                <p className="text-sm text-muted mb-1">Valor Total</p>
                <p className="text-4xl font-bold text-emerald-400">{formatCurrency(pdvTotalAmount)}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Base: {formatCurrency(pdvBaseAmount)} • Taxas: {formatCurrency(pdvTaxStateValue + pdvTaxFederalValue)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-muted text-xs">Empresa</p>
                  <p className="font-semibold text-foreground">{companies.find(c => c.id === pdvCompanyId)?.name || "-"}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-muted text-xs">Pagamento</p>
                  <p className="font-semibold text-foreground capitalize">{pdvPaymentMethod === "cash" ? "Dinheiro" : pdvPaymentMethod === "link" ? "Link Pag." : pdvPaymentMethod.toUpperCase()}</p>
                  {pdvPaymentMethod === "credit" && (
                    <p className="mt-1 text-xs text-purple-300">Parcelado em {pdvInstallmentsValue}x</p>
                  )}
                </div>
              </div>
              {pdvTicketRef && (
                <div className="bg-slate-800/50 p-3 rounded-lg text-sm">
                  <p className="text-muted text-xs">Referencia</p>
                  <p className="font-semibold text-foreground">{pdvTicketRef}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowPdvConfirm(false)}>Cancelar</Button>
              <Button type="button" variant="success" onClick={pdvSubmitSale}>
                <Check size={16} className="mr-1" />
                Confirmar Venda
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Taxa de Embarque */}
      {showTaxaConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Taxas de Embarque Vigentes</h2>
              <button onClick={() => setShowTaxaConfig(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {taxasEmbarque.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  Nenhuma taxa de embarque ativa foi configurada pelo admin.
                </div>
              ) : (
                taxasEmbarque.map((taxa) => (
                  <div key={taxa.id} className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                    <div>
                      <p className="font-semibold text-foreground">{taxa.name}</p>
                      <p className="text-sm text-muted">{formatCurrency(Number(taxa.amount ?? 0))}</p>
                    </div>
                    <Badge variant={taxa.tax_type === "estadual" ? "warning" : "info"}>
                      {taxa.tax_type === "estadual" ? "Estadual" : "Federal"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4">
              <p className="text-xs text-muted">Esses valores sao gerenciados no painel do admin em `Configuracoes`.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Chat com Admin */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="flex h-[80vh] w-full max-w-lg flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/20">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Conversa privada com o Admin</h2>
                  <p className="text-xs text-muted">Guiche: {activeChatBoothName}</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare size={48} className="mx-auto mb-3 text-muted opacity-50" />
                  <p className="text-muted">Nenhuma mensagem ainda.</p>
                  <p className="text-xs text-muted">Use esta conversa para falar diretamente com o admin do guiche.</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const sentByOperator = msg.sender_role === "operator";
                  return (
                    <div key={msg.id} className={`flex ${sentByOperator ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[82%] rounded-xl border p-3 ${
                          sentByOperator
                            ? "rounded-tr-sm border-primary/30 bg-primary/20"
                            : "rounded-tl-sm border-border bg-slate-800/70"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`text-[11px] font-semibold uppercase tracking-wide ${sentByOperator ? "text-primary" : "text-emerald-400"}`}>
                            {sentByOperator ? "Voce" : "Admin"}
                          </span>
                          {!sentByOperator && !msg.read && <Badge variant="warning">Nova</Badge>}
                        </div>
                        <p className="text-sm text-foreground">{msg.message}</p>
                        <div className={`mt-2 flex items-center gap-2 ${sentByOperator ? "justify-end" : "justify-between"}`}>
                          <p className="text-xs text-muted">
                            {isMounted ? new Date(msg.created_at).toLocaleString("pt-BR") : "--"}
                          </p>
                          {sentByOperator ? (
                            msg.read ? <Check size={12} className="text-emerald-400" /> : <Clock size={12} className="text-amber-400" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex gap-2">
                <Input
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder={`Mensagem para o admin de ${activeChatBoothName}...`}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChatMessage();
                    }
                  }}
                />
                <Button variant="primary" onClick={() => void sendChatMessage()} disabled={!newChatMessage.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </RebuildShell>
  );
}
