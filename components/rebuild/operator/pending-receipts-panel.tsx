import type { ChangeEvent } from "react";
import type { Tx } from "@/lib/rebuild/data/operator";

type PendingReceiptsPanelProps = {
  transactions: Tx[];
  uploadingTxId: string | null;
  operatorBlocked: boolean;
  limit?: number;
  onUploadReceipt: (txId: string, event: ChangeEvent<HTMLInputElement>) => void;
};

export function PendingReceiptsPanel({
  transactions,
  uploadingTxId,
  operatorBlocked,
  limit,
  onUploadReceipt,
}: PendingReceiptsPanelProps) {
  const visibleTransactions = typeof limit === "number" ? transactions.slice(0, limit) : transactions;

  if (visibleTransactions.length === 0) return null;

  return (
    <div className="rb-panel" style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)" }}>
      <p className="rb-panel-title" style={{ marginBottom: "0.75rem", color: "var(--ds-primary)" }}>
        Comprovantes pendentes ({transactions.length})
      </p>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {visibleTransactions.map((transaction) => (
          <div
            key={transaction.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "0.65rem 0.75rem",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "var(--ds-radius-sm)",
              background: "rgba(245,158,11,0.05)",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                {transaction.company_name} · R$ {Number(transaction.amount).toFixed(2)}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--ds-muted)" }}>
                {transaction.payment_method.toUpperCase()} ·{" "}
                {new Date(transaction.sold_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <label className="rb-btn-ghost" style={{ cursor: "pointer", fontSize: "0.8125rem", minHeight: "auto", padding: "0.3rem 0.65rem" }}>
              {uploadingTxId === transaction.id ? "Enviando..." : "Anexar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                style={{ display: "none" }}
                disabled={uploadingTxId === transaction.id || operatorBlocked}
                onChange={(event) => onUploadReceipt(transaction.id, event)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
