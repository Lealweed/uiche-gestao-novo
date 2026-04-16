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
import { getChatAttachmentUrl, isImageChatAttachment, uploadChatAttachment, validateChatAttachment } from "@/lib/chat-attachments";
import { Plus, RefreshCw, Banknote, CreditCard, Clock, AlertTriangle, Delete, Download, Paperclip, Send, MessageSquare, Link2, Smartphone, Wallet, MapPin, Settings, X, Check, ChevronRight, Bell } from "lucide-react";

const supabase = createClient();

type Option     = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null };
type Category   = { id: string; name: string };
type Subcategory= { id: string; name: string; category_id: string };
type Shift      = { id: string; booth_id: string; status: "open" | "closed"; opened_at?: string; notes?: string | null };
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

type DailyCashClosingRow = {
  id: string;
  office_id: string;
  user_id: string;
  date: string;
  company: string;
  total_sold: number;
  amount_pix: number;
  amount_card: number;
  amount_cash: number;
  ceia_amount: number;
  cash_net: number;
  status: "open" | "closed";
  notes: string | null;
  created_at: string;
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
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  return Number(normalized) || 0;
}

function maskMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [closeChecklist, setCloseChecklist] = useState({
    vendas: false,
    movimentos: false,
    caixa: false,
    comprovantes: false,
  });
  const [lastCloseResult, setLastCloseResult] = useState<LastCloseResult | null>(null);
  const [dailyClosingDate, setDailyClosingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyClosingCompany, setDailyClosingCompany] = useState("");
  const [dailyClosingTotalSold, setDailyClosingTotalSold] = useState("");
  const [dailyClosingPix, setDailyClosingPix] = useState("");
  const [dailyClosingCard, setDailyClosingCard] = useState("");
  const [dailyClosingCash, setDailyClosingCash] = useState("");
  const [dailyClosingCeia, setDailyClosingCeia] = useState("");
  const [dailyClosingNotes, setDailyClosingNotes] = useState("");
  const [dailyClosings, setDailyClosings] = useState<DailyCashClosingRow[]>([]);
  const [isSavingDailyClosing, setIsSavingDailyClosing] = useState(false);
  const [dailyClosingFilterDate, setDailyClosingFilterDate] = useState("");
  const [dailyClosingFilterCompany, setDailyClosingFilterCompany] = useState("");
  const [selectedDailyClosingId, setSelectedDailyClosingId] = useState<string | null>(null);
  
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<"suprimento"|"sangria">("suprimento");
  
  const [section, setSection] = useState("caixa-pdv");
  const [isMounted, setIsMounted] = useState(false);

  // Fix #7: Paginacao e busca no historico
  const [historySearch, setHistorySearch] = useState("");
  const [txPage, setTxPage] = useState(0);
  const txPageSize = 30;

  // Fix #8: Erros visuais de validacao PDV
  const [pdvFieldErrors, setPdvFieldErrors] = useState<Record<string, boolean>>({});

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
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_type?: string | null;
    attachment_size?: number | null;
    attachment_url?: string | null;
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [newChatAttachment, setNewChatAttachment] = useState<File | null>(null);
  const [chatAttachmentKey, setChatAttachmentKey] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const attendanceCheckoutSentRef = useRef(false);
  const showChatRef = useRef(showChat);
  showChatRef.current = showChat;

  const activeChatBoothId = shift?.booth_id || boothId || "";
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
        supabase.from("shifts").select("id,booth_id,status,opened_at,notes").eq("operator_id",uid).eq("status","open").maybeSingle(),
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
      if (sData) {
        setShift(sData);
        setBoothId(sData.booth_id);
        await loadTxs(sData.id);
        await loadCashMovements(sData.id);
      }
      await loadPunches(uid);
      await loadDailyClosings(uid);
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

  // Fix #2: Verificar status do operador periodicamente (60s)
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("profiles").select("active").eq("user_id", userId).single();
      if (data && (data as { active?: boolean }).active === false) {
        setOperatorActive(false);
        await supabase.auth.signOut();
        router.replace("/login");
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [userId, router]);

  // Fix #9: Checkout de presenca com visibilitychange + retry
  useEffect(() => {
    if (!userId || operatorActive === false) return;

    attendanceCheckoutSentRef.current = false;

    const endpoint = "/api/attendance/checkout";
    const payload = JSON.stringify({ user_id: userId });

    const sendAttendanceCheckout = () => {
      if (attendanceCheckoutSentRef.current) return;
      attendanceCheckoutSentRef.current = true;

      let sent = false;
      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          sent = navigator.sendBeacon(endpoint, blob);
        }
      } catch {
        // fallback abaixo
      }

      if (!sent) {
        void fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          credentials: "include",
          keepalive: true,
        }).catch(() => {
          // Retry uma vez apos 500ms
          attendanceCheckoutSentRef.current = false;
          setTimeout(() => {
            if (attendanceCheckoutSentRef.current) return;
            attendanceCheckoutSentRef.current = true;
            void fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              credentials: "include",
              keepalive: true,
            }).catch(() => undefined);
          }, 500);
        });
      }
    };

    const handlePageExit = () => sendAttendanceCheckout();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendAttendanceCheckout();
    };

    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [operatorActive, userId]);

  async function loadTxs(shiftId: string) {
    const txRes = await supabase.from("transactions").select("id,amount,payment_method,sold_at,ticket_reference,note,company_id,boarding_tax_state,boarding_tax_federal").eq("shift_id",shiftId).eq("status","posted").order("sold_at",{ascending:false}).limit(500);
    if (txRes.error) return;
    setTxPage(0);
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

  async function loadDailyClosings(uid: string) {
    const res = await supabase
      .from("daily_cash_closings")
      .select("id,office_id,user_id,date,company,total_sold,amount_pix,amount_card,amount_cash,ceia_amount,cash_net,status,notes,created_at")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);

    if (res.error) {
      if (!isSchemaToleranceError(res.error)) {
        console.warn("Falha ao carregar fechamentos diarios:", res.error.message);
      }
      return;
    }

    setDailyClosings((res.data as DailyCashClosingRow[] | null) ?? []);
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
    const { error } = await supabase
      .from("audit_logs")
      .insert({ created_by:userId, action, entity:entity??null, entity_id:entityId??null, details:details??{} });

    if (error && !isSchemaToleranceError(error)) {
      console.warn("Falha ao registrar auditoria operador:", error.message);
    }
  }

  async function saveDailyClosing() {
    if (!userId) return;

    const officeId = shift?.booth_id ?? boothId;
    if (!officeId) {
      setMessage("Selecione um guiche ou abra o turno antes de salvar o fechamento.");
      return;
    }

    if (!dailyClosingDate) {
      setMessage("Informe a data do fechamento.");
      return;
    }

    if (!dailyClosingCompany.trim()) {
      setMessage("Selecione a empresa para salvar o fechamento.");
      return;
    }

    const totalSold = Number(parseMoneyInput(dailyClosingTotalSold).toFixed(2));
    const amountPix = Number(parseMoneyInput(dailyClosingPix).toFixed(2));
    const amountCard = Number(parseMoneyInput(dailyClosingCard).toFixed(2));
    const amountCash = Number(parseMoneyInput(dailyClosingCash).toFixed(2));
    const ceiaAmount = Number(parseMoneyInput(dailyClosingCeia).toFixed(2));
    const detailTotal = Number((amountPix + amountCard + amountCash).toFixed(2));
    const cashNet = Number((amountCash - ceiaAmount).toFixed(2));

    if ([totalSold, amountPix, amountCard, amountCash, ceiaAmount].some((value) => value < 0)) {
      setMessage("Os valores do fechamento precisam ser maiores ou iguais a zero.");
      return;
    }

    if (Math.abs(detailTotal - totalSold) > 0.009) {
      setMessage("Pix + cartao + dinheiro deve ser exatamente igual ao total vendido.");
      return;
    }

    setIsSavingDailyClosing(true);
    try {
      const { error } = await supabase.from("daily_cash_closings").upsert(
        {
          office_id: officeId,
          user_id: userId,
          date: dailyClosingDate,
          company: dailyClosingCompany.trim(),
          total_sold: totalSold,
          amount_pix: amountPix,
          amount_card: amountCard,
          amount_cash: amountCash,
          ceia_amount: ceiaAmount,
          status: "open",
          notes: dailyClosingNotes.trim() || null,
        },
        { onConflict: "office_id,user_id,date,company" },
      );

      if (error) {
        setMessage(`Erro ao salvar fechamento: ${error.message}`);
        return;
      }

      await logAction("SAVE_DAILY_CASH_CLOSING", "daily_cash_closings", undefined, {
        office_id: officeId,
        date: dailyClosingDate,
        company: dailyClosingCompany.trim(),
        total_sold: totalSold,
        amount_pix: amountPix,
        amount_card: amountCard,
        amount_cash: amountCash,
        ceia_amount: ceiaAmount,
        cash_net: cashNet,
      });

      setDailyClosingCompany("");
      setDailyClosingTotalSold("");
      setDailyClosingPix("");
      setDailyClosingCard("");
      setDailyClosingCash("");
      setDailyClosingCeia("");
      setDailyClosingNotes("");
      await loadDailyClosings(userId);
      setMessage(cashNet < 0 ? `Fechamento salvo com alerta: saldo de dinheiro negativo em ${formatCurrency(cashNet)}.` : "Fechamento diario salvo com sucesso.");
    } finally {
      setIsSavingDailyClosing(false);
    }
  }

  async function openShift() {
    if (!boothId) return setMessage("Selecione um guiche.");
    setOpeningCash("0");
    setOpeningNote("");
    setShowOpenShiftModal(true);
  }

  async function confirmOpenShift() {
    if (!boothId || !userId) return setMessage("Selecione um guiche.");
    const parsedOpeningCash = parseMoneyInput(openingCash);
    if (openingCash.trim() === "" || Number.isNaN(parsedOpeningCash) || parsedOpeningCash < 0) {
      return setMessage("Informe um valor valido para o caixa inicial.");
    }

    setIsOpeningShift(true);
    try {
      const { data, error } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });
      if (error) return setMessage(`Erro: ${error.message}`);

      const createdShift = data as Shift;
      const noteValue = openingNote.trim();
      const openingCashValue = Number(parsedOpeningCash.toFixed(2));

      if (noteValue) {
        const { error: shiftNoteError } = await supabase
          .from("shifts")
          .update({ notes: `Abertura: ${noteValue}` })
          .eq("id", createdShift.id)
          .eq("operator_id", userId);

        if (shiftNoteError && !isSchemaToleranceError(shiftNoteError)) {
          console.warn("Falha ao salvar observacao de abertura:", shiftNoteError.message);
        }
      }

      if (openingCashValue > 0) {
        const { error: openingCashError } = await supabase.from("cash_movements").insert({
          shift_id: createdShift.id,
          booth_id: createdShift.booth_id,
          user_id: userId,
          movement_type: "suprimento",
          amount: openingCashValue,
          note: noteValue ? `Caixa inicial - ${noteValue}` : "Caixa inicial",
        });

        if (openingCashError) {
          setMessage(`Turno aberto, mas houve falha ao registrar o caixa inicial: ${openingCashError.message}`);
        }
      }

      await logAction("OPEN_SHIFT", "shifts", createdShift.id, {
        booth_id: boothId,
        opening_cash: openingCashValue,
        opening_note: noteValue || null,
      });

      setLastCloseResult(null);
      setShift(createdShift);
      setBoothId(createdShift.booth_id);
      setShowOpenShiftModal(false);
      setMessage(openingCashValue > 0 ? "Turno aberto e caixa inicial registrado." : "Turno aberto.");
      await loadTxs(createdShift.id);
      await loadCashMovements(createdShift.id);
    } finally {
      setIsOpeningShift(false);
    }
  }

  async function openCloseShiftModal() {
    if (!shift||!userId) return;
    const pending = pendingReceiptTxs.length;
    setDailyClosingDate(new Date().toISOString().slice(0, 10));
    setExpectedCashVal(dailyClosingExpectedCash);
    setCloseDeclared("");
    setCloseObs("");
    setCloseChecklist({ vendas: false, movimentos: false, caixa: false, comprovantes: false });
    setShowCloseModal(true);

    if (pending > 0) {
      setMessage(`${pending} lancamento(s) ainda estao sem comprovante. O fechamento por resumo pode continuar, mas revise as pendencias.`);
    }
  }

  async function confirmCloseShift() {
    if (!shift||!userId) return;
    setIsClosing(true);
    try {
      if (currentDailyClosingRows.length === 0) {
        setMessage("Salve ao menos um fechamento por empresa antes de fechar o turno.");
        return;
      }

      const declaredCash = parseMoneyInput(closeDeclared);
      if (Number.isNaN(declaredCash) || declaredCash < 0) { setMessage("Informe um valor contado valido."); return; }
      if (!Object.values(closeChecklist).every(Boolean)) {
        setMessage("Confirme todo o checklist antes de concluir o fechamento do turno.");
        return;
      }

      const difference = Number((declaredCash-expectedCashVal).toFixed(2));
      if (difference !== 0 && !closeObs.trim()) {
        setMessage("Descreva a divergencia no campo de observacoes para concluir o fechamento.");
        return;
      }

      const obs = closeObs.trim();
      const normalizedExpected = Number(expectedCashVal.toFixed(2));
      const normalizedDeclared = Number(declaredCash.toFixed(2));
      const closingSummary = [
        obs || null,
        "Checklist ok: vendas, movimentos, caixa fisico e comprovantes conferidos.",
        `Resumo diario -> total ${dailyClosingSummary.totalSold.toFixed(2)}, pix ${dailyClosingSummary.pix.toFixed(2)}, cartao ${dailyClosingSummary.card.toFixed(2)}, dinheiro ${dailyClosingSummary.cash.toFixed(2)}, ceia ${dailyClosingSummary.ceia.toFixed(2)}, liquido ${dailyClosingSummary.cashNet.toFixed(2)}.`,
        `Movimentos -> suprimento ${cashTotals.suprimento.toFixed(2)}, sangria ${cashTotals.sangria.toFixed(2)}, ajuste ${cashTotals.ajuste.toFixed(2)}.`,
      ].filter(Boolean).join(" | ");

      const { error: saveClosingError } = await supabase.from("shift_cash_closings").upsert({
        shift_id:shift.id,
        booth_id:shift.booth_id,
        user_id:userId,
        expected_cash:normalizedExpected,
        declared_cash:normalizedDeclared,
        difference,
        note:closingSummary || null,
      });
      if (saveClosingError) { setMessage(`Erro ao registrar fechamento: ${saveClosingError.message}`); return; }

      const { error } = await supabase.rpc("close_shift",{p_shift_id:shift.id,p_ip:null,p_notes:closingSummary || null});
      if (error) { setMessage(`Erro: ${error.message}`); return; }

      const { error: closeDailyRowsError } = await supabase
        .from("daily_cash_closings")
        .update({ status: "closed" })
        .eq("user_id", userId)
        .eq("office_id", shift.booth_id)
        .eq("date", dailyClosingDate);

      if (closeDailyRowsError && !isSchemaToleranceError(closeDailyRowsError)) {
        console.warn("Falha ao atualizar status dos fechamentos diarios:", closeDailyRowsError.message);
      }

      await logAction("CLOSE_SHIFT","shifts",shift.id,{expected_cash:expectedCashVal,declared_cash:declaredCash,difference,checklist_confirmed:true,shift_duration_label:shiftDurationLabel,summary_date:dailyClosingDate,summary_rows:currentDailyClosingRows.length});
      setLastCloseResult({ expectedCash: normalizedExpected, declaredCash: normalizedDeclared, difference, note: closingSummary || null, closedAt: new Date().toISOString() });
      await loadDailyClosings(userId);
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
    const errors: Record<string, boolean> = {};

    if (!pdvCompanyId) {
      errors.pdvCompany = true;
      setMessage("Selecione a empresa para concluir a venda.");
    }

    if (baseValue <= 0) {
      errors.pdvAmount = true;
      setMessage("Informe um valor valido para a venda.");
    }

    if (Object.keys(errors).length > 0) {
      setPdvFieldErrors(errors);
      return;
    }

    setPdvFieldErrors({});
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

  // ===== FIX #4: ESTORNO DE TRANSACAO =====
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function cancelTransaction(txId: string) {
    if (!shift || !userId || !cancelReason.trim()) {
      setMessage("Informe o motivo do estorno para continuar.");
      return;
    }
    setCancellingTxId(txId);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "cancelled", note: `[ESTORNO] ${cancelReason.trim()}` })
        .eq("id", txId)
        .eq("shift_id", shift.id)
        .eq("status", "posted");
      if (error) return setMessage(`Erro ao estornar: ${error.message}`);
      await logAction("CANCEL_TRANSACTION", "transactions", txId, { reason: cancelReason.trim() });
      setShowCancelConfirm(null);
      setCancelReason("");
      setMessage("Transacao estornada com sucesso.");
      await loadTxs(shift.id);
    } finally {
      setCancellingTxId(null);
    }
  }

  // ===== FUNCOES CHAT =====
  function resetChatAttachment() {
    setNewChatAttachment(null);
    setChatAttachmentKey((prev) => prev + 1);
  }

  function handleChatAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      resetChatAttachment();
      return;
    }

    const validationError = validateChatAttachment(file);
    if (validationError) {
      setMessage(validationError);
      resetChatAttachment();
      return;
    }

    setNewChatAttachment(file);
  }

  const loadChatMessages = useCallback(async () => {
    if (!userId) return;

    const query = await supabase
      .from("operator_messages")
      .select("id, message, created_at, read, booth_id, sender_role, attachment_path, attachment_name, attachment_type, attachment_size")
      .eq("operator_id", userId)
      .order("created_at", { ascending: true })
      .limit(150);

    if (!query.error && query.data) {
      const allMessages: ChatMessage[] = await Promise.all(((query.data as ChatMessage[]) || []).map(async (msg) => ({
        ...msg,
        booth_id: msg.booth_id ?? null,
        sender_role: msg.sender_role === "operator" ? "operator" : "admin",
        attachment_path: msg.attachment_path ?? null,
        attachment_name: msg.attachment_name ?? null,
        attachment_type: msg.attachment_type ?? null,
        attachment_size: msg.attachment_size ?? null,
        attachment_url: await getChatAttachmentUrl(supabase, msg.attachment_path ?? null),
      })));
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
          attachment_path: null,
          attachment_name: null,
          attachment_type: null,
          attachment_size: null,
          attachment_url: null,
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
    // Fix #6: Channel name unico por booth para evitar leak de subscriptions
    const channelName = `op-messages-${userId}-${activeChatBoothId || "global"}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        void (async () => {
          const raw = payload.new as ChatMessage;
          const normalized: ChatMessage = {
            ...raw,
            booth_id: raw.booth_id ?? null,
            sender_role: raw.sender_role === "operator" ? "operator" : "admin",
            attachment_path: raw.attachment_path ?? null,
            attachment_name: raw.attachment_name ?? null,
            attachment_type: raw.attachment_type ?? null,
            attachment_size: raw.attachment_size ?? null,
            attachment_url: await getChatAttachmentUrl(supabase, raw.attachment_path ?? null),
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
        })();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        void (async () => {
          const raw = payload.new as ChatMessage;
          const updated: ChatMessage = {
            ...raw,
            booth_id: raw.booth_id ?? null,
            sender_role: raw.sender_role === "operator" ? "operator" : "admin",
            attachment_path: raw.attachment_path ?? null,
            attachment_name: raw.attachment_name ?? null,
            attachment_type: raw.attachment_type ?? null,
            attachment_size: raw.attachment_size ?? null,
            attachment_url: await getChatAttachmentUrl(supabase, raw.attachment_path ?? null),
          };
          const belongsToCurrentBooth = !activeChatBoothId || (updated.booth_id ?? activeChatBoothId) === activeChatBoothId;
          if (belongsToCurrentBooth) {
            setChatMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
          }
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatBoothId, activeChatBoothName, userId]);

  async function sendChatMessage() {
    if (!userId || !activeChatBoothId || (!newChatMessage.trim() && !newChatAttachment) || isSendingChat) return;
    setIsSendingChat(true);
    try {

    let attachmentPayload: {
      attachment_path?: string;
      attachment_name?: string;
      attachment_type?: string;
      attachment_size?: number;
    } = {};

    if (newChatAttachment) {
      try {
        const uploaded = await uploadChatAttachment(supabase, userId, newChatAttachment);
        attachmentPayload = {
          attachment_path: uploaded.attachment_path,
          attachment_name: uploaded.attachment_name,
          attachment_type: uploaded.attachment_type,
          attachment_size: uploaded.attachment_size,
        };
      } catch (error) {
        setMessage(`Erro ao enviar anexo: ${error instanceof Error ? error.message : "falha no upload"}`);
        return;
      }
    }

    const payload = {
      operator_id: userId,
      booth_id: activeChatBoothId,
      sender_role: "operator" as const,
      message: newChatMessage.trim() || `Anexo enviado: ${newChatAttachment?.name ?? "arquivo"}`,
      read: false,
      ...attachmentPayload,
    };
    const { error } = await supabase.from("operator_messages").insert(payload);
    if (error) {
      return setMessage(
        isSchemaToleranceError(error)
          ? "Chat com anexos requer a migration de arquivos da conversa antes do envio."
          : `Erro: ${error.message}`
      );
    }
    setNewChatMessage("");
    resetChatAttachment();
    setMessage(`Mensagem enviada para o admin do guiche ${activeChatBoothName}.`);
    await loadChatMessages();
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } finally {
      setIsSendingChat(false);
    }
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
  const activeOfficeId = shift?.booth_id ?? boothId;
  const dailyClosingFormTotal = useMemo(() => parseMoneyInput(dailyClosingTotalSold), [dailyClosingTotalSold]);
  const dailyClosingFormPix = useMemo(() => parseMoneyInput(dailyClosingPix), [dailyClosingPix]);
  const dailyClosingFormCard = useMemo(() => parseMoneyInput(dailyClosingCard), [dailyClosingCard]);
  const dailyClosingFormCash = useMemo(() => parseMoneyInput(dailyClosingCash), [dailyClosingCash]);
  const dailyClosingFormCeia = useMemo(() => parseMoneyInput(dailyClosingCeia), [dailyClosingCeia]);
  const dailyClosingDetailTotal = useMemo(() => Number((dailyClosingFormPix + dailyClosingFormCard + dailyClosingFormCash).toFixed(2)), [dailyClosingFormPix, dailyClosingFormCard, dailyClosingFormCash]);
  const dailyClosingDifference = useMemo(() => Number((dailyClosingFormTotal - dailyClosingDetailTotal).toFixed(2)), [dailyClosingFormTotal, dailyClosingDetailTotal]);
  const dailyClosingNetPreview = useMemo(() => Number((dailyClosingFormCash - dailyClosingFormCeia).toFixed(2)), [dailyClosingFormCash, dailyClosingFormCeia]);
  const currentDailyClosingRows = useMemo(
    () => dailyClosings.filter((row) => row.date === dailyClosingDate && (!activeOfficeId || row.office_id === activeOfficeId)),
    [activeOfficeId, dailyClosings, dailyClosingDate],
  );
  const dailyClosingSummary = useMemo(
    () => currentDailyClosingRows.reduce(
      (acc, row) => ({
        totalSold: acc.totalSold + Number(row.total_sold || 0),
        pix: acc.pix + Number(row.amount_pix || 0),
        card: acc.card + Number(row.amount_card || 0),
        cash: acc.cash + Number(row.amount_cash || 0),
        ceia: acc.ceia + Number(row.ceia_amount || 0),
        cashNet: acc.cashNet + Number(row.cash_net || 0),
      }),
      { totalSold: 0, pix: 0, card: 0, cash: 0, ceia: 0, cashNet: 0 },
    ),
    [currentDailyClosingRows],
  );
  const dailyClosingExpectedCash = useMemo(
    () => Number((dailyClosingSummary.cashNet + cashTotals.suprimento - cashTotals.sangria + cashTotals.ajuste).toFixed(2)),
    [dailyClosingSummary, cashTotals],
  );
  const filteredDailyClosingRows = useMemo(() => {
    const companyQuery = dailyClosingFilterCompany.trim().toLowerCase();
    return dailyClosings.filter((row) => {
      const matchesDate = !dailyClosingFilterDate || row.date === dailyClosingFilterDate;
      const matchesCompany = !companyQuery || row.company.toLowerCase().includes(companyQuery);
      return matchesDate && matchesCompany;
    });
  }, [dailyClosings, dailyClosingFilterCompany, dailyClosingFilterDate]);
  const selectedDailyClosing = useMemo(
    () => filteredDailyClosingRows.find((row) => row.id === selectedDailyClosingId) ?? null,
    [filteredDailyClosingRows, selectedDailyClosingId],
  );
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
  const closeChecklistComplete = Object.values(closeChecklist).every(Boolean);
  const recentCashMovements = useMemo(() => cashMovements.slice(0, 4), [cashMovements]);
  const openingCashRegistered = useMemo(() => {
    const openingMovement = cashMovements.find(
      (movement) => movement.movement_type === "suprimento" && (movement.note ?? "").toLowerCase().includes("caixa inicial"),
    );
    return Number(openingMovement?.amount ?? 0);
  }, [cashMovements]);
  // Fix #5: Duracao do turno em tempo real com interval
  const [shiftDurationLabel, setShiftDurationLabel] = useState("Sem turno ativo");
  const [shiftNeedsAttention, setShiftNeedsAttention] = useState(false);
  useEffect(() => {
    function updateDuration() {
      if (!shift?.opened_at) {
        setShiftDurationLabel("Sem turno ativo");
        setShiftNeedsAttention(false);
        return;
      }
      const diffMs = Math.max(0, Date.now() - new Date(shift.opened_at).getTime());
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setShiftDurationLabel(hours <= 0 ? `${Math.max(1, minutes)} min` : `${hours}h ${minutes.toString().padStart(2, "0")}min`);
      setShiftNeedsAttention(diffMs >= 10 * 60 * 60 * 1000);
    }
    updateDuration();
    const interval = setInterval(updateDuration, 60_000);
    return () => clearInterval(interval);
  }, [shift]);
  const pdvBaseAmount = useMemo(() => parseMoneyInput(pdvDisplay), [pdvDisplay]);
  const pdvTaxStateValue = useMemo(() => parseMoneyInput(pdvBoardingTaxState), [pdvBoardingTaxState]);
  const pdvTaxFederalValue = useMemo(() => parseMoneyInput(pdvBoardingTaxFederal), [pdvBoardingTaxFederal]);
  const pdvInstallmentsValue = useMemo(() => Math.min(12, Math.max(1, Number.parseInt(pdvInstallments, 10) || 1)), [pdvInstallments]);
  const pdvTotalAmount = pdvBaseAmount + pdvTaxStateValue + pdvTaxFederalValue;
  const digitalTotal = totals.pix + totals.credit + totals.debit;
  const filteredSubs = useMemo(()=>subcategories.filter(s=>s.category_id===categoryId),[subcategories,categoryId]);
  const pendingReceiptTxs = useMemo(()=>txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0),[txs]);
  const operatorBlocked = operatorActive===false;

  // Fix #7: Filtragem e paginacao de transacoes
  const filteredTxs = useMemo(() => {
    if (!historySearch.trim()) return txs;
    const q = historySearch.toLowerCase();
    return txs.filter(tx =>
      tx.company_name.toLowerCase().includes(q) ||
      tx.payment_method.toLowerCase().includes(q) ||
      String(tx.amount).includes(q) ||
      (tx.ticket_reference ?? "").toLowerCase().includes(q) ||
      (tx.note ?? "").toLowerCase().includes(q)
    );
  }, [txs, historySearch]);
  const paginatedTxs = useMemo(() => filteredTxs.slice(txPage * txPageSize, (txPage + 1) * txPageSize), [filteredTxs, txPage, txPageSize]);

  useEffect(() => {
    if (showCloseModal) {
      setExpectedCashVal(dailyClosingExpectedCash);
    }
  }, [dailyClosingExpectedCash, showCloseModal]);

  useEffect(() => {
    if (!isMounted) return;

    function handleGlobalPdvKeydown(event: KeyboardEvent) {
      const isPdvSection = section === "caixa-pdv" || section === "nova-venda";
      if (!isPdvSection || !shift || operatorBlocked || showPdvConfirm || showCashModal || showCloseModal || showChat || showTaxaConfig) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Fix #1: Verificar foco em inputs via activeElement E event.target
      if (hasNativeInputFocus(document.activeElement) || hasNativeInputFocus(event.target)) return;

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
          dailySummary={{
            totalSold: dailyClosingSummary.totalSold,
            pix: dailyClosingSummary.pix,
            card: dailyClosingSummary.card,
            cash: dailyClosingSummary.cash,
            ceia: dailyClosingSummary.ceia,
            cashNet: dailyClosingSummary.cashNet,
            expectedCash: dailyClosingExpectedCash,
            count: currentDailyClosingRows.length,
          }}
          txs={txs}
          lastCloseResult={lastCloseResult}
          unreadChatCount={unreadChatCount}
          isMounted={isMounted}
          shiftDurationLabel={shiftDurationLabel}
          shiftNeedsAttention={shiftNeedsAttention}
          openingCash={openingCashRegistered}
          pendingReceiptCount={pendingReceiptTxs.length}
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
                    <span className={`text-5xl font-bold tracking-tight ${pdvFieldErrors.pdvAmount ? "text-rose-400 animate-pulse" : "text-white"}`}>
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
                    <label className={`block text-xs uppercase tracking-wider mb-2 ${pdvFieldErrors.pdvCompany ? "text-rose-400" : "text-muted"}`}>Empresa / Viacao {pdvFieldErrors.pdvCompany && <span className="text-rose-400">*</span>}</label>
                    <Select
                      value={pdvCompanyId}
                      onChange={e => { setPdvCompanyId(e.target.value); setPdvFieldErrors(prev => ({ ...prev, pdvCompany: false })); }}
                      disabled={!shift || operatorBlocked}
                      className={`w-full ${pdvFieldErrors.pdvCompany ? "border-rose-500 ring-1 ring-rose-500/30" : ""}`}
                    >
                      <option value="">Selecione a empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({getCompanyPct(c)}%)</option>)}
                    </Select>
                    {pdvFieldErrors.pdvCompany && <p className="mt-1 text-xs text-rose-400">Selecione uma empresa para continuar.</p>}
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

              {/* Resumo compacto do Turno */}
              <Card>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Resumo do Turno</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Dinheiro</span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(totals.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">PIX</span>
                    <span className="font-semibold text-cyan-400">{formatCurrency(totals.pix)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Cartao</span>
                    <span className="font-semibold text-purple-400">{formatCurrency(totals.credit + totals.debit)}</span>
                  </div>
                  {(totals.taxState + totals.taxFederal) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Taxas</span>
                      <span className="font-semibold text-amber-400">{formatCurrency(totals.taxState + totals.taxFederal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-foreground">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
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

          <Card>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Historico dos Fechamentos por Resumo</h3>
                <p className="text-sm text-muted">Consulte os fechamentos salvos por data e empresa.</p>
              </div>
              <Badge variant="secondary">{filteredDailyClosingRows.length} registro{filteredDailyClosingRows.length !== 1 ? "s" : ""}</Badge>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Filtrar por data"
                type="date"
                value={dailyClosingFilterDate}
                onChange={(e) => setDailyClosingFilterDate(e.target.value)}
              />
              <Input
                label="Filtrar por empresa"
                value={dailyClosingFilterCompany}
                onChange={(e) => setDailyClosingFilterCompany(e.target.value)}
                placeholder="Ex.: MP"
              />
            </div>

            <DataTable
              columns={[
                { key: "data", header: "Data", render: (row) => isMounted ? new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") : row.date },
                { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
                { key: "total", header: "Total vendido", render: (row) => formatCurrency(Number(row.total_sold || 0)) },
                { key: "pix", header: "PIX", render: (row) => formatCurrency(Number(row.amount_pix || 0)) },
                { key: "cartao", header: "Cartao", render: (row) => formatCurrency(Number(row.amount_card || 0)) },
                { key: "liquido", header: "Liquido", render: (row) => <span className={`font-semibold ${Number(row.cash_net || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(Number(row.cash_net || 0))}</span> },
                { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "closed" ? "success" : "warning"}>{row.status === "closed" ? "Fechado" : "Aberto"}</Badge> },
                { key: "acoes", header: "", render: (row) => <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedDailyClosingId(row.id)}>Ver detalhes</Button> },
              ]}
              rows={filteredDailyClosingRows}
              keyExtractor={(row) => row.id}
              emptyMessage="Nenhum fechamento diario salvo ainda."
            />

            {selectedDailyClosing && (
              <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Detalhes do fechamento</p>
                    <p className="text-xs text-muted">{selectedDailyClosing.company} em {isMounted ? new Date(`${selectedDailyClosing.date}T12:00:00`).toLocaleDateString("pt-BR") : selectedDailyClosing.date}</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedDailyClosingId(null)}>Fechar</Button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Total</p><p className="font-semibold text-foreground">{formatCurrency(Number(selectedDailyClosing.total_sold || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">PIX</p><p className="font-semibold text-cyan-400">{formatCurrency(Number(selectedDailyClosing.amount_pix || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Cartao</p><p className="font-semibold text-purple-400">{formatCurrency(Number(selectedDailyClosing.amount_card || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro</p><p className="font-semibold text-emerald-400">{formatCurrency(Number(selectedDailyClosing.amount_cash || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">CEIA</p><p className="font-semibold text-amber-300">{formatCurrency(Number(selectedDailyClosing.ceia_amount || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Liquido</p><p className={`font-semibold ${Number(selectedDailyClosing.cash_net || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(Number(selectedDailyClosing.cash_net || 0))}</p></div>
                </div>
                {selectedDailyClosing.notes && <p className="mt-3 text-sm text-muted">Obs: {selectedDailyClosing.notes}</p>}
              </div>
            )}
          </Card>

          {/* Tabela de Lancamentos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Lancamentos ({txs.length})</h3>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar empresa, valor..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-48"
                />
                <Badge variant="secondary">{filteredTxs.length} registro{filteredTxs.length !== 1 ? "s" : ""}</Badge>
              </div>
            </div>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => <span className="font-semibold">{tx.company_name}</span> },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
                { key: "comprovante", header: "Comprovante", render: (tx) => tx.receipt_count>0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : <span className="text-muted">-</span> },
                { key: "acoes", header: "", render: (tx) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    onClick={() => { setShowCancelConfirm(tx.id); setCancelReason(""); }}
                    disabled={operatorBlocked || cancellingTxId === tx.id}
                  >
                    {cancellingTxId === tx.id ? "..." : <X size={14} />}
                  </Button>
                )},
              ]}
              rows={paginatedTxs}
              emptyMessage="Sem lancamentos neste turno."
            />
            {filteredTxs.length > txPageSize && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted">Exibindo {Math.min(txPageSize, paginatedTxs.length)} de {filteredTxs.length}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setTxPage(p => Math.max(0, p - 1))} disabled={txPage === 0}>Anterior</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTxPage(p => p + 1)} disabled={(txPage + 1) * txPageSize >= filteredTxs.length}>Proximo</Button>
                </div>
              </div>
            )}
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

      {/* Modal Abertura */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl">
            <div className="mb-4 border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">Abertura de Turno</h2>
              <p className="text-sm text-muted">
                Informe o caixa inicial do guiche {booths.find((item) => item.booth_id === boothId)?.booth_name ?? "selecionado"} para iniciar a operacao com rastreabilidade.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Caixa inicial (R$)"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                autoFocus
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                hint="O valor sera registrado automaticamente como suprimento inicial do turno."
              />
              <Input
                label="Observacao inicial (opcional)"
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                placeholder="Ex.: troco inicial, caixa recebido do plantao anterior"
              />
              <div className="rounded-lg border border-info/20 bg-info/10 p-3 text-sm text-info">
                Essa abertura ajuda na conferencia do fechamento, nos alertas do turno e na auditoria do caixa.
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted">A operacao so comeca apos registrar o valor inicial do caixa.</p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowOpenShiftModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="success" onClick={confirmOpenShift} disabled={isOpeningShift || openingCash.trim() === ""}>
                  {isOpeningShift ? "Abrindo turno..." : "Confirmar abertura do turno"}
                </Button>
              </div>
            </div>
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
              {shiftNeedsAttention && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Atenção: este turno já está aberto há <strong>{shiftDurationLabel}</strong>. Revise a conferência com ainda mais cuidado.
                </div>
              )}

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Fechamento diario por resumo</p>
                    <p className="text-xs text-muted">Lance apenas o total vendido por empresa e o detalhamento em PIX, cartao, dinheiro e CEIA.</p>
                  </div>
                  <Badge variant={dailyClosingDifference === 0 ? "success" : "warning"}>
                    {dailyClosingDifference === 0 ? "Resumo conferido" : "Resumo inconsistente"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    label="Data"
                    type="date"
                    value={dailyClosingDate}
                    onChange={(e) => setDailyClosingDate(e.target.value)}
                  />
                  <Select
                    label="Empresa"
                    value={dailyClosingCompany}
                    onChange={(e) => setDailyClosingCompany(e.target.value)}
                  >
                    <option value="">Selecione a empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>{company.name}</option>
                    ))}
                  </Select>
                  <Input
                    label="Total vendido"
                    value={dailyClosingTotalSold}
                    onChange={(e) => setDailyClosingTotalSold(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                  <Input
                    label="CEIA"
                    value={dailyClosingCeia}
                    onChange={(e) => setDailyClosingCeia(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input
                    label="PIX"
                    value={dailyClosingPix}
                    onChange={(e) => setDailyClosingPix(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                  <Input
                    label="Cartão"
                    value={dailyClosingCard}
                    onChange={(e) => setDailyClosingCard(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                  <Input
                    label="Dinheiro"
                    value={dailyClosingCash}
                    onChange={(e) => setDailyClosingCash(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    label="Observacoes"
                    value={dailyClosingNotes}
                    onChange={(e) => setDailyClosingNotes(e.target.value)}
                    placeholder="Opcional"
                  />
                  <div className={`rounded-lg border p-3 ${dailyClosingNetPreview < 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                    <p className="text-xs uppercase tracking-wide text-muted">Saldo em dinheiro do fechamento</p>
                    <p className={`mt-1 text-2xl font-bold ${dailyClosingNetPreview < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(dailyClosingNetPreview)}</p>
                    <p className="text-xs text-muted">
                      {dailyClosingNetPreview < 0 ? "Fechamento negativo. O salvamento continua liberado com alerta." : "Dinheiro liquido calculado automaticamente: dinheiro bruto - CEIA."}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className={`rounded-lg border px-3 py-2 text-sm ${dailyClosingDifference === 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
                    {dailyClosingDifference === 0
                      ? "Validação ok: PIX + cartão + dinheiro bate com o total vendido."
                      : `Validação bloqueada: faltam ${formatCurrency(Math.abs(dailyClosingDifference))} para fechar a conta.`}
                  </div>
                  <Button
                    type="button"
                    variant="success"
                    onClick={saveDailyClosing}
                    disabled={isSavingDailyClosing || !dailyClosingCompany || !dailyClosingTotalSold || dailyClosingDifference !== 0}
                  >
                    {isSavingDailyClosing ? "Salvando fechamento..." : "Salvar fechamento"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Total vendido</p>
                  <p className="mt-1 font-bold text-foreground">{formatCurrency(dailyClosingSummary.totalSold)}</p>
                </div>
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted">PIX</p>
                  <p className="mt-1 font-bold text-cyan-400">{formatCurrency(dailyClosingSummary.pix)}</p>
                </div>
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Cartao</p>
                  <p className="mt-1 font-bold text-purple-400">{formatCurrency(dailyClosingSummary.card)}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro bruto</p>
                  <p className="mt-1 font-bold text-emerald-400">{formatCurrency(dailyClosingSummary.cash)}</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted">CEIA</p>
                  <p className="mt-1 font-bold text-amber-300">{formatCurrency(dailyClosingSummary.ceia)}</p>
                </div>
                <div className={`rounded-lg border p-3 ${dailyClosingSummary.cashNet < 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro liquido</p>
                  <p className={`mt-1 font-bold ${dailyClosingSummary.cashNet < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(dailyClosingSummary.cashNet)}</p>
                </div>
              </div>

              {currentDailyClosingRows.length > 0 && (
                <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Resumo salvo para a data</p>
                      <p className="text-xs text-muted">{currentDailyClosingRows.length} empresa(s) registradas neste fechamento.</p>
                    </div>
                    {dailyClosingSummary.cashNet < 0 && <Badge variant="danger">Fechamento negativo</Badge>}
                  </div>
                  <DataTable
                    columns={[
                      { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
                      { key: "total", header: "Total", render: (row) => formatCurrency(Number(row.total_sold || 0)) },
                      { key: "pix", header: "PIX", render: (row) => formatCurrency(Number(row.amount_pix || 0)) },
                      { key: "cartao", header: "Cartao", render: (row) => formatCurrency(Number(row.amount_card || 0)) },
                      { key: "dinheiro", header: "Dinheiro", render: (row) => formatCurrency(Number(row.amount_cash || 0)) },
                      { key: "ceia", header: "CEIA", render: (row) => formatCurrency(Number(row.ceia_amount || 0)) },
                      { key: "liquido", header: "Liquido", render: (row) => <span className={`font-semibold ${Number(row.cash_net || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(Number(row.cash_net || 0))}</span> },
                    ]}
                    rows={currentDailyClosingRows}
                    keyExtractor={(row) => row.id}
                    emptyMessage="Nenhum fechamento salvo para esta data."
                  />
                </div>
              )}

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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Tempo do turno</p>
                  <p className={`mt-1 text-xl font-bold ${shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>{shiftDurationLabel}</p>
                  <p className="text-xs text-muted">Ajuda a identificar plantões longos e pendências de fechamento.</p>
                </div>
                <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Caixa inicial registrado</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(openingCashRegistered)}</p>
                  <p className="text-xs text-muted">Registrado automaticamente como suprimento ao abrir o turno.</p>
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

              <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Checklist obrigatório de fechamento</p>
                    <p className="text-xs text-muted">Confirme os itens antes de encerrar o turno.</p>
                  </div>
                  <Badge variant={closeChecklistComplete ? "success" : "warning"}>
                    {closeChecklistComplete ? "Checklist concluído" : "Checklist pendente"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {[
                    { key: "vendas", label: "Conferi as vendas e formas de pagamento" },
                    { key: "movimentos", label: "Revisei sangrias, suprimentos e ajustes" },
                    { key: "caixa", label: "Contei o caixa físico da gaveta" },
                    { key: "comprovantes", label: "Confirmei os comprovantes e pendências" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded"
                        checked={closeChecklist[item.key as keyof typeof closeChecklist]}
                        onChange={() =>
                          setCloseChecklist((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof prev],
                          }))
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Valor contado manual (gaveta)"
                  value={closeDeclared}
                  onChange={e => setCloseDeclared(maskMoneyInput(e.target.value))}
                  autoFocus
                  placeholder={expectedCashVal ? expectedCashVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                  hint="Conte manualmente o valor fisico antes de concluir o fechamento."
                />
                <Input
                  label="Observacoes do fechamento"
                  value={closeObs}
                  onChange={e => setCloseObs(e.target.value)}
                  placeholder="Ex.: troco inicial, divergencia identificada, observacoes finais"
                  hint={closeDeclared.trim() && closeDifferencePreview !== 0 ? "Obrigatório quando houver sobra ou falta no fechamento." : "Use para registrar ocorrências, divergências ou repasses."}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted">
                O sistema salva o resumo por empresa, calcula o dinheiro liquido automaticamente e depois encerra o turno com rastreabilidade.
              </p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)}>Continuar operando</Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmCloseShift}
                  disabled={isClosing || currentDailyClosingRows.length === 0 || !closeDeclared.trim() || !closeChecklistComplete || (closeDeclared.trim() !== "" && closeDifferencePreview !== 0 && !closeObs.trim())}
                >
                  {isClosing ? "Fechando turno..." : "Fechar turno"}
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

      {/* Modal Confirmacao de Estorno */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-2">Estornar Transacao</h2>
            <p className="text-sm text-muted mb-4">
              Esta acao ira cancelar a transacao. O valor sera removido dos totais do turno.
            </p>
            {(() => {
              const tx = txs.find(t => t.id === showCancelConfirm);
              return tx ? (
                <div className="bg-slate-800 p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-foreground">{tx.company_name}</p>
                  <p className="text-lg font-bold text-rose-400">{formatCurrency(Number(tx.amount))}</p>
                  <p className="text-xs text-muted">{tx.payment_method.toUpperCase()} - {isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--"}</p>
                </div>
              ) : null;
            })()}
            <Input
              label="Motivo do estorno"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Ex.: erro de digitacao, cliente desistiu"
              autoFocus
            />
            {!cancelReason.trim() && <p className="mt-1 text-xs text-rose-400">Obrigatorio informar o motivo.</p>}
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="ghost" onClick={() => { setShowCancelConfirm(null); setCancelReason(""); }}>Cancelar</Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void cancelTransaction(showCancelConfirm)}
                disabled={!cancelReason.trim() || cancellingTxId === showCancelConfirm}
              >
                {cancellingTxId === showCancelConfirm ? "Estornando..." : "Confirmar Estorno"}
              </Button>
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
                        {msg.attachment_url && (
                          <div className="mt-3">
                            {isImageChatAttachment(msg.attachment_type, msg.attachment_name) ? (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                                <img
                                  src={msg.attachment_url}
                                  alt={msg.attachment_name ?? "Imagem anexada"}
                                  className="max-h-64 w-full object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted/40"
                              >
                                <Download size={14} />
                                {msg.attachment_name ?? "Baixar arquivo"}
                              </a>
                            )}
                          </div>
                        )}
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
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted/40">
                  <Paperclip size={14} />
                  Anexar arquivo
                  <input
                    key={chatAttachmentKey}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                    onChange={handleChatAttachmentChange}
                  />
                </label>

                {newChatAttachment && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                    <span className="max-w-[220px] truncate">{newChatAttachment.name}</span>
                    <button type="button" onClick={resetChatAttachment} className="text-muted hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
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
                <Button variant="primary" onClick={() => void sendChatMessage()} loading={isSendingChat} disabled={(!newChatMessage.trim() && !newChatAttachment) || isSendingChat}>
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
