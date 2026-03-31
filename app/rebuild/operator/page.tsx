"use client";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/app-routes";
import { isAdminPanelRole } from "@/lib/auth/roles";
import type { ToastType } from "@/components/rebuild/ui/toast";
import {
  closeShiftRecord,
  createCashMovementRecord,
  createTimePunchRecord,
  createTransactionRecord,
  openShiftRecord,
  uploadPaymentReceiptFile,
  upsertShiftCashClosingRecord,
  upsertTransactionReceiptRecord,
} from "@/lib/rebuild/crud/operator";
import {
  type BoothLink,
  type CashMovement,
  type Category,
  loadOperatorBootstrapData,
  loadOperatorCashMovements,
  loadOperatorPunches,
  loadOperatorTransactions,
  type Option,
  type Punch,
  type Shift,
  type Subcategory,
  type Tx,
} from "@/lib/rebuild/data/operator";
import { useRebuildSection } from "@/lib/rebuild/use-rebuild-section";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Toast } from "@/components/rebuild/ui/toast";
import { SummarySection } from "@/components/rebuild/operator/summary-section";
import { CashPdvSection } from "@/components/rebuild/operator/cash-pdv-section";
import { HistorySection } from "@/components/rebuild/operator/history-section";
import { TimeClockSection } from "@/components/rebuild/operator/time-clock-section";
import { SettingsSection } from "@/components/rebuild/operator/settings-section";
import { CloseShiftModal } from "@/components/rebuild/operator/close-shift-modal";

const supabase = createClient();

type OperatorSection = "resumo" | "caixa-pdv" | "historico" | "ponto" | "configuracoes";

type PaymentMethod = "pix" | "credit" | "debit" | "cash";
type CashMovementType = "suprimento" | "sangria" | "ajuste";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

const OPERATOR_SECTION_MAP: Record<string, OperatorSection> = {
  resumo: "resumo",
  "caixa-pdv": "caixa-pdv",
  historico: "historico",
  ponto: "ponto",
  configuracoes: "configuracoes",
};

export default function OperatorRebuildPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [operatorActive, setOperatorActive] = useState<boolean | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [booths, setBooths] = useState<BoothLink[]>([]);
  const [boothId, setBoothId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [ticketReference, setTicketReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("info");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashType, setCashType] = useState<CashMovementType>("suprimento");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [uploadingTxId, setUploadingTxId] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const { show } = useRebuildSection<OperatorSection>("resumo", OPERATOR_SECTION_MAP);

  useEffect(() => {
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id ?? "";
        if (!uid) return router.push(APP_ROUTES.login);
        setUserId(uid);

        const bootstrap = await loadOperatorBootstrapData(supabase, uid);
        setOperatorActive(bootstrap.operatorActive);
        if (isAdminPanelRole(bootstrap.profileRole)) return router.push(APP_ROUTES.rebuild.admin);

        setBooths(bootstrap.booths);
        setCompanies(bootstrap.companies);
        setCategories(bootstrap.categories);
        setSubcategories(bootstrap.subcategories);
        if (bootstrap.initialCategoryId) setCategoryId(bootstrap.initialCategoryId);
        if (bootstrap.initialSubcategoryId) setSubcategoryId(bootstrap.initialSubcategoryId);
        if (!bootstrap.shift && bootstrap.initialBoothId) setBoothId(bootstrap.initialBoothId);

        if (bootstrap.shift) {
          setShift(bootstrap.shift);
          await Promise.all([loadTransactions(bootstrap.shift.id), loadCashMovements(bootstrap.shift.id)]);
        }

        await loadPunches(uid);
      } catch (error) {
        setToastType("error");
        setMessage(`Erro: ${getErrorMessage(error)}`);
      }
    })();
  }, [router]);

  async function loadTransactions(shiftId: string) {
    setTxs(await loadOperatorTransactions(supabase, shiftId));
  }

  async function loadPunches(uid: string) {
    setPunches(await loadOperatorPunches(supabase, uid));
  }

  async function loadCashMovements(shiftId: string) {
    setCashMovements(await loadOperatorCashMovements(supabase, shiftId));
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string, unknown>) {
    if (!userId) return;
    await supabase.from("audit_logs").insert({ created_by: userId, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? {} });
  }

  async function openShift() {
    if (!boothId) return setMessage("Selecione um guiche.");
    try {
      const openedShift = await openShiftRecord(supabase, boothId);
      await logAction("OPEN_SHIFT", "shifts", openedShift.id, { booth_id: boothId });
      setShift(openedShift);
      setToastType("success");
      setMessage("Turno aberto.");
      await loadTransactions(openedShift.id);
      await loadCashMovements(openedShift.id);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function openCloseShiftModal() {
    if (!shift || !userId) return;
    const pending = txs.filter((tx) => (tx.payment_method === "credit" || tx.payment_method === "debit") && tx.receipt_count === 0).length;
    if (pending > 0) return setMessage(`${pending} lancamento(s) sem comprovante.`);
    const cashSales = txs.filter((tx) => tx.payment_method === "cash").reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const suprimento = cashMovements.filter((movement) => movement.movement_type === "suprimento").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const sangria = cashMovements.filter((movement) => movement.movement_type === "sangria").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const ajuste = cashMovements.filter((movement) => movement.movement_type === "ajuste").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    setExpectedCashVal(cashSales + suprimento - sangria + ajuste);
    setCloseDeclared("");
    setCloseObs("");
    setShowCloseModal(true);
  }

  async function confirmCloseShift() {
    if (!shift || !userId) return;
    setIsClosing(true);
    try {
      const declaredCash = Number(closeDeclared.replace(",", "."));
      if (Number.isNaN(declaredCash)) {
        setMessage("Valor invalido.");
        return;
      }
      const difference = Number((declaredCash - expectedCashVal).toFixed(2));
      const obs = closeObs.trim() || null;
      await upsertShiftCashClosingRecord(supabase, {
        shift_id: shift.id,
        booth_id: shift.booth_id,
        user_id: userId,
        expected_cash: Number(expectedCashVal.toFixed(2)),
        declared_cash: Number(declaredCash.toFixed(2)),
        difference,
        note: obs,
      });
      await closeShiftRecord(supabase, shift.id, obs);
      await logAction("CLOSE_SHIFT", "shifts", shift.id, { expected_cash: expectedCashVal, declared_cash: declaredCash, difference });
      setShift(null);
      setTxs([]);
      setCashMovements([]);
      setShowCloseModal(false);
      setToastType("success");
      setMessage(`Turno encerrado. Diferença: R$ ${difference.toFixed(2)}.`);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    } finally {
      setIsClosing(false);
    }
  }

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;
    const label = type === "entrada" ? "Entrada" : type === "saida" ? "Saida" : type === "pausa_inicio" ? "Inicio de pausa" : "Fim de pausa";
    try {
      await createTimePunchRecord(supabase, { user_id: userId, booth_id: (shift?.booth_id ?? boothId) || null, shift_id: shift?.id ?? null, punch_type: type, note: label });
      await logAction("TIME_PUNCH", "time_punches", undefined, { type });
      await loadPunches(userId);
      setToastType("success");
      setMessage(`Ponto: ${label}.`);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function submitCashMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift || !userId || !cashAmount) return;
    try {
      await createCashMovementRecord(supabase, {
        shift_id: shift.id,
        booth_id: shift.booth_id,
        user_id: userId,
        movement_type: cashType,
        amount: Number(cashAmount),
        note: cashNote.trim() || null,
      });
      setCashAmount("");
      setCashNote("");
      await loadCashMovements(shift.id);
      setToastType("success");
      setMessage("Movimento registrado.");
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function submitTx(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift || !companyId || !categoryId || !subcategoryId || !amount || !userId) return;
    try {
      const inserted = await createTransactionRecord(supabase, {
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
      });
      await logAction("CREATE_TRANSACTION", "transactions", inserted?.id, { amount: Number(amount), payment_method: paymentMethod });
      setAmount("");
      setTicketReference("");
      setNote("");
      setToastType("success");
      setMessage("Lançamento salvo.");
      await loadTransactions(shift.id);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro: ${getErrorMessage(error)}`);
    }
  }

  async function handleUploadReceipt(txId: string, event: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingTxId(txId);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${txId}.${ext}`;
    try {
      await uploadPaymentReceiptFile(supabase, path, file);
      await upsertTransactionReceiptRecord(supabase, { transaction_id: txId, storage_path: path, mime_type: file.type || "image/jpeg", uploaded_by: userId });
      await logAction("UPLOAD_RECEIPT", "transactions", txId, { path });
      setToastType("success");
      setMessage("Comprovante enviado.");
      if (shift) await loadTransactions(shift.id);
    } catch (error) {
      setToastType("error");
      setMessage(`Erro upload: ${getErrorMessage(error)}`);
    } finally {
      setUploadingTxId(null);
    }
  }

  const totals = useMemo(
    () => txs.reduce((acc, tx) => {
      acc[tx.payment_method] += Number(tx.amount || 0);
      return acc;
    }, { pix: 0, credit: 0, debit: 0, cash: 0 }),
    [txs]
  );
  const totalGeral = totals.pix + totals.credit + totals.debit + totals.cash;
  const cashTotals = useMemo(() => {
    const suprimento = cashMovements.filter((movement) => movement.movement_type === "suprimento").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const sangria = cashMovements.filter((movement) => movement.movement_type === "sangria").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    const ajuste = cashMovements.filter((movement) => movement.movement_type === "ajuste").reduce((acc, movement) => acc + Number(movement.amount || 0), 0);
    return { suprimento, sangria, ajuste, saldo: suprimento - sangria + ajuste };
  }, [cashMovements]);
  const filteredSubs = useMemo(() => subcategories.filter((subcategory) => subcategory.category_id === categoryId), [subcategories, categoryId]);
  const pendingReceiptTxs = useMemo(
    () => txs.filter((tx) => (tx.payment_method === "credit" || tx.payment_method === "debit") && tx.receipt_count === 0),
    [txs]
  );
  const operatorBlocked = operatorActive === false;

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    const firstSubcategory = subcategories.find((subcategory) => subcategory.category_id === nextCategoryId);
    setSubcategoryId(firstSubcategory?.id ?? "");
  }

  return (
    <RebuildShell>
      <Toast message={message} onClose={() => setMessage(null)} type={toastType} />
      <div className="grid gap-5">
        {show("resumo") ? (
          <SummarySection
            totalGeral={totalGeral}
            transactionCount={txs.length}
            pendingReceiptTxs={pendingReceiptTxs}
            cashSaldo={cashTotals.saldo}
            operatorBlocked={operatorBlocked}
            shift={shift}
            booths={booths}
            boothId={boothId}
            totals={totals}
            uploadingTxId={uploadingTxId}
            onBoothChange={setBoothId}
            onOpenShift={openShift}
            onOpenCloseShiftModal={openCloseShiftModal}
            onUploadReceipt={handleUploadReceipt}
          />
        ) : null}

        {show("caixa-pdv") ? (
          <CashPdvSection
            shift={shift}
            operatorBlocked={operatorBlocked}
            companies={companies}
            categories={categories}
            filteredSubcategories={filteredSubs}
            companyId={companyId}
            categoryId={categoryId}
            subcategoryId={subcategoryId}
            amount={amount}
            paymentMethod={paymentMethod}
            ticketReference={ticketReference}
            note={note}
            cashTotals={cashTotals}
            cashType={cashType}
            cashAmount={cashAmount}
            cashNote={cashNote}
            onCompanyIdChange={setCompanyId}
            onCategoryChange={handleCategoryChange}
            onSubcategoryChange={setSubcategoryId}
            onAmountChange={setAmount}
            onPaymentMethodChange={setPaymentMethod}
            onTicketReferenceChange={setTicketReference}
            onNoteChange={setNote}
            onSubmitTransaction={submitTx}
            onCashTypeChange={setCashType}
            onCashAmountChange={setCashAmount}
            onCashNoteChange={setCashNote}
            onSubmitCashMovement={submitCashMovement}
          />
        ) : null}

        {show("historico") ? (
          <HistorySection
            transactions={txs}
            cashMovements={cashMovements}
            pendingReceiptTxs={pendingReceiptTxs}
            uploadingTxId={uploadingTxId}
            operatorBlocked={operatorBlocked}
            onUploadReceipt={handleUploadReceipt}
          />
        ) : null}

        {show("ponto") ? <TimeClockSection punches={punches} operatorBlocked={operatorBlocked} onRegisterPunch={registerPunch} /> : null}

        {show("configuracoes") ? <SettingsSection operatorBlocked={operatorBlocked} shift={shift} totalGeral={totalGeral} booths={booths} /> : null}
      </div>

      <CloseShiftModal
        open={showCloseModal && Boolean(shift)}
        expectedCash={expectedCashVal}
        declaredCash={closeDeclared}
        note={closeObs}
        isClosing={isClosing}
        onClose={() => setShowCloseModal(false)}
        onConfirm={confirmCloseShift}
        onDeclaredCashChange={setCloseDeclared}
        onNoteChange={setCloseObs}
      />
    </RebuildShell>
  );
}
