"use client";

import { Dispatch, SetStateAction } from "react";
import { MessageSquare, Wallet } from "lucide-react";

import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { DataTable } from "@/components/rebuild/ui/table";
import { Input, Select } from "@/components/rebuild/ui/input";

type CompanyOption = {
  id: string;
  name: string;
};

type Shift = {
  booth_id: string;
};

type BoothLink = {
  booth_id: string;
  booth_name: string;
};

type LastCloseResult = {
  expectedCash: number;
  declaredCash: number;
  difference: number;
};

type DailyCashClosingRow = {
  id: string;
  office_id: string;
  date: string;
  company: string;
  total_sold: number;
  ceia_base: number;
  ceia_pix: number;
  ceia_debito: number;
  ceia_credito: number;
  ceia_link_estadual: number;
  ceia_link_interestadual: number;
  ceia_dinheiro: number;
  ceia_total_lancado: number;
  ceia_faltante: number;
  qtd_taxa_estadual: number;
  qtd_taxa_interestadual: number;
  link_pagamento: number;
  costs_amount: number;
  sangria_amount: number;
  cash_net: number;
  status: "open" | "closed";
  notes: string | null;
};

type Summary = {
  totalInformado: number;
  totalLancado: number;
  resultadoLiquido: number;
  faltante: number;
};

type FormModel = {
  date: string;
  company: string;
  ceiaBase: string;
  ceiaPix: string;
  ceiaDebito: string;
  ceiaCredito: string;
  ceiaDinheiro: string;
  linkPagamento: string;
  ceiaLinkEstadual: string;
  ceiaLinkInterestadual: string;
  qtdTaxaEstadual: string;
  qtdTaxaInterestadual: string;
  costsAmount: string;
  sangriaAmount: string;
  notes: string;
  formCeiaBase: number;
  formCostsAmount: number;
  formSangriaAmount: number;
  ceiaTotalLancado: number;
  totalAbatimentos: number;
  resultadoLiquido: number;
  ceiaFaltante: number;
  ceiaStatus: { label: string; variant: "success" | "warning" | "danger" };
  ceiaToneClass: string;
  ceiaStatusMessage: string;
  isSaving: boolean;
  setDate: Dispatch<SetStateAction<string>>;
  setCompany: Dispatch<SetStateAction<string>>;
  setCeiaBase: Dispatch<SetStateAction<string>>;
  setCeiaPix: Dispatch<SetStateAction<string>>;
  setCeiaDebito: Dispatch<SetStateAction<string>>;
  setCeiaCredito: Dispatch<SetStateAction<string>>;
  setCeiaDinheiro: Dispatch<SetStateAction<string>>;
  setLinkPagamento: Dispatch<SetStateAction<string>>;
  setCeiaLinkEstadual: Dispatch<SetStateAction<string>>;
  setCeiaLinkInterestadual: Dispatch<SetStateAction<string>>;
  setQtdTaxaEstadual: Dispatch<SetStateAction<string>>;
  setQtdTaxaInterestadual: Dispatch<SetStateAction<string>>;
  setCostsAmount: Dispatch<SetStateAction<string>>;
  setSangriaAmount: Dispatch<SetStateAction<string>>;
  setNotes: Dispatch<SetStateAction<string>>;
  onSave: () => void | Promise<void>;
  maskMoneyInput: (value: string) => string;
};

type HistoryModel = {
  currentRows: DailyCashClosingRow[];
  summary: Summary;
  filterDate: string;
  filterCompany: string;
  filteredRows: DailyCashClosingRow[];
  selectedRow: DailyCashClosingRow | null;
  setFilterDate: Dispatch<SetStateAction<string>>;
  setFilterCompany: Dispatch<SetStateAction<string>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
};

type OperatorCeiaSectionProps = {
  userId: string;
  shift: Shift | null;
  booths: BoothLink[];
  boothId: string;
  companies: CompanyOption[];
  operatorBlocked: boolean;
  shiftDurationLabel: string;
  lastCloseResult: LastCloseResult | null;
  unreadChatCount: number;
  isMounted: boolean;
  setBoothId: Dispatch<SetStateAction<string>>;
  onOpenChat: () => void | Promise<void>;
  onOpenSupply: () => void;
  onOpenWithdrawal: () => void;
  onOpenCloseShift: () => void;
  onOpenShift: () => void;
  form: FormModel;
  history: HistoryModel;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function OperatorCeiaSection({
  shift,
  booths,
  boothId,
  companies,
  operatorBlocked,
  shiftDurationLabel,
  lastCloseResult,
  unreadChatCount,
  isMounted,
  setBoothId,
  onOpenChat,
  onOpenSupply,
  onOpenWithdrawal,
  onOpenCloseShift,
  onOpenShift,
  form,
  history,
}: OperatorCeiaSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central Viagens</h1>
          <p className="text-sm text-muted">
            {shift
              ? `Turno aberto · ${booths.find((booth) => booth.booth_id === shift.booth_id)?.booth_name ?? "Guiche"} · ${shiftDurationLabel}`
              : "Abra um turno para iniciar os lancamentos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="relative" onClick={() => void onOpenChat()}>
            <MessageSquare size={16} className="mr-1" /> Chat
            {unreadChatCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            ) : null}
          </Button>
          {shift ? (
            <>
              <Button variant="success" size="sm" onClick={onOpenSupply} disabled={operatorBlocked}>Entrada</Button>
              <Button variant="danger" size="sm" onClick={onOpenWithdrawal} disabled={operatorBlocked}>Saida</Button>
              <Button variant="secondary" size="sm" onClick={onOpenCloseShift} disabled={operatorBlocked}>
                <Wallet size={16} className="mr-1" /> Fechar turno
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {!shift ? (
        <Card className="border-slate-600">
          <div className="py-8 text-center">
            <p className="mb-4 text-lg font-semibold text-foreground">Nenhum turno aberto</p>
            <p className="mb-6 text-sm text-muted">Selecione o guiche e abra o turno para lancar fechamentos.</p>
            <div className="flex items-center justify-center gap-3">
              <Select value={boothId} onChange={(event) => setBoothId(event.target.value)} disabled={operatorBlocked} className="w-48">
                <option value="">Selecione guiche</option>
                {booths.map((booth) => <option key={booth.booth_id} value={booth.booth_id}>{booth.booth_name}</option>)}
              </Select>
              <Button variant="success" onClick={onOpenShift} disabled={operatorBlocked || !boothId}>Abrir Turno</Button>
            </div>
            {lastCloseResult ? (
              <div className="mx-auto mt-6 max-w-md rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4 text-left">
                <p className="mb-2 text-sm font-semibold text-foreground">Ultimo fechamento</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-xs text-muted">Esperado</p><p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.expectedCash)}</p></div>
                  <div><p className="text-xs text-muted">Declarado</p><p className="font-semibold text-foreground">{formatCurrency(lastCloseResult.declaredCash)}</p></div>
                  <div><p className="text-xs text-muted">Diferenca</p><p className={`font-semibold ${lastCloseResult.difference === 0 ? "text-emerald-400" : lastCloseResult.difference > 0 ? "text-amber-400" : "text-rose-400"}`}>{formatCurrency(lastCloseResult.difference)}</p></div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Lancamento de fechamento</h2>
                <p className="text-sm text-muted">Preencha o total informado e distribua pelos meios de pagamento.</p>
              </div>
              <Badge variant={form.ceiaFaltante === 0 && form.formCeiaBase > 0 ? "success" : "warning"}>
                {form.ceiaFaltante === 0 && form.formCeiaBase > 0 ? "Validacao ok" : "Preencha os campos"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Data" type="date" value={form.date} onChange={(event) => form.setDate(event.target.value)} />
              <Select label="Empresa" value={form.company} onChange={(event) => form.setCompany(event.target.value)}>
                <option value="">Selecione a empresa</option>
                {companies.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
              </Select>
              <Input label="Total informado" value={form.ceiaBase} onChange={(event) => form.setCeiaBase(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input label="PIX" value={form.ceiaPix} onChange={(event) => form.setCeiaPix(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Debito" value={form.ceiaDebito} onChange={(event) => form.setCeiaDebito(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Credito" value={form.ceiaCredito} onChange={(event) => form.setCeiaCredito(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Dinheiro" value={form.ceiaDinheiro} onChange={(event) => form.setCeiaDinheiro(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Link de pagamento" value={form.linkPagamento} onChange={(event) => form.setLinkPagamento(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Taxa estadual" value={form.ceiaLinkEstadual} onChange={(event) => form.setCeiaLinkEstadual(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Taxa interestadual" value={form.ceiaLinkInterestadual} onChange={(event) => form.setCeiaLinkInterestadual(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Custos" value={form.costsAmount} onChange={(event) => form.setCostsAmount(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
              <Input label="Saida do resumo" value={form.sangriaAmount} onChange={(event) => form.setSangriaAmount(form.maskMoneyInput(event.target.value))} placeholder="0,00" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Qtd taxa estadual" type="number" min="0" step="1" value={form.qtdTaxaEstadual} onChange={(event) => form.setQtdTaxaEstadual(event.target.value)} placeholder="0" />
              <Input label="Qtd taxa interestadual" type="number" min="0" step="1" value={form.qtdTaxaInterestadual} onChange={(event) => form.setQtdTaxaInterestadual(event.target.value)} placeholder="0" />
            </div>

            <div className="mt-3">
              <Input label="Observacoes" value={form.notes} onChange={(event) => form.setNotes(event.target.value)} placeholder="Opcional" />
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className={`rounded-lg border px-3 py-2 text-sm ${form.ceiaFaltante === 0 && form.formCeiaBase > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
                {form.ceiaFaltante === 0 && form.formCeiaBase > 0 ? "Meios de pagamento batem com o total informado." : form.formCeiaBase === 0 ? "Informe o total." : `Faltam ${formatCurrency(Math.abs(form.ceiaFaltante))} para fechar.`}
              </div>
              <Button variant="success" onClick={() => void form.onSave()} disabled={form.isSaving || !form.company || form.formCeiaBase === 0}>
                {form.isSaving ? "Salvando..." : "Salvar fechamento"}
              </Button>
            </div>
          </Card>

          <div className={`rounded-xl border p-6 ${form.ceiaToneClass}`}>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Conferencia em tempo real</h2>
                <p className="text-sm opacity-80">{form.ceiaStatusMessage}</p>
              </div>
              <Badge variant={form.ceiaStatus.variant}>{form.ceiaStatus.label}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Total vendido externo</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(form.formCeiaBase)}</p>
              </div>
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Total lancado</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(form.ceiaTotalLancado)}</p>
              </div>
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Diferenca</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(form.ceiaFaltante)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Total abatimentos</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(form.totalAbatimentos)}</p>
              </div>
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Resultado liquido</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(form.resultadoLiquido)}</p>
              </div>
              <div className="rounded-lg border border-current/20 bg-black/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide opacity-80">Custos + saida</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(form.formCostsAmount + form.formSangriaAmount)}</p>
              </div>
            </div>
            {form.ceiaFaltante !== 0 ? (
              <div className="mt-4 rounded-lg border border-current/30 bg-black/20 p-3 text-sm font-semibold">
                <p className="text-[10px] uppercase tracking-wide opacity-80">Alerta</p>
                <p className="mt-1">
                  {form.ceiaFaltante > 0 ? `Ainda faltam ${formatCurrency(form.ceiaFaltante)} para fechar.` : `O lancamento excedeu em ${formatCurrency(Math.abs(form.ceiaFaltante))}.`}
                </p>
              </div>
            ) : null}
          </div>

          {history.currentRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card className="p-4 text-center"><p className="mb-1 text-xs uppercase text-muted">Total vendido externo</p><p className="text-xl font-bold text-amber-300">{formatCurrency(history.summary.totalInformado)}</p></Card>
              <Card className="p-4 text-center"><p className="mb-1 text-xs uppercase text-muted">Total lancado</p><p className="text-xl font-bold text-foreground">{formatCurrency(history.summary.totalLancado)}</p></Card>
              <Card className={`p-4 text-center ${history.summary.faltante === 0 ? "border-emerald-500/30" : history.summary.faltante > 0 ? "border-amber-500/30" : "border-rose-500/30"}`}><p className="mb-1 text-xs uppercase text-muted">Diferenca</p><p className={`text-xl font-bold ${history.summary.faltante === 0 ? "text-emerald-400" : history.summary.faltante > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(history.summary.faltante)}</p></Card>
              <Card className="p-4 text-center"><p className="mb-1 text-xs uppercase text-muted">Resultado liquido</p><p className="text-xl font-bold text-foreground">{formatCurrency(history.summary.resultadoLiquido)}</p></Card>
            </div>
          ) : null}
        </>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Historico de fechamentos</h2>
            <p className="text-sm text-muted">Todos os fechamentos salvos por data e empresa.</p>
          </div>
          <Badge variant="secondary">{history.filteredRows.length} registro{history.filteredRows.length !== 1 ? "s" : ""}</Badge>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Filtrar por data" type="date" value={history.filterDate} onChange={(event) => history.setFilterDate(event.target.value)} />
          <Input label="Filtrar por empresa" value={history.filterCompany} onChange={(event) => history.setFilterCompany(event.target.value)} placeholder="Ex.: MP" />
        </div>

        <DataTable
          columns={[
            { key: "data", header: "Data", render: (row: DailyCashClosingRow) => isMounted ? new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") : row.date },
            { key: "guiche", header: "Guiche", render: (row: DailyCashClosingRow) => booths.find((item) => item.booth_id === row.office_id)?.booth_name ?? row.office_id },
            { key: "empresa", header: "Empresa", render: (row: DailyCashClosingRow) => <span className="font-semibold">{row.company}</span> },
            { key: "base", header: "Total vendido externo", render: (row: DailyCashClosingRow) => formatCurrency(Number(row.ceia_base ?? row.total_sold ?? 0)) },
            { key: "lancado", header: "Lancado", render: (row: DailyCashClosingRow) => formatCurrency(Number(row.ceia_total_lancado ?? 0)) },
            { key: "abatimentos", header: "Abatimentos", render: (row: DailyCashClosingRow) => formatCurrency(Number(row.costs_amount ?? 0) + Number(row.sangria_amount ?? 0)) },
            { key: "resultado", header: "Resultado liquido", render: (row: DailyCashClosingRow) => formatCurrency(Number(row.ceia_total_lancado ?? 0) - Number(row.costs_amount ?? 0) - Number(row.sangria_amount ?? 0)) },
            { key: "faltante", header: "Diferenca", render: (row: DailyCashClosingRow) => {
              const value = Number(row.ceia_faltante ?? 0);
              return <span className={`font-semibold ${value === 0 ? "text-emerald-400" : value > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(value)}</span>;
            } },
            { key: "status", header: "Status", render: (row: DailyCashClosingRow) => {
              const value = Number(row.ceia_faltante ?? 0);
              return <Badge variant={value === 0 ? "success" : value > 0 ? "warning" : "danger"}>{value === 0 ? "Conferido" : value > 0 ? "Faltando" : "Excedido"}</Badge>;
            } },
            { key: "acoes", header: "", render: (row: DailyCashClosingRow) => <Button type="button" size="sm" variant="ghost" onClick={() => history.setSelectedId(row.id)}>Detalhes</Button> },
          ]}
          rows={history.filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhum fechamento salvo ainda."
        />

        {history.selectedRow ? (
          <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--card-elevated))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Detalhes do fechamento</p>
                <p className="text-xs text-muted">{history.selectedRow.company} em {isMounted ? new Date(`${history.selectedRow.date}T12:00:00`).toLocaleDateString("pt-BR") : history.selectedRow.date}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => history.setSelectedId(null)}>Fechar</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Total vendido externo</p><p className="font-semibold text-amber-300">{formatCurrency(Number(history.selectedRow.ceia_base ?? history.selectedRow.total_sold ?? 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Lancado</p><p className="font-semibold text-foreground">{formatCurrency(Number(history.selectedRow.ceia_total_lancado ?? 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Diferenca</p><p className={`font-semibold ${Number(history.selectedRow.ceia_faltante ?? 0) === 0 ? "text-emerald-400" : Number(history.selectedRow.ceia_faltante ?? 0) > 0 ? "text-amber-300" : "text-rose-400"}`}>{formatCurrency(Number(history.selectedRow.ceia_faltante ?? 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro liquido</p><p className={`font-semibold ${Number(history.selectedRow.cash_net || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatCurrency(Number(history.selectedRow.cash_net || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Qtd taxas</p><p className="font-semibold text-foreground">{Number(history.selectedRow.qtd_taxa_estadual ?? 0)} est / {Number(history.selectedRow.qtd_taxa_interestadual ?? 0)} inter</p></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">PIX</p><p className="font-semibold text-cyan-400">{formatCurrency(Number(history.selectedRow.ceia_pix || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Debito</p><p className="font-semibold text-blue-400">{formatCurrency(Number(history.selectedRow.ceia_debito || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Credito</p><p className="font-semibold text-violet-400">{formatCurrency(Number(history.selectedRow.ceia_credito || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Dinheiro</p><p className="font-semibold text-emerald-400">{formatCurrency(Number(history.selectedRow.ceia_dinheiro || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Link pagamento</p><p className="font-semibold text-sky-400">{formatCurrency(Number(history.selectedRow.link_pagamento || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa estadual</p><p className="font-semibold text-amber-300">{formatCurrency(Number(history.selectedRow.ceia_link_estadual || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Taxa interestadual</p><p className="font-semibold text-amber-200">{formatCurrency(Number(history.selectedRow.ceia_link_interestadual || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Custos / Saida</p><p className="font-semibold text-foreground">{formatCurrency(Number(history.selectedRow.costs_amount || 0) + Number(history.selectedRow.sangria_amount || 0))}</p></div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Custos</p><p className="font-semibold text-rose-300">{formatCurrency(Number(history.selectedRow.costs_amount || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Saida</p><p className="font-semibold text-amber-300">{formatCurrency(Number(history.selectedRow.sangria_amount || 0))}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Resultado liquido</p><p className="font-semibold text-emerald-400">{formatCurrency(Number(history.selectedRow.ceia_total_lancado || 0) - Number(history.selectedRow.costs_amount || 0) - Number(history.selectedRow.sangria_amount || 0))}</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={Number(history.selectedRow.ceia_faltante ?? 0) === 0 ? "success" : Number(history.selectedRow.ceia_faltante ?? 0) > 0 ? "warning" : "danger"}>
                {Number(history.selectedRow.ceia_faltante ?? 0) === 0 ? "Conferido" : Number(history.selectedRow.ceia_faltante ?? 0) > 0 ? "Faltando" : "Excedido"}
              </Badge>
              <Badge variant={history.selectedRow.status === "closed" ? "success" : "warning"}>{history.selectedRow.status === "closed" ? "Turno fechado" : "Turno aberto"}</Badge>
            </div>
            {history.selectedRow.notes ? <p className="mt-3 text-sm text-muted">Obs: {history.selectedRow.notes}</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}