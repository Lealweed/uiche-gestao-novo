import type { ChangeEvent } from "react";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge, PaymentBadge } from "@/components/rebuild/ui/badge";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import type { CashMovement, Tx } from "@/lib/rebuild/data/operator";
import { PendingReceiptsPanel } from "@/components/rebuild/operator/pending-receipts-panel";

type HistorySectionProps = {
  transactions: Tx[];
  cashMovements: CashMovement[];
  pendingReceiptTxs: Tx[];
  uploadingTxId: string | null;
  operatorBlocked: boolean;
  onUploadReceipt: (txId: string, event: ChangeEvent<HTMLInputElement>) => void;
};

export function HistorySection({
  transactions,
  cashMovements,
  pendingReceiptTxs,
  uploadingTxId,
  operatorBlocked,
  onUploadReceipt,
}: HistorySectionProps) {
  return (
    <div className="grid gap-5">
      <PendingReceiptsPanel
        transactions={pendingReceiptTxs}
        uploadingTxId={uploadingTxId}
        operatorBlocked={operatorBlocked}
        onUploadReceipt={onUploadReceipt}
      />

      <Card className="p-0">
        <SectionHeader title="Lancamentos do turno" />
        <DataTable
          columns={[
            { key: "hora", header: "Hora", render: (transaction) => <span className="text-muted-foreground text-xs">{new Date(transaction.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> },
            { key: "empresa", header: "Empresa", render: (transaction) => <span className="font-semibold">{transaction.company_name}</span> },
            { key: "metodo", header: "Metodo", render: (transaction) => <PaymentBadge method={transaction.payment_method} /> },
            { key: "valor", header: "Valor", render: (transaction) => <span className="font-bold">R$ {Number(transaction.amount).toFixed(2)}</span> },
            {
              key: "comprovante",
              header: "Comprovante",
              render: (transaction) =>
                transaction.receipt_count > 0 ? (
                  <Badge variant="success">OK</Badge>
                ) : transaction.payment_method === "credit" || transaction.payment_method === "debit" ? (
                  <Badge variant="warning">PENDENTE</Badge>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={transactions}
          emptyMessage="Sem lancamentos neste turno."
          className="mt-2"
        />
      </Card>

      <Card className="p-0">
        <SectionHeader title="Movimentos de caixa" />
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (movement) => new Date(movement.created_at).toLocaleString("pt-BR") },
            { key: "tipo", header: "Tipo", render: (movement) => <Badge variant="neutral">{movement.movement_type}</Badge> },
            { key: "valor", header: "Valor", render: (movement) => <span className="font-bold">R$ {Number(movement.amount).toFixed(2)}</span> },
            { key: "obs", header: "Obs", render: (movement) => movement.note ?? "—" },
          ]}
          rows={cashMovements}
          emptyMessage="Sem movimentos de caixa neste turno."
          className="mt-2"
        />
      </Card>
    </div>
  );
}
