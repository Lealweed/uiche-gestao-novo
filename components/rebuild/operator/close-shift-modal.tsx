import { Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";

type CloseShiftModalProps = {
  open: boolean;
  expectedCash: number;
  declaredCash: string;
  note: string;
  isClosing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDeclaredCashChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export function CloseShiftModal({
  open,
  expectedCash,
  declaredCash,
  note,
  isClosing,
  onClose,
  onConfirm,
  onDeclaredCashChange,
  onNoteChange,
}: CloseShiftModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#27272a]">
          <h2 className="text-lg font-bold text-[#f4f4f5]">Fechamento de Caixa</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#27272a]/50 p-4 rounded-lg flex justify-between items-center border border-[#3f3f46]/50">
            <span className="text-[#a1a1aa] text-sm">Valor esperado gaveta</span>
            <span className="text-[#10b981] font-bold">R$ {expectedCash.toFixed(2)}</span>
          </div>
          <Input
            label="Valor contado (gaveta)"
            value={declaredCash}
            onChange={(event) => onDeclaredCashChange(event.target.value)}
            autoFocus
            type="number"
            min="0"
            step="0.01"
          />
          <Input label="Observacoes do fechamento (opcional)" value={note} onChange={(event) => onNoteChange(event.target.value)} />
        </div>
        <div className="p-5 border-t border-[#27272a] bg-[#18181b] flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} disabled={isClosing || !declaredCash}>
            {isClosing ? "Encerrando..." : "Confirmar encerramento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
