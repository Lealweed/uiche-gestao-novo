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
  txs: TxRow[];
  lastCloseResult: LastCloseResult | null;
  unreadChatCount: number;
  isMounted: boolean;
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
  txs,
  lastCloseResult,
  unreadChatCount,
  isMounted,
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resumo do Turno</h1>
        <p className="text-sm text-muted">Visao geral do seu turno atual</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted">Status do Turno</p>
            {shift ? (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="font-semibold text-success">Turno Aberto</span>
              </div>
            ) : (
              <span className="font-semibold text-muted">Nenhum turno ativo</span>
            )}
          </div>
          <div className="flex items-center gap-3">
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
                Fechar Caixa PDV
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Total PIX</p>
          <p className="text-2xl font-bold text-info">{formatCurrency(totals.pix)}</p>
        </Card>
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Total Cartoes</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totals.credit + totals.debit)}</p>
        </Card>
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Total Dinheiro</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totals.cash)}</p>
        </Card>
        {totals.taxState > 0 && (
          <Card className="bg-indigo-500/10">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Taxa Estadual</p>
            <p className="text-2xl font-bold text-indigo-400">{formatCurrency(totals.taxState)}</p>
          </Card>
        )}
        {totals.taxFederal > 0 && (
          <Card className="bg-rose-500/10">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Taxa Federal</p>
            <p className="text-2xl font-bold text-rose-400">{formatCurrency(totals.taxFederal)}</p>
          </Card>
        )}
        <Card className="bg-[hsl(var(--card-elevated))]">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Total Geral</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Fechamento de Caixa</h3>
            <p className="text-sm text-muted">Resumo operacional para conferir o caixa do turno e acompanhar o ultimo encerramento.</p>
          </div>
          <Badge variant={lastCloseBadge.variant}>{lastCloseBadge.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Caixa esperado</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(cashTotals.saldo)}</p>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Suprimento</p>
            <p className="text-lg font-bold text-sky-400">{formatCurrency(cashTotals.suprimento)}</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Sangria</p>
            <p className="text-lg font-bold text-amber-400">{formatCurrency(cashTotals.sangria)}</p>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted">Ajuste</p>
            <p className="text-lg font-bold text-indigo-400">{formatCurrency(cashTotals.ajuste)}</p>
          </div>
        </div>

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
