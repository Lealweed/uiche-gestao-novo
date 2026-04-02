"use client";

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

type OperatorSummarySectionProps = {
  shift: Shift | null;
  boothId: string;
  booths: BoothLink[];
  operatorBlocked: boolean;
  totals: Totals;
  totalGeral: number;
  txs: TxRow[];
  isMounted: boolean;
  onBoothChange: (value: string) => void;
  onOpenShift: () => void | Promise<void>;
  onOpenCloseShiftModal: () => void | Promise<void>;
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
  totalGeral,
  txs,
  isMounted,
  onBoothChange,
  onOpenShift,
  onOpenCloseShiftModal,
}: OperatorSummarySectionProps) {
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
          {!shift ? (
            <div className="flex items-center gap-3">
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
            </div>
          ) : (
            <Button variant="danger" onClick={() => void onOpenCloseShiftModal()} disabled={operatorBlocked}>
              Encerrar Turno
            </Button>
          )}
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
