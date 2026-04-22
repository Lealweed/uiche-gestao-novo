"use client";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminArea, getHomeRouteForRole } from "@/lib/rbac";
import { tolerantData, isSchemaToleranceError } from "@/lib/schema-tolerance";
import { OperatorPunchSection } from "@/components/rebuild/operator/operator-punch-section";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Card } from "@/components/rebuild/ui/card";
import { Select, Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge } from "@/components/rebuild/ui/badge";
import { Toast } from "@/components/rebuild/ui/toast";
import { getChatAttachmentUrl, uploadChatAttachment, validateChatAttachment } from "@/lib/chat-attachments";
import { Paperclip, Send, MessageSquare, Wallet, X } from "lucide-react";

const supabase = createClient();

/* ====== TIPOS ====== */
type Option = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null };
type Shift = { id: string; booth_id: string; status: "open" | "closed"; opened_at?: string; notes?: string | null };
type BoothLink = { booth_id: string; booth_name: string };
type Punch = { id: string; punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim"; punched_at: string; note: string | null };
type CashMovement = { id: string; movement_type: "suprimento" | "sangria" | "ajuste"; amount: number; note: string | null; created_at: string };
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
  ceia_base: number;
  ceia_pix: number;
  ceia_debito: number;
  ceia_credito: number;
  ceia_link_estadual: number;
  ceia_link_interestadual: number;
  ceia_dinheiro: number;
  ceia_total_lancado: number;
  ceia_faltante: number;
  qtd_taxa_estadual: number;
  qtd_taxa_interestadual: number;
  link_pagamento: number;
  costs_amount: number;
  sangria_amount: number;
  cash_net: number;
  status: "open" | "closed";
  notes: string | null;
  created_at: string;
};
type LastCloseResult = {
  expectedCash: number;
  declaredCash: number;
  difference: number;
  note: string | null;
  closedAt: string;
};

/* ====== UTILITARIOS ====== */
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

/* ====== COMPONENTE PRINCIPAL ====== */
export default function OperatorRebuildPage() {
  const router = useRouter();

  /* --- Auth & perfil --- */
  const [userId, setUserId] = useState<string | null>(null);
  const [operatorActive, setOperatorActive] = useState<boolean | null>(null);

  /* --- Turno --- */
  const [shift, setShift] = useState<Shift | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [booths, setBooths] = useState<BoothLink[]>([]);
  const [boothId, setBoothId] = useState("");

  /* --- UI --- */
  const [message, setMessage] = useState<string | null>(null);
  const [section, setSection] = useState("ceia");
  const [isMounted, setIsMounted] = useState(false);

  /* --- Fechamento Central Viagens --- */
  const [dailyClosingDate, setDailyClosingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyClosingCompany, setDailyClosingCompany] = useState("");
  const [dailyClosingCeiaBase, setDailyClosingCeiaBase] = useState("");
  const [dailyClosingCeiaPix, setDailyClosingCeiaPix] = useState("");
  const [dailyClosingCeiaDebito, setDailyClosingCeiaDebito] = useState("");
  const [dailyClosingCeiaCredito, setDailyClosingCeiaCredito] = useState("");
  const [dailyClosingCeiaDinheiro, setDailyClosingCeiaDinheiro] = useState("");
  const [dailyClosingLinkPagamento, setDailyClosingLinkPagamento] = useState("");
  const [dailyClosingCeiaLinkEstadual, setDailyClosingCeiaLinkEstadual] = useState("");
  const [dailyClosingCeiaLinkInterestadual, setDailyClosingCeiaLinkInterestadual] = useState("");
  const [dailyClosingQtdTaxaEstadual, setDailyClosingQtdTaxaEstadual] = useState("0");
  const [dailyClosingQtdTaxaInterestadual, setDailyClosingQtdTaxaInterestadual] = useState("0");
  const [dailyClosingCostsAmount, setDailyClosingCostsAmount] = useState("");
  const [dailyClosingSangriaAmount, setDailyClosingSangriaAmount] = useState("");
  const [dailyClosingNotes, setDailyClosingNotes] = useState("");
  const [dailyClosings, setDailyClosings] = useState<DailyCashClosingRow[]>([]);
  const [isSavingDailyClosing, setIsSavingDailyClosing] = useState(false);
  const [dailyClosingFilterDate, setDailyClosingFilterDate] = useState("");
  const [dailyClosingFilterCompany, setDailyClosingFilterCompany] = useState("");
  const [selectedDailyClosingId, setSelectedDailyClosingId] = useState<string | null>(null);

  /* --- Modal Abertura --- */
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  /* --- Modal Fechamento --- */
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [closeChecklist, setCloseChecklist] = useState({ vendas: false, movimentos: false, caixa: false, comprovantes: false });
  const [lastCloseResult, setLastCloseResult] = useState<LastCloseResult | null>(null);

  /* --- Movimentos de caixa --- */
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<"suprimento" | "sangria">("suprimento");
  const [cashType, setCashType] = useState<"suprimento" | "sangria" | "ajuste">("suprimento");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");

  /* --- Ponto --- */
  const [punches, setPunches] = useState<Punch[]>([]);

  /* --- Chat --- */
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

  /* --- Duracao do turno --- */
  const [shiftDurationLabel, setShiftDurationLabel] = useState("Sem turno ativo");
  const [shiftNeedsAttention, setShiftNeedsAttention] = useState(false);

  const operatorBlocked = operatorActive === false;

  /* ====== EFFECTS ====== */

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

      const { data: profile } = await supabase.from("profiles").select("role,active").eq("user_id", uid).single();
      const role = (profile as { role?: string; active?: boolean } | null)?.role ?? "";
      const isActive = (profile as { role?: string; active?: boolean } | null)?.active !== false;
      setOperatorActive((profile as { active?: boolean } | null)?.active ?? null);

      if (!isActive) { await supabase.auth.signOut(); return router.replace("/login"); }
      const destination = getHomeRouteForRole(role);
      if (!destination) { await supabase.auth.signOut(); return router.replace("/login"); }
      if (canAccessAdminArea(role)) return router.replace(destination);
      if (role !== "operator") { await supabase.auth.signOut(); return router.replace("/login"); }

      const [boothLinksRes, companiesRes, shiftRes, allBoothsRes] = await Promise.all([
        supabase.from("operator_booths").select("booth_id").eq("operator_id", uid).eq("active", true),
        supabase.from("companies").select("*").eq("active", true).order("name"),
        supabase.from("shifts").select("id,booth_id,status,opened_at,notes").eq("operator_id", uid).eq("status", "open").maybeSingle(),
        supabase.from("booths").select("id,name").eq("active", true),
      ]);

      const bData = tolerantData((boothLinksRes.data as { booth_id: string }[] | null) ?? [], boothLinksRes.error, [], "Vinculos").data;
      const cData = tolerantData((companiesRes.data as Option[] | null) ?? [], companiesRes.error, [], "Empresas").data;
      const allBooths = tolerantData((allBoothsRes.data as { id: string; name: string }[] | null) ?? [], allBoothsRes.error, [], "Guiches").data;

      const boothNameMap = new Map((allBooths ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
      const boothRows = ((bData ?? []) as { booth_id: string }[]).map((b) => ({ booth_id: b.booth_id, booth_name: boothNameMap.get(b.booth_id) ?? b.booth_id }));
      setBooths(boothRows);
      setCompanies(cData ?? []);

      const sData = shiftRes.data as Shift | null;
      if (sData) {
        setShift(sData);
        setBoothId(sData.booth_id);
        await loadCashMovements(sData.id);
      }
      await loadPunches(uid);
      await loadDailyClosings(uid);
      if (!sData && bData?.[0]) setBoothId((bData[0] as { booth_id: string }).booth_id);

      // Ponto Digital: clock_in automatico
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const { data: openPunch } = await supabase.from("user_attendance").select("id").eq("user_id", uid).is("clock_out", null).gte("clock_in", today.toISOString()).maybeSingle();
        if (!openPunch) await supabase.from("user_attendance").insert({ user_id: uid });
      } catch { /* silencioso */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status check periodico (60s)
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

  // Attendance checkout
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
      } catch { /* fallback */ }
      if (!sent) {
        void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, credentials: "include", keepalive: true }).catch(() => {
          attendanceCheckoutSentRef.current = false;
          setTimeout(() => {
            if (attendanceCheckoutSentRef.current) return;
            attendanceCheckoutSentRef.current = true;
            void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, credentials: "include", keepalive: true }).catch(() => undefined);
          }, 500);
        });
      }
    };

    const handlePageExit = () => sendAttendanceCheckout();
    const handleVisibilityChange = () => { if (document.visibilityState === "hidden") sendAttendanceCheckout(); };

    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [operatorActive, userId]);

  // Duracao do turno
  useEffect(() => {
    function updateDuration() {
      if (!shift?.opened_at) { setShiftDurationLabel("Sem turno ativo"); setShiftNeedsAttention(false); return; }
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

  /* ====== DATA LOADERS ====== */

  async function loadPunches(uid: string) {
    const res = await supabase.from("time_punches").select("id,punch_type,punched_at,note").eq("user_id", uid).order("punched_at", { ascending: false }).limit(20);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setPunches((res.data as Punch[] | null) ?? []);
  }

  async function loadCashMovements(shiftId: string) {
    const res = await supabase.from("cash_movements").select("id,movement_type,amount,note,created_at").eq("shift_id", shiftId).order("created_at", { ascending: false }).limit(100);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setCashMovements((res.data as CashMovement[] | null) ?? []);
  }

  async function loadDailyClosings(uid: string) {
    const res = await supabase
      .from("daily_cash_closings")
      .select("id,office_id,user_id,date,company,total_sold,amount_pix,amount_card,amount_cash,ceia_amount,ceia_base,ceia_pix,ceia_debito,ceia_credito,ceia_link_estadual,ceia_link_interestadual,ceia_dinheiro,ceia_total_lancado,ceia_faltante,qtd_taxa_estadual,qtd_taxa_interestadual,link_pagamento,costs_amount,sangria_amount,cash_net,status,notes,created_at")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);
    if (res.error) {
      if (!isSchemaToleranceError(res.error)) console.warn("Falha ao carregar fechamentos diarios:", res.error.message);
      return;
    }
    setDailyClosings((res.data as DailyCashClosingRow[] | null) ?? []);
  }

  async function syncAttendanceAfterPunch(type: Punch["punch_type"], uid: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (type === "entrada") {
      const { data: openRow, error: selectError } = await supabase.from("user_attendance").select("id").eq("user_id", uid).is("clock_out", null).gte("clock_in", today.toISOString()).maybeSingle();
      if (selectError && !isSchemaToleranceError(selectError)) return "Falha ao sincronizar a presenca do dia.";
      if (!openRow) { const { error } = await supabase.from("user_attendance").insert({ user_id: uid }); if (error && !isSchemaToleranceError(error)) return "Falha ao sincronizar a presenca do dia."; }
      return null;
    }
    if (type === "saida") {
      const { error } = await supabase.from("user_attendance").update({ clock_out: new Date().toISOString() }).eq("user_id", uid).is("clock_out", null).gte("clock_in", today.toISOString());
      if (error && !isSchemaToleranceError(error)) return "Falha ao finalizar a presenca do dia.";
    }
    return null;
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
    if (!userId) return;
    const { error } = await supabase.from("audit_logs").insert({ created_by: userId, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });
    if (error && !isSchemaToleranceError(error)) console.warn("Falha ao registrar auditoria operador:", error.message);
  }

  /* ====== CEIA SAVE ====== */

  async function saveDailyClosing() {
    if (!userId) return;
    const officeId = shift?.booth_id ?? boothId;
    if (!officeId) { setMessage("Selecione um guiche ou abra o turno antes de salvar o fechamento."); return; }
    if (!dailyClosingDate) { setMessage("Informe a data do fechamento."); return; }
    if (!dailyClosingCompany.trim()) { setMessage("Selecione a empresa para salvar o fechamento."); return; }

    const ceiaBase = Number(parseMoneyInput(dailyClosingCeiaBase).toFixed(2));
    const ceiaPix = Number(parseMoneyInput(dailyClosingCeiaPix).toFixed(2));
    const ceiaDebito = Number(parseMoneyInput(dailyClosingCeiaDebito).toFixed(2));
    const ceiaCredito = Number(parseMoneyInput(dailyClosingCeiaCredito).toFixed(2));
    const ceiaDinheiro = Number(parseMoneyInput(dailyClosingCeiaDinheiro).toFixed(2));
    const linkPagamento = Number(parseMoneyInput(dailyClosingLinkPagamento).toFixed(2));
    const ceiaLinkEstadual = Number(parseMoneyInput(dailyClosingCeiaLinkEstadual).toFixed(2));
    const ceiaLinkInterestadual = Number(parseMoneyInput(dailyClosingCeiaLinkInterestadual).toFixed(2));
    const costsAmount = Number(parseMoneyInput(dailyClosingCostsAmount).toFixed(2));
    const sangriaAmount = Number(parseMoneyInput(dailyClosingSangriaAmount).toFixed(2));
    const qtdTaxaEstadual = Math.max(0, Math.floor(Number(dailyClosingQtdTaxaEstadual) || 0));
    const qtdTaxaInterestadual = Math.max(0, Math.floor(Number(dailyClosingQtdTaxaInterestadual) || 0));
    const ceiaTotalLancado = Number((ceiaPix + ceiaDebito + ceiaCredito + ceiaDinheiro + linkPagamento + ceiaLinkEstadual + ceiaLinkInterestadual).toFixed(2));
    const totalAbatimentos = Number((costsAmount + sangriaAmount).toFixed(2));
    const resultadoLiquido = Number((ceiaTotalLancado - totalAbatimentos).toFixed(2));
    const ceiaFaltante = Number((ceiaBase - ceiaTotalLancado).toFixed(2));
    const cashNet = ceiaDinheiro;

    if ([ceiaBase, ceiaPix, ceiaDebito, ceiaCredito, ceiaDinheiro, linkPagamento, ceiaLinkEstadual, ceiaLinkInterestadual, costsAmount, sangriaAmount].some((v) => v < 0)) {
      setMessage("Os valores do fechamento precisam ser maiores ou iguais a zero."); return;
    }

    setIsSavingDailyClosing(true);
    try {
      const { error } = await supabase.from("daily_cash_closings").upsert(
        {
          office_id: officeId, user_id: userId, date: dailyClosingDate, company: dailyClosingCompany.trim(),
          total_sold: ceiaBase, amount_pix: ceiaPix, amount_card: ceiaDebito + ceiaCredito, amount_cash: ceiaDinheiro,
          ceia_amount: 0, ceia_base: ceiaBase, ceia_pix: ceiaPix, ceia_debito: ceiaDebito,
          ceia_credito: ceiaCredito, ceia_link_estadual: ceiaLinkEstadual, ceia_link_interestadual: ceiaLinkInterestadual,
          ceia_dinheiro: ceiaDinheiro, ceia_total_lancado: ceiaTotalLancado, ceia_faltante: ceiaFaltante,
          qtd_taxa_estadual: qtdTaxaEstadual, qtd_taxa_interestadual: qtdTaxaInterestadual,
          link_pagamento: linkPagamento, costs_amount: costsAmount, sangria_amount: sangriaAmount, cash_net: cashNet,
          status: "open", notes: dailyClosingNotes.trim() || null,
        },
        { onConflict: "office_id,user_id,date,company" },
      );
      if (error) { setMessage(`Erro ao salvar fechamento: ${error.message}`); return; }

      await logAction("SAVE_DAILY_CASH_CLOSING", "daily_cash_closings", undefined, {
        office_id: officeId, date: dailyClosingDate, company: dailyClosingCompany.trim(),
        total_vendido_externo: ceiaBase, total_lancado: ceiaTotalLancado, total_abatimentos: totalAbatimentos, resultado_liquido: resultadoLiquido, diferenca: ceiaFaltante, cash_net: cashNet,
      });

      setDailyClosingCompany(""); setDailyClosingCeiaBase("");
      setDailyClosingCeiaPix(""); setDailyClosingCeiaDebito(""); setDailyClosingCeiaCredito("");
      setDailyClosingCeiaDinheiro(""); setDailyClosingLinkPagamento("");
      setDailyClosingCeiaLinkEstadual(""); setDailyClosingCeiaLinkInterestadual("");
      setDailyClosingCostsAmount(""); setDailyClosingSangriaAmount("");
      setDailyClosingQtdTaxaEstadual("0"); setDailyClosingQtdTaxaInterestadual("0"); setDailyClosingNotes("");
      await loadDailyClosings(userId);

      const ceiaAlert = ceiaFaltante === 0 ? null
        : ceiaFaltante > 0 ? `Atencao: ainda faltam ${formatCurrency(ceiaFaltante)} na conferencia.`
          : `Atencao: o lancamento ficou excedido em ${formatCurrency(Math.abs(ceiaFaltante))}.`;
      setMessage(["Fechamento salvo.", ceiaAlert].filter(Boolean).join(" "));
    } finally {
      setIsSavingDailyClosing(false);
    }
  }

  /* ====== TURNO ====== */

  async function openShift() {
    if (!boothId) return setMessage("Selecione um guiche.");
    setOpeningCash("0"); setOpeningNote(""); setShowOpenShiftModal(true);
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
        const { error: shiftNoteError } = await supabase.from("shifts").update({ notes: `Abertura: ${noteValue}` }).eq("id", createdShift.id).eq("operator_id", userId);
        if (shiftNoteError && !isSchemaToleranceError(shiftNoteError)) console.warn("Falha ao salvar observacao de abertura:", shiftNoteError.message);
      }

      if (openingCashValue > 0) {
        const { error: openingCashError } = await supabase.from("cash_movements").insert({
          shift_id: createdShift.id, booth_id: createdShift.booth_id, user_id: userId,
          movement_type: "suprimento", amount: openingCashValue,
          note: noteValue ? `Caixa inicial - ${noteValue}` : "Caixa inicial",
        });
        if (openingCashError) setMessage(`Turno aberto, mas houve falha ao registrar o caixa inicial: ${openingCashError.message}`);
      }

      await logAction("OPEN_SHIFT", "shifts", createdShift.id, { booth_id: boothId, opening_cash: openingCashValue, opening_note: noteValue || null });
      setLastCloseResult(null); setShift(createdShift); setBoothId(createdShift.booth_id); setShowOpenShiftModal(false);
      setMessage(openingCashValue > 0 ? "Turno aberto e caixa inicial registrado." : "Turno aberto.");
      await loadCashMovements(createdShift.id);
    } finally { setIsOpeningShift(false); }
  }

  function openCloseShiftModal() {
    if (!shift || !userId) return;
    setDailyClosingDate(new Date().toISOString().slice(0, 10));
    setExpectedCashVal(dailyClosingExpectedCash);
    setCloseDeclared(""); setCloseObs("");
    setCloseChecklist({ vendas: false, movimentos: false, caixa: false, comprovantes: false });
    setShowCloseModal(true);
  }

  async function confirmCloseShift() {
    if (!shift || !userId) return;
    setIsClosing(true);
    try {
      if (currentDailyClosingRows.length === 0) {
        setMessage("Salve ao menos um fechamento por empresa antes de fechar o turno."); return;
      }
      const declaredCash = parseMoneyInput(closeDeclared);
      if (Number.isNaN(declaredCash) || declaredCash < 0) { setMessage("Informe um valor contado valido."); return; }
      if (!Object.values(closeChecklist).every(Boolean)) { setMessage("Confirme todo o checklist antes de concluir o fechamento."); return; }

      const difference = Number((declaredCash - expectedCashVal).toFixed(2));
      if (difference !== 0 && !closeObs.trim()) { setMessage("Descreva a divergencia no campo de observacoes para concluir o fechamento."); return; }

      const obs = closeObs.trim();
      const normalizedExpected = Number(expectedCashVal.toFixed(2));
      const normalizedDeclared = Number(declaredCash.toFixed(2));
      const closingSummary = [
        obs || null,
        "Checklist ok: fechamentos, movimentos, caixa fisico e conferencia confirmados.",
        `Resumo diario -> informado ${dailyClosingSummary.totalInformado.toFixed(2)}, lancado ${dailyClosingSummary.totalLancado.toFixed(2)}, faltante ${dailyClosingSummary.faltante.toFixed(2)}, dinheiro liquido ${dailyClosingSummary.cashNet.toFixed(2)}.`,
        `Movimentos -> suprimento ${cashTotals.suprimento.toFixed(2)}, sangria ${cashTotals.sangria.toFixed(2)}, ajuste ${cashTotals.ajuste.toFixed(2)}.`,
      ].filter(Boolean).join(" | ");

      const { error: saveClosingError } = await supabase.from("shift_cash_closings").upsert({
        shift_id: shift.id, booth_id: shift.booth_id, user_id: userId,
        expected_cash: normalizedExpected, declared_cash: normalizedDeclared, difference, note: closingSummary || null,
      }, { onConflict: "shift_id" });
      if (saveClosingError) { setMessage(`Erro ao registrar fechamento: ${saveClosingError.message}`); return; }

      const { error } = await supabase.rpc("close_shift", { p_shift_id: shift.id, p_ip: null, p_notes: closingSummary || null });
      if (error) { setMessage(`Erro: ${error.message}`); return; }

      const { error: closeDailyRowsError } = await supabase.from("daily_cash_closings").update({ status: "closed" }).eq("user_id", userId).eq("office_id", shift.booth_id).eq("date", dailyClosingDate);
      if (closeDailyRowsError && !isSchemaToleranceError(closeDailyRowsError)) console.warn("Falha ao atualizar status dos fechamentos diarios:", closeDailyRowsError.message);

      await logAction("CLOSE_SHIFT", "shifts", shift.id, { expected_cash: expectedCashVal, declared_cash: declaredCash, difference, checklist_confirmed: true, shift_duration_label: shiftDurationLabel, summary_date: dailyClosingDate, summary_rows: currentDailyClosingRows.length });
      setLastCloseResult({ expectedCash: normalizedExpected, declaredCash: normalizedDeclared, difference, note: closingSummary || null, closedAt: new Date().toISOString() });
      await loadDailyClosings(userId);
      setShift(null); setCashMovements([]); setShowCloseModal(false); setSection("ceia");
      setMessage(`Fechamento concluido. Resultado: ${difference === 0 ? "caixa conferido" : difference > 0 ? `sobra de ${formatCurrency(difference)}` : `falta de ${formatCurrency(Math.abs(difference))}`}.`);
    } finally { setIsClosing(false); }
  }

  /* ====== PONTO ====== */

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;
    const label = type === "entrada" ? "Entrada" : type === "saida" ? "Saida" : type === "pausa_inicio" ? "Inicio de pausa" : "Fim de pausa";
    const { error } = await supabase.from("time_punches").insert({ user_id: userId, booth_id: (shift?.booth_id ?? boothId) || null, shift_id: shift?.id ?? null, punch_type: type, note: label });
    if (error) return setMessage(`Erro: ${error.message}`);
    const attendanceWarning = await syncAttendanceAfterPunch(type, userId);
    await logAction("TIME_PUNCH", "time_punches", undefined, { type });
    await loadPunches(userId);
    setMessage(attendanceWarning ? `Ponto: ${label}. ${attendanceWarning}` : `Ponto: ${label}.`);
  }

  /* ====== MOVIMENTOS DE CAIXA ====== */

  async function submitCashMovement(e: FormEvent) {
    e.preventDefault();
    if (!shift || !userId) return;
    const parsedAmount = Number(cashAmount.replace(",", "."));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return setMessage("Informe um valor maior que zero para o movimento de caixa.");
    const { error } = await supabase.from("cash_movements").insert({
      shift_id: shift.id, booth_id: shift.booth_id, user_id: userId,
      movement_type: cashType, amount: Number(parsedAmount.toFixed(2)), note: cashNote.trim() || null,
    });
    if (error) return setMessage(`Erro: ${error.message}`);
    setCashAmount(""); setCashNote(""); setShowCashModal(false);
    await loadCashMovements(shift.id);
    setMessage("Movimento registrado.");
  }

  /* ====== CHAT ====== */

  function resetChatAttachment() { setNewChatAttachment(null); setChatAttachmentKey((prev) => prev + 1); }

  function handleChatAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) { resetChatAttachment(); return; }
    const validationError = validateChatAttachment(file);
    if (validationError) { setMessage(validationError); resetChatAttachment(); return; }
    setNewChatAttachment(file);
  }

  const loadChatMessages = useCallback(async () => {
    if (!userId) return;
    const query = await supabase.from("operator_messages").select("id, message, created_at, read, booth_id, sender_role, attachment_path, attachment_name, attachment_type, attachment_size").eq("operator_id", userId).order("created_at", { ascending: true }).limit(150);
    if (!query.error && query.data) {
      const allMessages: ChatMessage[] = await Promise.all(((query.data as ChatMessage[]) || []).map(async (msg) => ({
        ...msg, booth_id: msg.booth_id ?? null, sender_role: msg.sender_role === "operator" ? "operator" : "admin",
        attachment_path: msg.attachment_path ?? null, attachment_name: msg.attachment_name ?? null,
        attachment_type: msg.attachment_type ?? null, attachment_size: msg.attachment_size ?? null,
        attachment_url: await getChatAttachmentUrl(supabase, msg.attachment_path ?? null),
      })));
      const visibleMessages: ChatMessage[] = activeChatBoothId ? allMessages.filter((msg) => (msg.booth_id ?? activeChatBoothId) === activeChatBoothId) : allMessages;
      setChatMessages(visibleMessages);
      setUnreadChatCount(allMessages.filter((msg) => !msg.read && msg.sender_role === "admin").length);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      return;
    }
    if (isSchemaToleranceError(query.error)) {
      const fallback = await supabase.from("operator_messages").select("id, message, created_at, read").eq("operator_id", userId).order("created_at", { ascending: true }).limit(150);
      if (!fallback.error) {
        const legacyMessages = (((fallback.data as Array<{ id: string; message: string; created_at: string; read: boolean }>) || [])).map((msg) => ({
          ...msg, booth_id: activeChatBoothId || null, sender_role: "operator" as const,
          attachment_path: null, attachment_name: null, attachment_type: null, attachment_size: null, attachment_url: null,
        }));
        setChatMessages(legacyMessages); setUnreadChatCount(0);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    }
  }, [activeChatBoothId, userId]);

  async function markAdminChatAsRead() {
    if (!userId || !activeChatBoothId) return;
    const { error } = await supabase.from("operator_messages").update({ read: true, read_at: new Date().toISOString(), read_by: userId }).eq("operator_id", userId).eq("sender_role", "admin").eq("read", false).eq("booth_id", activeChatBoothId);
    if (error && !isSchemaToleranceError(error)) return;
    await loadChatMessages();
  }

  async function openChatPanel() {
    if (!activeChatBoothId) { setMessage("Selecione um guiche para abrir a conversa privada."); return; }
    setShowChat(true);
    await loadChatMessages();
    await markAdminChatAsRead();
  }

  useEffect(() => {
    if (!showChat || !userId || !activeChatBoothId) return;
    void loadChatMessages();
    void markAdminChatAsRead();
  }, [activeChatBoothId, loadChatMessages, showChat, userId]);

  // Realtime chat
  useEffect(() => {
    if (!userId) return;
    const channelName = `op-messages-${userId}-${activeChatBoothId || "global"}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        void (async () => {
          const raw = payload.new as ChatMessage;
          const normalized: ChatMessage = {
            ...raw, booth_id: raw.booth_id ?? null, sender_role: raw.sender_role === "operator" ? "operator" : "admin",
            attachment_path: raw.attachment_path ?? null, attachment_name: raw.attachment_name ?? null,
            attachment_type: raw.attachment_type ?? null, attachment_size: raw.attachment_size ?? null,
            attachment_url: await getChatAttachmentUrl(supabase, raw.attachment_path ?? null),
          };
          const belongsToCurrentBooth = !activeChatBoothId || (normalized.booth_id ?? activeChatBoothId) === activeChatBoothId;
          if (belongsToCurrentBooth) {
            setChatMessages((prev) => (prev.some((msg) => msg.id === normalized.id) ? prev : [...prev, normalized]));
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
          if (normalized.sender_role === "admin") {
            if (showChatRef.current && belongsToCurrentBooth) void markAdminChatAsRead();
            else { setUnreadChatCount((prev) => prev + 1); setMessage(`Nova mensagem do administrador para ${activeChatBoothName}.`); }
          }
        })();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "operator_messages", filter: `operator_id=eq.${userId}` }, (payload) => {
        void (async () => {
          const raw = payload.new as ChatMessage;
          const updated: ChatMessage = {
            ...raw, booth_id: raw.booth_id ?? null, sender_role: raw.sender_role === "operator" ? "operator" : "admin",
            attachment_path: raw.attachment_path ?? null, attachment_name: raw.attachment_name ?? null,
            attachment_type: raw.attachment_type ?? null, attachment_size: raw.attachment_size ?? null,
            attachment_url: await getChatAttachmentUrl(supabase, raw.attachment_path ?? null),
          };
          const belongsToCurrentBooth = !activeChatBoothId || (updated.booth_id ?? activeChatBoothId) === activeChatBoothId;
          if (belongsToCurrentBooth) setChatMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
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
      let attachmentPayload: { attachment_path?: string; attachment_name?: string; attachment_type?: string; attachment_size?: number } = {};
      if (newChatAttachment) {
        try {
          const uploaded = await uploadChatAttachment(supabase, userId, newChatAttachment);
          attachmentPayload = { attachment_path: uploaded.attachment_path, attachment_name: uploaded.attachment_name, attachment_type: uploaded.attachment_type, attachment_size: uploaded.attachment_size };
        } catch (error) { setMessage(`Erro ao enviar anexo: ${error instanceof Error ? error.message : "falha no upload"}`); return; }
      }
      const payload = { operator_id: userId, booth_id: activeChatBoothId, sender_role: "operator" as const, message: newChatMessage.trim() || `Anexo enviado: ${newChatAttachment?.name ?? "arquivo"}`, read: false, ...attachmentPayload };
      const { error } = await supabase.from("operator_messages").insert(payload);
      if (error) { return setMessage(isSchemaToleranceError(error) ? "Chat com anexos requer a migration de arquivos da conversa antes do envio." : `Erro: ${error.message}`); }
      setNewChatMessage(""); resetChatAttachment();
      setMessage(`Mensagem enviada para o admin do guiche ${activeChatBoothName}.`);
      await loadChatMessages();
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } finally { setIsSendingChat(false); }
  }

  /* ====== VALORES COMPUTADOS ====== */

  const activeOfficeId = shift?.booth_id ?? boothId;

  const cashTotals = useMemo(() => {
    const s = cashMovements.filter((m) => m.movement_type === "suprimento").reduce((a, m) => a + Number(m.amount || 0), 0);
    const g = cashMovements.filter((m) => m.movement_type === "sangria").reduce((a, m) => a + Number(m.amount || 0), 0);
    const j = cashMovements.filter((m) => m.movement_type === "ajuste").reduce((a, m) => a + Number(m.amount || 0), 0);
    return { suprimento: s, sangria: g, ajuste: j, saldo: s - g + j };
  }, [cashMovements]);

  const dailyClosingFormCeiaBase = useMemo(() => parseMoneyInput(dailyClosingCeiaBase), [dailyClosingCeiaBase]);
  const dailyClosingFormCeiaPix = useMemo(() => parseMoneyInput(dailyClosingCeiaPix), [dailyClosingCeiaPix]);
  const dailyClosingFormCeiaDebito = useMemo(() => parseMoneyInput(dailyClosingCeiaDebito), [dailyClosingCeiaDebito]);
  const dailyClosingFormCeiaCredito = useMemo(() => parseMoneyInput(dailyClosingCeiaCredito), [dailyClosingCeiaCredito]);
  const dailyClosingFormCeiaDinheiro = useMemo(() => parseMoneyInput(dailyClosingCeiaDinheiro), [dailyClosingCeiaDinheiro]);
  const dailyClosingFormLinkPagamento = useMemo(() => parseMoneyInput(dailyClosingLinkPagamento), [dailyClosingLinkPagamento]);
  const dailyClosingFormCeiaLinkEstadual = useMemo(() => parseMoneyInput(dailyClosingCeiaLinkEstadual), [dailyClosingCeiaLinkEstadual]);
  const dailyClosingFormCeiaLinkInterestadual = useMemo(() => parseMoneyInput(dailyClosingCeiaLinkInterestadual), [dailyClosingCeiaLinkInterestadual]);
  const dailyClosingFormCostsAmount = useMemo(() => parseMoneyInput(dailyClosingCostsAmount), [dailyClosingCostsAmount]);
  const dailyClosingFormSangriaAmount = useMemo(() => parseMoneyInput(dailyClosingSangriaAmount), [dailyClosingSangriaAmount]);

  const dailyClosingCeiaTotalLancado = useMemo(
    () => Number((dailyClosingFormCeiaPix + dailyClosingFormCeiaDebito + dailyClosingFormCeiaCredito + dailyClosingFormCeiaDinheiro + dailyClosingFormLinkPagamento + dailyClosingFormCeiaLinkEstadual + dailyClosingFormCeiaLinkInterestadual).toFixed(2)),
    [dailyClosingFormCeiaPix, dailyClosingFormCeiaDebito, dailyClosingFormCeiaCredito, dailyClosingFormCeiaDinheiro, dailyClosingFormLinkPagamento, dailyClosingFormCeiaLinkEstadual, dailyClosingFormCeiaLinkInterestadual],
  );
  const dailyClosingTotalAbatimentos = useMemo(
    () => Number((dailyClosingFormCostsAmount + dailyClosingFormSangriaAmount).toFixed(2)),
    [dailyClosingFormCostsAmount, dailyClosingFormSangriaAmount],
  );
  const dailyClosingResultadoLiquido = useMemo(
    () => Number((dailyClosingCeiaTotalLancado - dailyClosingTotalAbatimentos).toFixed(2)),
    [dailyClosingCeiaTotalLancado, dailyClosingTotalAbatimentos],
  );
  const dailyClosingCeiaFaltante = useMemo(
    () => Number((dailyClosingFormCeiaBase - dailyClosingCeiaTotalLancado).toFixed(2)),
    [dailyClosingFormCeiaBase, dailyClosingCeiaTotalLancado],
  );
  const dailyClosingCeiaStatus = dailyClosingCeiaFaltante === 0
    ? { label: "Conferido", variant: "success" as const }
    : dailyClosingCeiaFaltante > 0
      ? { label: "Faltando", variant: "warning" as const }
      : { label: "Excedido", variant: "danger" as const };
  const dailyClosingCeiaToneClass = dailyClosingCeiaFaltante === 0
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : dailyClosingCeiaFaltante > 0
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  const dailyClosingCeiaStatusMessage = dailyClosingCeiaFaltante === 0
    ? "Conferencia ok em tempo real."
    : dailyClosingCeiaFaltante > 0
      ? `Faltando ${formatCurrency(dailyClosingCeiaFaltante)} para fechar.`
      : `Lancamento excedido em ${formatCurrency(Math.abs(dailyClosingCeiaFaltante))}.`;

  const currentDailyClosingRows = useMemo(
    () => dailyClosings.filter((row) => row.date === dailyClosingDate && (!activeOfficeId || row.office_id === activeOfficeId)),
    [activeOfficeId, dailyClosings, dailyClosingDate],
  );
  const dailyClosingSummary = useMemo(
    () => currentDailyClosingRows.reduce(
      (acc, row) => {
        const rowCeiaBase = Number(row.ceia_base ?? row.ceia_amount ?? 0);
        const rowCeiaLancado = Number(row.ceia_total_lancado ?? (Number(row.ceia_pix ?? 0) + Number(row.ceia_debito ?? 0) + Number(row.ceia_credito ?? 0) + Number(row.ceia_dinheiro ?? 0) + Number(row.link_pagamento ?? 0) + Number(row.ceia_link_estadual ?? 0) + Number(row.ceia_link_interestadual ?? 0)));
        const rowCeiaFaltante = Number(row.ceia_faltante ?? (rowCeiaBase - rowCeiaLancado));
        return {
          totalInformado: acc.totalInformado + rowCeiaBase,
          totalLancado: acc.totalLancado + rowCeiaLancado,
          totalAbatimentos: acc.totalAbatimentos + Number((Number(row.costs_amount ?? 0) + Number(row.sangria_amount ?? 0)).toFixed(2)),
          resultadoLiquido: acc.resultadoLiquido + Number((rowCeiaLancado - Number(row.costs_amount ?? 0) - Number(row.sangria_amount ?? 0)).toFixed(2)),
          totalCustos: acc.totalCustos + Number(row.costs_amount ?? 0),
          totalSangriaResumo: acc.totalSangriaResumo + Number(row.sangria_amount ?? 0),
          faltante: acc.faltante + rowCeiaFaltante,
          cashNet: acc.cashNet + Number(row.cash_net || 0),
        };
      },
      { totalInformado: 0, totalLancado: 0, totalAbatimentos: 0, resultadoLiquido: 0, totalCustos: 0, totalSangriaResumo: 0, faltante: 0, cashNet: 0 },
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
  const openingCashRegistered = useMemo(() => {
    const openingMovement = cashMovements.find((m) => m.movement_type === "suprimento" && (m.note ?? "").toLowerCase().includes("caixa inicial"));
    return Number(openingMovement?.amount ?? 0);
  }, [cashMovements]);

  useEffect(() => {
    if (showCloseModal) setExpectedCashVal(dailyClosingExpectedCash);
  }, [dailyClosingExpectedCash, showCloseModal]);

  const show = (s: string) => section === s;

  /* ====== JSX ====== */
  return (
    <RebuildShell>
      <Toast message={message} onClose={() => setMessage(null)} type="info" />

      {/* ===== FECHAMENTO DE TURNO (tela cheia) ===== */}
      {showCloseModal && shift && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-border pb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Fechamento de Turno</h1>
              <p className="text-sm text-muted">Confira o resumo e encerre o turno.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={closeDifferenceStatus.variant}>{closeDifferenceStatus.label}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCloseModal(false)}>Continuar operando</Button>
            </div>
          </div>

          {/* Alerta turno longo */}
          {shiftNeedsAttention && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Atencao: turno aberto ha <strong className="font-bold">{shiftDurationLabel}</strong>. Revise com cuidado.
            </div>
          )}

          {/* KPIs – linha 1: 5 cards compactos */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Total Informado</p>
              <p className="text-xl font-bold text-amber-300">{formatCurrency(dailyClosingSummary.totalInformado)}</p>
            </div>
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Total Lancado</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(dailyClosingSummary.totalLancado)}</p>
            </div>
            <div className={`rounded-xl border p-3 ${dailyClosingSummary.faltante === 0 ? "border-emerald-500/20 bg-emerald-500/5" : dailyClosingSummary.faltante > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-rose-500/30 bg-rose-500/10"}`}>
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Faltante</p>
              <p className={`text-xl font-bold ${dailyClosingSummary.faltante === 0 ? "text-emerald-400" : dailyClosingSummary.faltante > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(dailyClosingSummary.faltante)}</p>
            </div>
            <div className={`rounded-xl border p-3 ${dailyClosingSummary.cashNet < 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}>
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Dinheiro Liquido</p>
              <p className={`text-xl font-bold ${dailyClosingSummary.cashNet < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(dailyClosingSummary.cashNet)}</p>
            </div>
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Empresas</p>
              <p className="text-xl font-bold text-foreground">{currentDailyClosingRows.length}</p>
            </div>
          </div>

          {/* KPIs – linha 2: esperado / contado / diferença */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-success/30 bg-success/10 p-5">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Total Esperado em Caixa</p>
              <p className="text-3xl font-bold text-success">{formatCurrency(expectedCashVal)}</p>
              <p className="text-xs text-muted mt-1">Dinheiro liquido + suprimentos - sangrias</p>
            </div>
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-5">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Valor Contado</p>
              <p className="text-3xl font-bold text-foreground">{closeDeclared.trim() ? formatCurrency(closeDeclaredValue) : "R$ 0,00"}</p>
            </div>
            <div className={`rounded-xl border p-5 ${closeDifferenceToneClass}`}>
              <p className="text-xs uppercase tracking-widest mb-1">Diferenca</p>
              <p className="text-3xl font-bold">{closeDeclared.trim() ? formatCurrency(closeDifferencePreview) : "R$ 0,00"}</p>
              <p className="text-xs opacity-75 mt-1">
                {closeDeclared.trim() ? (closeDifferencePreview === 0 ? "Caixa conferido" : closeDifferencePreview > 0 ? "Declarado acima" : "Declarado abaixo") : "Aguardando contagem"}
              </p>
            </div>
          </div>

          {/* KPIs – linha 3: suprimento / sangria / ajuste */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-muted mb-1">Suprimento</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(cashTotals.suprimento)}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-muted mb-1">Sangria</p>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(cashTotals.sangria)}</p>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-xs text-muted mb-1">Ajuste</p>
              <p className="text-2xl font-bold text-sky-400">{formatCurrency(cashTotals.ajuste)}</p>
            </div>
          </div>

          {/* KPIs – linha 4: tempo turno / caixa inicial */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-4">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Tempo do Turno</p>
              <p className={`text-2xl font-bold ${shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>{shiftDurationLabel}</p>
            </div>
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-4">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Caixa Inicial</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(openingCashRegistered)}</p>
            </div>
          </div>

          {/* Tabela de empresas */}
          {currentDailyClosingRows.length > 0 && (
            <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-4">
              <p className="text-sm font-semibold text-foreground mb-3">{currentDailyClosingRows.length} empresa(s) registrada(s)</p>
              <DataTable
                columns={[
                  { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
                  { key: "informado", header: "Informado", render: (row) => formatCurrency(Number(row.ceia_base ?? 0)) },
                  { key: "lancado", header: "Lancado", render: (row) => formatCurrency(Number(row.ceia_total_lancado ?? 0)) },
                  { key: "faltante", header: "Faltante", render: (row) => { const v = Number(row.ceia_faltante ?? 0); return <span className={`font-semibold ${v === 0 ? "text-emerald-400" : v > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(v)}</span>; }},
                  { key: "liquido", header: "Dinheiro", render: (row) => { const v = Number(row.cash_net || 0); return <span className={`font-semibold ${v < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(v)}</span>; }},
                ]}
                rows={currentDailyClosingRows}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}

          {/* Checklist */}
          <div className="rounded-xl border border-border bg-[hsl(var(--card-elevated))] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Checklist de fechamento</p>
              <Badge variant={closeChecklistComplete ? "success" : "warning"}>{closeChecklistComplete ? "Completo" : "Pendente"}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[
                { key: "vendas", label: "Conferi os fechamentos por empresa" },
                { key: "movimentos", label: "Revisei sangrias, suprimentos e ajustes" },
                { key: "caixa", label: "Contei o caixa fisico da gaveta" },
                { key: "comprovantes", label: "Confirmei a conferencia geral" },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="checkbox" className="mt-0.5 rounded" checked={closeChecklist[item.key as keyof typeof closeChecklist]} onChange={() => setCloseChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Inputs e ações finais */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Valor contado (gaveta)" value={closeDeclared} onChange={(e) => setCloseDeclared(maskMoneyInput(e.target.value))} placeholder="0,00" hint="Conte o valor fisico antes de fechar." />
            <Input label="Observacoes" value={closeObs} onChange={(e) => setCloseObs(e.target.value)} placeholder="Divergencias ou repasses" hint={closeDeclared.trim() && closeDifferencePreview !== 0 ? "Obrigatorio quando houver diferenca." : ""} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted">O sistema calcula o dinheiro liquido e encerra o turno com rastreabilidade.</p>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)}>Continuar operando</Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmCloseShift}
                disabled={isClosing || currentDailyClosingRows.length === 0 || !closeDeclared.trim() || !closeChecklistComplete || (closeDeclared.trim() !== "" && closeDifferencePreview !== 0 && !closeObs.trim())}
              >
                {isClosing ? "Fechando..." : "Fechar turno"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CENTRAL VIAGENS (tela principal) ===== */}
      {!showCloseModal && show("ceia") && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Central Viagens</h1>
              <p className="text-sm text-muted">
                {shift
                  ? `Turno aberto · ${booths.find((b) => b.booth_id === shift.booth_id)?.booth_name ?? "Guiche"} · ${shiftDurationLabel}`
                  : "Abra um turno para iniciar os lancamentos"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="relative" onClick={() => void openChatPanel()}>
                <MessageSquare size={16} className="mr-1" /> Chat
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </Button>
              {shift && (
                <>
                  <Button variant="success" size="sm" onClick={() => { setCashModalType("suprimento"); setCashType("suprimento"); setShowCashModal(true); }} disabled={operatorBlocked}>Suprimento</Button>
                  <Button variant="danger" size="sm" onClick={() => { setCashModalType("sangria"); setCashType("sangria"); setShowCashModal(true); }} disabled={operatorBlocked}>Sangria</Button>
                  <Button variant="secondary" size="sm" onClick={() => openCloseShiftModal()} disabled={operatorBlocked}>
                    <Wallet size={16} className="mr-1" /> Fechar turno
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Abrir turno */}
          {!shift ? (
            <Card className="border-slate-600">
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-foreground mb-4">Nenhum turno aberto</p>
                <p className="text-sm text-muted mb-6">Selecione o guiche e abra o turno para lancar fechamentos.</p>
                <div className="flex items-center justify-center gap-3">
                  <Select value={boothId} onChange={(e) => setBoothId(e.target.value)} disabled={operatorBlocked} className="w-48">
                    <option value="">Selecione guiche</option>
                    {booths.map((b) => <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>)}
                  </Select>
                  <Button variant="success" onClick={openShift} disabled={operatorBlocked || !boothId}>Abrir Turno</Button>
                </div>
                {lastCloseResult && (
                  <div className="mt-6 mx-auto max-w-md rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4 text-left">
                    <p className="text-sm font-semibold text-foreground mb-2">Ultimo fechamento</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><p className="text-xs text-muted">Esperado</p><p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.expectedCash)}</p></div>
                      <div><p className="text-xs text-muted">Declarado</p><p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.declaredCash)}</p></div>
                      <div><p className="text-xs text-muted">Diferenca</p><p className={`font-semibold ${lastCloseResult.difference === 0 ? "text-emerald-400" : lastCloseResult.difference > 0 ? "text-amber-400" : "text-rose-400"}`}>{formatCurrency(lastCloseResult.difference)}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <>
              {/* BLOCO A: Entrada CEIA */}
              <Card>
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Lancamento de fechamento</h2>
                    <p className="text-sm text-muted">Preencha o total informado e distribua pelos meios de pagamento.</p>
                  </div>
                  <Badge variant={dailyClosingCeiaFaltante === 0 && dailyClosingFormCeiaBase > 0 ? "success" : "warning"}>
                    {dailyClosingCeiaFaltante === 0 && dailyClosingFormCeiaBase > 0 ? "Validacao ok" : "Preencha os campos"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input label="Data" type="date" value={dailyClosingDate} onChange={(e) => setDailyClosingDate(e.target.value)} />
                  <Select label="Empresa" value={dailyClosingCompany} onChange={(e) => setDailyClosingCompany(e.target.value)}>
                    <option value="">Selecione a empresa</option>
                    {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </Select>
                  <Input label="Total informado" value={dailyClosingCeiaBase} onChange={(e) => setDailyClosingCeiaBase(maskMoneyInput(e.target.value))} placeholder="0,00" />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input label="PIX" value={dailyClosingCeiaPix} onChange={(e) => setDailyClosingCeiaPix(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Debito" value={dailyClosingCeiaDebito} onChange={(e) => setDailyClosingCeiaDebito(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Credito" value={dailyClosingCeiaCredito} onChange={(e) => setDailyClosingCeiaCredito(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Dinheiro" value={dailyClosingCeiaDinheiro} onChange={(e) => setDailyClosingCeiaDinheiro(maskMoneyInput(e.target.value))} placeholder="0,00" />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input label="Link de pagamento" value={dailyClosingLinkPagamento} onChange={(e) => setDailyClosingLinkPagamento(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Taxa estadual" value={dailyClosingCeiaLinkEstadual} onChange={(e) => setDailyClosingCeiaLinkEstadual(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Taxa interestadual" value={dailyClosingCeiaLinkInterestadual} onChange={(e) => setDailyClosingCeiaLinkInterestadual(maskMoneyInput(e.target.value))} placeholder="0,00" />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label="Custos" value={dailyClosingCostsAmount} onChange={(e) => setDailyClosingCostsAmount(maskMoneyInput(e.target.value))} placeholder="0,00" />
                  <Input label="Sangria do resumo" value={dailyClosingSangriaAmount} onChange={(e) => setDailyClosingSangriaAmount(maskMoneyInput(e.target.value))} placeholder="0,00" />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label="Qtd taxa estadual" type="number" min="0" step="1" value={dailyClosingQtdTaxaEstadual} onChange={(e) => setDailyClosingQtdTaxaEstadual(e.target.value)} placeholder="0" />
                  <Input label="Qtd taxa interestadual" type="number" min="0" step="1" value={dailyClosingQtdTaxaInterestadual} onChange={(e) => setDailyClosingQtdTaxaInterestadual(e.target.value)} placeholder="0" />
                </div>

                <div className="mt-3">
                  <Input label="Observacoes" value={dailyClosingNotes} onChange={(e) => setDailyClosingNotes(e.target.value)} placeholder="Opcional" />
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className={`rounded-lg border px-3 py-2 text-sm ${dailyClosingCeiaFaltante === 0 && dailyClosingFormCeiaBase > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
                    {dailyClosingCeiaFaltante === 0 && dailyClosingFormCeiaBase > 0 ? "Meios de pagamento batem com o total informado." : dailyClosingFormCeiaBase === 0 ? "Informe o total." : `Faltam ${formatCurrency(Math.abs(dailyClosingCeiaFaltante))} para fechar.`}
                  </div>
                  <Button variant="success" onClick={saveDailyClosing} disabled={isSavingDailyClosing || !dailyClosingCompany || dailyClosingFormCeiaBase === 0}>
                    {isSavingDailyClosing ? "Salvando..." : "Salvar fechamento"}
                  </Button>
                </div>
              </Card>

              {/* BLOCO B: Resultado em tempo real */}
              <div className={`rounded-xl border p-6 ${dailyClosingCeiaToneClass}`}>
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Conferencia em tempo real</h2>
                    <p className="text-sm opacity-80">{dailyClosingCeiaStatusMessage}</p>
                  </div>
                  <Badge variant={dailyClosingCeiaStatus.variant}>{dailyClosingCeiaStatus.label}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Total vendido externo</p>
                    <p className="mt-2 text-3xl font-bold">{formatCurrency(dailyClosingFormCeiaBase)}</p>
                  </div>
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Total lancado</p>
                    <p className="mt-2 text-3xl font-bold">{formatCurrency(dailyClosingCeiaTotalLancado)}</p>
                  </div>
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Diferenca</p>
                    <p className="mt-2 text-3xl font-bold">{formatCurrency(dailyClosingCeiaFaltante)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Total abatimentos</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(dailyClosingTotalAbatimentos)}</p>
                  </div>
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Resultado liquido</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(dailyClosingResultadoLiquido)}</p>
                  </div>
                  <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-80">Custos + sangria</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(dailyClosingFormCostsAmount + dailyClosingFormSangriaAmount)}</p>
                  </div>
                </div>
                {dailyClosingCeiaFaltante !== 0 && (
                  <div className="mt-4 rounded-lg border border-current/30 bg-black/20 p-3 text-sm font-semibold">
                    <p className="text-[10px] uppercase tracking-wide opacity-80">Alerta</p>
                    <p className="mt-1">
                      {dailyClosingCeiaFaltante > 0
                        ? `Ainda faltam ${formatCurrency(dailyClosingCeiaFaltante)} para fechar.`
                        : `O lancamento excedeu em ${formatCurrency(Math.abs(dailyClosingCeiaFaltante))}.`}
                    </p>
                  </div>
                )}
              </div>

              {/* Resumo do dia */}
              {currentDailyClosingRows.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Card className="text-center p-4"><p className="text-xs text-muted uppercase mb-1">Total vendido externo</p><p className="text-xl font-bold text-amber-300">{formatCurrency(dailyClosingSummary.totalInformado)}</p></Card>
                  <Card className="text-center p-4"><p className="text-xs text-muted uppercase mb-1">Total lancado</p><p className="text-xl font-bold text-foreground">{formatCurrency(dailyClosingSummary.totalLancado)}</p></Card>
                  <Card className={`text-center p-4 ${dailyClosingSummary.faltante === 0 ? "border-emerald-500/30" : dailyClosingSummary.faltante > 0 ? "border-amber-500/30" : "border-rose-500/30"}`}>
                    <p className="text-xs text-muted uppercase mb-1">Diferenca</p>
                    <p className={`text-xl font-bold ${dailyClosingSummary.faltante === 0 ? "text-emerald-400" : dailyClosingSummary.faltante > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(dailyClosingSummary.faltante)}</p>
                  </Card>
                  <Card className="text-center p-4"><p className="text-xs text-muted uppercase mb-1">Resultado liquido</p><p className="text-xl font-bold text-foreground">{formatCurrency(dailyClosingSummary.resultadoLiquido)}</p></Card>
                </div>
              )}
            </>
          )}

          {/* BLOCO C: Historico CEIA */}
          <Card>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Historico de fechamentos</h2>
                <p className="text-sm text-muted">Todos os fechamentos salvos por data e empresa.</p>
              </div>
              <Badge variant="secondary">{filteredDailyClosingRows.length} registro{filteredDailyClosingRows.length !== 1 ? "s" : ""}</Badge>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Filtrar por data" type="date" value={dailyClosingFilterDate} onChange={(e) => setDailyClosingFilterDate(e.target.value)} />
              <Input label="Filtrar por empresa" value={dailyClosingFilterCompany} onChange={(e) => setDailyClosingFilterCompany(e.target.value)} placeholder="Ex.: MP" />
            </div>

            <DataTable
              columns={[
                { key: "data", header: "Data", render: (row) => isMounted ? new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") : row.date },
                { key: "guiche", header: "Guiche", render: (row) => booths.find((item) => item.booth_id === row.office_id)?.booth_name ?? row.office_id },
                { key: "empresa", header: "Empresa", render: (row) => <span className="font-semibold">{row.company}</span> },
                { key: "base", header: "Total vendido externo", render: (row) => formatCurrency(Number(row.ceia_base ?? row.total_sold ?? 0)) },
                { key: "lancado", header: "Lancado", render: (row) => formatCurrency(Number(row.ceia_total_lancado ?? 0)) },
                { key: "abatimentos", header: "Abatimentos", render: (row) => formatCurrency(Number(row.costs_amount ?? 0) + Number(row.sangria_amount ?? 0)) },
                { key: "resultado", header: "Resultado liquido", render: (row) => formatCurrency(Number(row.ceia_total_lancado ?? 0) - Number(row.costs_amount ?? 0) - Number(row.sangria_amount ?? 0)) },
                { key: "faltante", header: "Diferenca", render: (row) => {
                  const val = Number(row.ceia_faltante ?? 0);
                  return <span className={`font-semibold ${val === 0 ? "text-emerald-400" : val > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(val)}</span>;
                }},
                { key: "status", header: "Status", render: (row) => {
                  const val = Number(row.ceia_faltante ?? 0);
                  return <Badge variant={val === 0 ? "success" : val > 0 ? "warning" : "danger"}>{val === 0 ? "Conferido" : val > 0 ? "Faltando" : "Excedido"}</Badge>;
                }},
                { key: "acoes", header: "", render: (row) => <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedDailyClosingId(row.id)}>Detalhes</Button> },
              ]}
              rows={filteredDailyClosingRows}
              keyExtractor={(row) => row.id}
              emptyMessage="Nenhum fechamento salvo ainda."
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
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Total vendido externo</p><p className="font-semibold text-amber-300">{formatCurrency(Number(selectedDailyClosing.ceia_base ?? selectedDailyClosing.total_sold ?? 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Lancado</p><p className="font-semibold text-foreground">{formatCurrency(Number(selectedDailyClosing.ceia_total_lancado ?? 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Diferenca</p><p className={`font-semibold ${Number(selectedDailyClosing.ceia_faltante ?? 0) === 0 ? "text-emerald-400" : Number(selectedDailyClosing.ceia_faltante ?? 0) > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(Number(selectedDailyClosing.ceia_faltante ?? 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro liquido</p><p className={`font-semibold ${Number(selectedDailyClosing.cash_net || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(Number(selectedDailyClosing.cash_net || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Qtd taxas</p><p className="font-semibold text-foreground">{Number(selectedDailyClosing.qtd_taxa_estadual ?? 0)} est / {Number(selectedDailyClosing.qtd_taxa_interestadual ?? 0)} inter</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">PIX</p><p className="font-semibold text-cyan-400">{formatCurrency(Number(selectedDailyClosing.ceia_pix || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Debito</p><p className="font-semibold text-blue-400">{formatCurrency(Number(selectedDailyClosing.ceia_debito || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Credito</p><p className="font-semibold text-violet-400">{formatCurrency(Number(selectedDailyClosing.ceia_credito || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro</p><p className="font-semibold text-emerald-400">{formatCurrency(Number(selectedDailyClosing.ceia_dinheiro || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Link pagamento</p><p className="font-semibold text-sky-400">{formatCurrency(Number(selectedDailyClosing.link_pagamento || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa estadual</p><p className="font-semibold text-amber-300">{formatCurrency(Number(selectedDailyClosing.ceia_link_estadual || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa interestadual</p><p className="font-semibold text-amber-200">{formatCurrency(Number(selectedDailyClosing.ceia_link_interestadual || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Custos / Sangria</p><p className="font-semibold text-foreground">{formatCurrency(Number(selectedDailyClosing.costs_amount || 0) + Number(selectedDailyClosing.sangria_amount || 0))}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Custos</p><p className="font-semibold text-rose-300">{formatCurrency(Number(selectedDailyClosing.costs_amount || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Sangria</p><p className="font-semibold text-amber-300">{formatCurrency(Number(selectedDailyClosing.sangria_amount || 0))}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-muted">Resultado liquido</p><p className="font-semibold text-emerald-400">{formatCurrency(Number(selectedDailyClosing.ceia_total_lancado || 0) - Number(selectedDailyClosing.costs_amount || 0) - Number(selectedDailyClosing.sangria_amount || 0))}</p></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={Number(selectedDailyClosing.ceia_faltante ?? 0) === 0 ? "success" : Number(selectedDailyClosing.ceia_faltante ?? 0) > 0 ? "warning" : "danger"}>
                    {Number(selectedDailyClosing.ceia_faltante ?? 0) === 0 ? "Conferido" : Number(selectedDailyClosing.ceia_faltante ?? 0) > 0 ? "Faltando" : "Excedido"}
                  </Badge>
                  <Badge variant={selectedDailyClosing.status === "closed" ? "success" : "warning"}>{selectedDailyClosing.status === "closed" ? "Turno fechado" : "Turno aberto"}</Badge>
                </div>
                {selectedDailyClosing.notes && <p className="mt-3 text-sm text-muted">Obs: {selectedDailyClosing.notes}</p>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===== PONTO DIGITAL ===== */}
      {!showCloseModal && show("ponto") && (
        <OperatorPunchSection punches={punches} operatorBlocked={operatorBlocked} isMounted={isMounted} onRegisterPunch={registerPunch} />
      )}

      {/* ===== CONFIGURACOES ===== */}
      {!showCloseModal && show("configuracoes") && (
        <div className="space-y-6">
          <div><h1 className="text-2xl font-bold text-foreground">Configuracoes</h1><p className="text-sm text-muted">Preferencias do operador</p></div>
          <Card><p className="text-muted">Em breve: configuracoes do operador.</p></Card>
        </div>
      )}

      {/* Modal Abertura */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl">
            <div className="mb-4 border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">Abertura de Turno</h2>
              <p className="text-sm text-muted">Informe o caixa inicial do guiche {booths.find((item) => item.booth_id === boothId)?.booth_name ?? "selecionado"}.</p>
            </div>
            <div className="space-y-4">
              <Input label="Caixa inicial (R$)" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} autoFocus type="number" min="0" step="0.01" placeholder="0,00" hint="Sera registrado automaticamente como suprimento inicial." />
              <Input label="Observacao inicial (opcional)" value={openingNote} onChange={(e) => setOpeningNote(e.target.value)} placeholder="Ex.: troco inicial" />
            </div>
            <div className="mt-6 flex gap-3 justify-end border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowOpenShiftModal(false)}>Cancelar</Button>
              <Button type="button" variant="success" onClick={confirmOpenShift} disabled={isOpeningShift || openingCash.trim() === ""}>
                {isOpeningShift ? "Abrindo..." : "Confirmar abertura"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Suprimento/Sangria */}
      {showCashModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">{cashModalType === "suprimento" ? "Novo Suprimento" : "Nova Sangria"}</h2>
            <form onSubmit={submitCashMovement} className="space-y-4">
              <Input label="Valor (R$)" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} autoFocus type="number" min="0.01" step="0.01" required />
              <Input label="Observacao (Opcional)" value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Motivo" />
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowCashModal(false)}>Cancelar</Button>
                <Button type="submit" variant={cashModalType === "suprimento" ? "success" : "danger"}>Confirmar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <p className="font-semibold text-foreground">Chat · {activeChatBoothName}</p>
                <p className="text-xs text-muted">Conversa privada com o administrador</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowChat(false)}><X size={16} /></Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 px-1">
              {chatMessages.length === 0 && <p className="text-sm text-muted text-center py-8">Nenhuma mensagem ainda.</p>}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_role === "operator" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.sender_role === "operator" ? "bg-primary/20 text-foreground" : "bg-[hsl(var(--card-elevated))] text-foreground border border-border"}`}>
                    <p>{msg.message}</p>
                    {msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-primary underline">
                        {msg.attachment_name ?? "Anexo"}
                      </a>
                    )}
                    <p className="mt-1 text-[10px] text-muted">{isMounted ? new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChatMessage(); } }}
                    placeholder="Digite sua mensagem..."
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted"
                    disabled={isSendingChat}
                  />
                </div>
                <label className="cursor-pointer rounded-lg border border-border p-2 hover:bg-muted/20">
                  <Paperclip size={16} className="text-muted" />
                  <input key={chatAttachmentKey} type="file" className="hidden" onChange={handleChatAttachmentChange} disabled={isSendingChat} />
                </label>
                <Button type="button" variant="primary" size="sm" onClick={() => void sendChatMessage()} disabled={isSendingChat || (!newChatMessage.trim() && !newChatAttachment)}>
                  <Send size={16} />
                </Button>
              </div>
              {newChatAttachment && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <Paperclip size={12} />
                  <span className="truncate">{newChatAttachment.name}</span>
                  <button onClick={resetChatAttachment} className="text-rose-400 hover:text-rose-300"><X size={12} /></button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </RebuildShell>
  );
}
