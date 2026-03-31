import type { ChangeEvent } from "react";
import { Card, CardTitle } from "@/components/rebuild/ui/card";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Select } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
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

      <Card className="bg-white/5 border border-white/10 backdrop-blur p-6">
        <CardTitle>Controle de turno</CardTitle>
        {!shift ? (
          <div className="space-y-4">
            <Select
              value={boothId}
              onChange={(event) => onBoothChange(event.target.value)}
              className="bg-transparent border border-white/20 text-white rounded-lg p-2"
              disabled={operatorBlocked}
              label="Selecionar guiche"
            >
              <option value="">Selecione o guiche</option>
              {booths.map((booth) => (
                <option key={booth.booth_id} value={booth.booth_id}>
                  {booth.booth_name}
                </option>
              ))}
            </Select>
            {booths.length === 0 ? <p className="text-amber-400 text-sm">Nenhum guiche vinculado. Contate o admin.</p> : null}
            <Button
              variant="primary"
              className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl font-bold"
              type="button"
              onClick={onOpenShift}
              disabled={operatorBlocked || !boothId}
            >
              Abrir turno
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/60">Guiche ativo</p>
              <p className="font-bold text-emerald-400">Turno em andamento</p>
              <p className="text-sm text-white/60 mt-1">Total lancado: R$ {totalGeral.toFixed(2)}</p>
            </div>
            <Button variant="ghost" className="border border-rose-400/40 text-rose-400" type="button" onClick={onOpenCloseShiftModal} disabled={operatorBlocked}>
              Encerrar turno
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <SectionHeader title="Resumo por forma de pagamento" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <StatCard label="PIX" value={`R$ ${totals.pix.toFixed(2)}`} />
          <StatCard label="Credito" value={`R$ ${totals.credit.toFixed(2)}`} />
          <StatCard label="Debito" value={`R$ ${totals.debit.toFixed(2)}`} />
          <StatCard label="Dinheiro" value={`R$ ${totals.cash.toFixed(2)}`} />
        </div>
      </Card>

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
