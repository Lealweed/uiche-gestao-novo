import type { ChangeEvent } from "react";
import { Card, CardTitle } from "@/components/rebuild/ui/card";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Select } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { PaymentPieChart } from "@/components/rebuild/ui/charts";
import type { BoothLink, Shift, Tx } from "@/lib/rebuild/data/operator";
import { PendingReceiptsPanel } from "@/components/rebuild/operator/pending-receipts-panel";

type PaymentTotals = {
  pix: number;
  credit: number;
  debit: number;
  cash: number;
};

type SummarySectionProps = {
  totalGeral: number;
  transactionCount: number;
  pendingReceiptTxs: Tx[];
  cashSaldo: number;
  operatorBlocked: boolean;
  shift: Shift | null;
  booths: BoothLink[];
  boothId: string;
  totals: PaymentTotals;
  uploadingTxId: string | null;
  onBoothChange: (value: string) => void;
  onOpenShift: () => void;
  onOpenCloseShiftModal: () => void;
  onUploadReceipt: (txId: string, event: ChangeEvent<HTMLInputElement>) => void;
};

export function SummarySection({
  totalGeral,
  transactionCount,
  pendingReceiptTxs,
  cashSaldo,
  operatorBlocked,
  shift,
  booths,
  boothId,
  totals,
  uploadingTxId,
  onBoothChange,
  onOpenShift,
  onOpenCloseShiftModal,
  onUploadReceipt,
}: SummarySectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total do turno" value={`R$ ${totalGeral.toFixed(2)}`} delta={`${transactionCount} lancamentos`} />
        <StatCard label="Pendencias" value={String(pendingReceiptTxs.length)} delta="Comprovantes a anexar" />
        <StatCard label="Saldo do caixa" value={`R$ ${cashSaldo.toFixed(2)}`} delta="PDV em tempo real" />
        <StatCard label="Status do operador" value={operatorBlocked ? "Bloqueado" : "Ativo"} delta={shift ? "Turno em andamento" : "Aguardando abertura"} />
      </div>

      <Card className="p-6">
        <CardTitle>Controle de turno</CardTitle>
        {!shift ? (
          <div className="space-y-4 mt-4">
            <Select
              value={boothId}
              onChange={(event) => onBoothChange(event.target.value)}
              disabled={operatorBlocked}
              label="Selecionar guichê"
            >
              <option value="">Selecione o guichê</option>
              {booths.map((booth) => (
                <option key={booth.booth_id} value={booth.booth_id}>
                  {booth.booth_name}
                </option>
              ))}
            </Select>
            {booths.length === 0 ? (
              <p style={{ color: "var(--ds-warning)", fontSize: "0.875rem" }}>
                Nenhum guichê vinculado. Contate o administrador.
              </p>
            ) : null}
            <Button
              variant="primary"
              type="button"
              onClick={onOpenShift}
              disabled={operatorBlocked || !boothId}
            >
              Abrir turno
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 mt-4">
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--ds-muted)" }}>Guichê ativo</p>
              <p style={{ fontWeight: 700, color: "var(--ds-accent)" }}>Turno em andamento</p>
              <p style={{ fontSize: "0.875rem", color: "var(--ds-muted)", marginTop: "0.25rem" }}>
                Total lançado: R$ {totalGeral.toFixed(2)}
              </p>
            </div>
            <Button variant="danger" type="button" onClick={onOpenCloseShiftModal} disabled={operatorBlocked}>
              Encerrar turno
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-0">
          <SectionHeader title="Resumo por forma de pagamento" />
          <div className="grid grid-cols-2 gap-3 p-4">
            <StatCard label="PIX"      value={`R$ ${totals.pix.toFixed(2)}`} />
            <StatCard label="Crédito"  value={`R$ ${totals.credit.toFixed(2)}`} />
            <StatCard label="Débito"   value={`R$ ${totals.debit.toFixed(2)}`} />
            <StatCard label="Dinheiro" value={`R$ ${totals.cash.toFixed(2)}`} />
          </div>
        </Card>
        <Card className="p-4">
          <SectionHeader title="Distribuição do turno" />
          <PaymentPieChart
            pix={totals.pix}
            credit={totals.credit}
            debit={totals.debit}
            cash={totals.cash}
          />
        </Card>
      </div>

      <PendingReceiptsPanel
        transactions={pendingReceiptTxs}
        uploadingTxId={uploadingTxId}
        operatorBlocked={operatorBlocked}
        limit={4}
        onUploadReceipt={onUploadReceipt}
      />
    </>
  );
}
