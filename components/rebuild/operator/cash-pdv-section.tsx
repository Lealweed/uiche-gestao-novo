import type { FormEvent } from "react";
import { Card } from "@/components/rebuild/ui/card";
import { Select, Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { OperatorKpiCard } from "@/components/rebuild/operator/kpi-card";
import type { Category, Option, Shift, Subcategory } from "@/lib/rebuild/data/operator";

type PaymentMethod = "pix" | "credit" | "debit" | "cash";
type CashMovementType = "suprimento" | "sangria" | "ajuste";

type CashPdvSectionProps = {
  shift: Shift | null;
  operatorBlocked: boolean;
  companies: Option[];
  categories: Category[];
  filteredSubcategories: Subcategory[];
  companyId: string;
  categoryId: string;
  subcategoryId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  ticketReference: string;
  note: string;
  cashTotals: {
    suprimento: number;
    sangria: number;
    ajuste: number;
    saldo: number;
  };
  cashType: CashMovementType;
  cashAmount: string;
  cashNote: string;
  onCompanyIdChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onTicketReferenceChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmitTransaction: (event: FormEvent<HTMLFormElement>) => void;
  onCashTypeChange: (value: CashMovementType) => void;
  onCashAmountChange: (value: string) => void;
  onCashNoteChange: (value: string) => void;
  onSubmitCashMovement: (event: FormEvent<HTMLFormElement>) => void;
};

function getCompanyPct(company: Option) {
  return Number(company.commission_percent ?? company.comission_percent ?? 0);
}

export function CashPdvSection({
  shift,
  operatorBlocked,
  companies,
  categories,
  filteredSubcategories,
  companyId,
  categoryId,
  subcategoryId,
  amount,
  paymentMethod,
  ticketReference,
  note,
  cashTotals,
  cashType,
  cashAmount,
  cashNote,
  onCompanyIdChange,
  onCategoryChange,
  onSubcategoryChange,
  onAmountChange,
  onPaymentMethodChange,
  onTicketReferenceChange,
  onNoteChange,
  onSubmitTransaction,
  onCashTypeChange,
  onCashAmountChange,
  onCashNoteChange,
  onSubmitCashMovement,
}: CashPdvSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
      <Card className="p-0">
        <SectionHeader title="Lancamento no PDV" />
        <form onSubmit={onSubmitTransaction} className="grid gap-3 p-4">
          <Select label="Empresa" value={companyId} onChange={(event) => onCompanyIdChange(event.target.value)} required disabled={!shift || operatorBlocked}>
            <option value="">Selecione a empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({getCompanyPct(company)}%)
              </option>
            ))}
          </Select>
          <Select label="Categoria" value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} required disabled={!shift || operatorBlocked}>
            <option value="">Selecione a categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select label="Subcategoria" value={subcategoryId} onChange={(event) => onSubcategoryChange(event.target.value)} required disabled={!shift || operatorBlocked}>
            <option value="">Selecione</option>
            {filteredSubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </Select>
          <div>
            <label className="rb-form-label">Forma de pagamento</label>
            <div className="flex gap-2">
              {(["pix", "credit", "debit", "cash"] as const).map((method) => (
                <Button
                  key={method}
                  type="button"
                  variant={paymentMethod === method ? "primary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onPaymentMethodChange(method)}
                >
                  {method === "pix" ? "PIX" : method === "credit" ? "Credito" : method === "debit" ? "Debito" : "Dinheiro"}
                </Button>
              ))}
            </div>
          </div>
          <Input
            label="Valor (R$)"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            disabled={!shift || operatorBlocked}
          />
          <Input
            label="Referencia / Bilhete"
            value={ticketReference}
            onChange={(event) => onTicketReferenceChange(event.target.value)}
            placeholder="Ex: 12345"
            disabled={!shift || operatorBlocked}
          />
          <Input
            label="Observacao"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Opcional"
            disabled={!shift || operatorBlocked}
          />
          <Button type="submit" variant="primary" disabled={!shift || operatorBlocked}>
            Registrar lancamento
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <SectionHeader title="Caixa PDV" />
        <div className="grid grid-cols-2 gap-2 p-4">
          <OperatorKpiCard label="Suprimento" value={`R$ ${cashTotals.suprimento.toFixed(2)}`} />
          <OperatorKpiCard label="Sangria" value={`R$ ${cashTotals.sangria.toFixed(2)}`} />
          <OperatorKpiCard label="Ajuste" value={`R$ ${cashTotals.ajuste.toFixed(2)}`} />
          <OperatorKpiCard label="Saldo" value={`R$ ${cashTotals.saldo.toFixed(2)}`} accent />
        </div>
        <form onSubmit={onSubmitCashMovement} className="grid gap-2 p-4 pt-0">
          <Select value={cashType} onChange={(event) => onCashTypeChange(event.target.value as CashMovementType)} disabled={!shift || operatorBlocked} label="Tipo de movimento">
            <option value="suprimento">Suprimento</option>
            <option value="sangria">Sangria</option>
            <option value="ajuste">Ajuste</option>
          </Select>
          <div className="flex gap-2">
            <Input
              value={cashAmount}
              onChange={(event) => onCashAmountChange(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor"
              disabled={!shift || operatorBlocked}
              label="Valor"
            />
            <Input
              value={cashNote}
              onChange={(event) => onCashNoteChange(event.target.value)}
              placeholder="Obs (opcional)"
              disabled={!shift || operatorBlocked}
              label="Observacao"
            />
          </div>
          <Button type="submit" variant="primary" disabled={!shift || operatorBlocked}>
            Registrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
