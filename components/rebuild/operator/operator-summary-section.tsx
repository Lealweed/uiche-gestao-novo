"use client";

import { MessageSquare } from "lucide-react";

import { Badge, PaymentBadge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { Select } from "@/components/rebuild/ui/input";
import { DataTable } from "@/components/rebuild/ui/table";

type Shift = {
  id: string;
  booth_id: string;
  status: "open" | "closed";
  opened_at?: string;
  notes?: string | null;
};

type BoothLink = {
  booth_id: string;
  booth_name: string;
};

type TxRow = {
  id: string;
  amount: number;
  payment_method: "pix" | "credit" | "debit" | "cash";
  sold_at: string;
  company_name: string;
};

type Totals = {
  pix: number;
  credit: number;
  debit: number;
  cash: number;
  taxState: number;
  taxFederal: number;
};

type CashTotals = {
  suprimento: number;
  sangria: number;
  ajuste: number;
  saldo: number;
};

type LastCloseResult = {
  expectedCash: number;
  declaredCash: number;
  difference: number;
  note: string | null;
  closedAt: string;
};

type OperatorSummarySectionProps = {
  shift: Shift | null;
  boothId: string;
  booths: BoothLink[];
  operatorBlocked: boolean;
  totals: Totals;
  cashTotals: CashTotals;
  totalGeral: number;
  dailySummary: {
    totalSold: number;
    pix: number;
    card: number;
    cash: number;
    ceia: number;
    cashNet: number;
    expectedCash: number;
    count: number;
  };
  txs: TxRow[];
  lastCloseResult: LastCloseResult | null;
  unreadChatCount: number;
  isMounted: boolean;
  shiftDurationLabel: string;
  shiftNeedsAttention: boolean;
  openingCash: number;
  pendingReceiptCount: number;
  onBoothChange: (value: string) => void;
  onOpenShift: () => void | Promise<void>;
  onOpenCloseShiftModal: () => void | Promise<void>;
  onOpenChat: () => void | Promise<void>;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function OperatorSummarySection({
  shift,
  boothId,
  booths,
  operatorBlocked,
  totals,
  cashTotals,
  totalGeral,
  dailySummary,
  txs,
  lastCloseResult,
  unreadChatCount,
  isMounted,
  shiftDurationLabel,
  shiftNeedsAttention,
  openingCash,
  pendingReceiptCount,
  onBoothChange,
  onOpenShift,
  onOpenCloseShiftModal,
  onOpenChat,
}: OperatorSummarySectionProps) {
  const lastCloseBadge = !lastCloseResult
    ? { label: shift ? "Aguardando fechamento" : "Sem fechamento recente", variant: "secondary" as const }
    : lastCloseResult.difference === 0
      ? { label: "Conferido", variant: "success" as const }
      : lastCloseResult.difference > 0
        ? { label: "Sobra", variant: "warning" as const }
        : { label: "Falta", variant: "danger" as const };
  const selectedBoothName = booths.find((booth) => booth.booth_id === (shift?.booth_id ?? boothId))?.booth_name ?? "Guiche nao selecionado";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resumo do Turno</h1>
        <p className="text-sm text-muted">Visao geral do seu turno atual</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs uppercase tracking-wider text-muted">Status do Turno</p>
            {shift ? (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="font-semibold text-success">Turno Aberto</span>
                {shiftNeedsAttention && <Badge variant="warning">Atenção operacional</Badge>}
              </div>
            ) : (
              <span className="font-semibold text-muted">Nenhum turno ativo</span>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted">Guiche</p>
                <p className="mt-1 font-semibold text-foreground">{selectedBoothName}</p>
              </div>
              <div className={`rounded-lg border p-3 ${shiftNeedsAttention ? "border-amber-500/30 bg-amber-500/10" : "border-border bg-[hsl(var(--card-elevated))]"}`}>
                <p className="text-[10px] uppercase tracking-widest text-muted">Tempo do turno</p>
                <p className={`mt-1 font-semibold ${shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>{shiftDurationLabel}</p>
              </div>
              <div className="rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted">Caixa inicial</p>
                <p className="mt-1 font-semibold text-foreground">{formatCurrency(openingCash)}</p>
              </div>
            </div>

            {shiftNeedsAttention && (
              <p className="mt-3 text-sm text-amber-300">
                O turno atual já ultrapassou o tempo recomendado. Planeje o fechamento com conferência.
              </p>
            )}
            {pendingReceiptCount > 0 && (
              <p className="mt-2 text-sm text-rose-300">
                Existem {pendingReceiptCount} comprovante(s) pendentes antes do fechamento do caixa.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <Button variant="ghost" onClick={() => void onOpenChat()} className="relative">
              <MessageSquare className="h-4 w-4" />
              Falar com Admin
              {unreadChatCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadChatCount > 9 ? "9+" : unreadChatCount}
                </span>
              )}
            </Button>
            {!shift ? (
              <>
                <Select
                  value={boothId}
                  onChange={(e) => onBoothChange(e.target.value)}
                  disabled={operatorBlocked}
                  className="w-48"
                >
                  <option value="">Selecione guiche</option>
                  {booths.map((booth) => (
                    <option key={booth.booth_id} value={booth.booth_id}>
                      {booth.booth_name}
                    </option>
                  ))}
                </Select>
                <Button variant="success" onClick={() => void onOpenShift()} disabled={operatorBlocked || !boothId}>
                  Abrir Turno
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => void onOpenCloseShiftModal()} disabled={operatorBlocked}>
                Fechamento Diario
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Dinheiro</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totals.cash)}</p>
        </Card>
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">PIX</p>
          <p className="text-2xl font-bold text-info">{formatCurrency(totals.pix)}</p>
        </Card>
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Cartoes</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totals.credit + totals.debit)}</p>
        </Card>
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Total Geral</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
          {(totals.taxState + totals.taxFederal) > 0 && (
            <p className="text-xs text-muted mt-1">Taxas: {formatCurrency(totals.taxState + totals.taxFederal)}</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Fechamento Diario por Resumo</h3>
            <p className="text-sm text-muted">Consolide as empresas do dia sem precisar lancar bilhete por bilhete.</p>
          </div>
          <Badge variant={lastCloseBadge.variant}>{lastCloseBadge.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Total vendido</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(dailySummary.totalSold)}</p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">PIX</p>
            <p className="text-lg font-bold text-info">{formatCurrency(dailySummary.pix)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Cartao</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(dailySummary.card)}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Dinheiro bruto</p>
            <p className="text-lg font-bold text-success">{formatCurrency(dailySummary.cash)}</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">CEIA</p>
            <p className="text-lg font-bold text-amber-300">{formatCurrency(dailySummary.ceia)}</p>
          </div>
          <div className={`rounded-lg border p-3 ${dailySummary.cashNet < 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/20 bg-emerald-500/5"}`}>
            <p className="text-[10px] uppercase tracking-widest text-muted">Dinheiro liquido</p>
            <p className={`text-lg font-bold ${dailySummary.cashNet < 0 ? "text-rose-400" : "text-success"}`}>{formatCurrency(dailySummary.cashNet)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Registros salvos</p>
            <p className="text-lg font-bold text-foreground">{dailySummary.count}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Caixa esperado</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(dailySummary.expectedCash)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Suprimento</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(cashTotals.suprimento)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Sangria / Ajuste</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(cashTotals.ajuste - cashTotals.sangria)}</p>
          </div>
        </div>

        {dailySummary.cashNet < 0 && (
          <p className="mt-3 text-sm text-rose-300">Alerta: o saldo liquido em dinheiro ficou negativo neste fechamento.</p>
        )}

        {lastCloseResult && (
          <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted">Esperado</p>
                <p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.expectedCash)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted">Declarado</p>
                <p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.declaredCash)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted">Diferenca</p>
                <p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.difference)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted">Fechado em</p>
                <p className="font-semibold text-foreground">{isMounted ? new Date(lastCloseResult.closedAt).toLocaleString("pt-BR") : "--"}</p>
              </div>
            </div>
            {lastCloseResult.note && (
              <p className="mt-3 text-sm text-muted">Obs: {lastCloseResult.note}</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Ultimos Lancamentos</h3>
          <Badge variant="secondary">{txs.length} registros</Badge>
        </div>
        <DataTable
          columns={[
            {
              key: "hora",
              header: "Hora",
              render: (tx) =>
                isMounted
                  ? new Date(tx.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : "--",
            },
            { key: "empresa", header: "Empresa", render: (tx) => tx.company_name },
            { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
            {
              key: "valor",
              header: "Valor",
              render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span>,
            },
          ]}
          rows={txs.slice(0, 5)}
          emptyMessage="Sem lancamentos."
        />
      </Card>
    </div>
  );
}
