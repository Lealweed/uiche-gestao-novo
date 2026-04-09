"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, CircleDot, Clock3, MessageSquare, ReceiptText, Wallet } from "lucide-react";

import { boothOf, formatCurrency, nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { Drawer } from "@/components/rebuild/ui/drawer";
import { SectionHeader } from "@/components/rebuild/ui/section-header";

type BoothRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type OperatorBoothLink = {
  id: string;
  active: boolean;
  operator_id?: string;
  booth_id?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { name: string; code: string } | { name: string; code: string }[] | null;
};

type ShiftRow = {
  shift_id: string;
  booth_id?: string;
  operator_id?: string;
  booth_name: string;
  operator_name: string;
  status: "open" | "closed";
  opened_at?: string;
  closed_at?: string;
};

type TimePunchRow = {
  id: string;
  punch_type: string;
  punched_at: string;
  note: string | null;
  user_id?: string;
  booth_id?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type AttendanceRow = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  full_name: string;
};

type TxRow = {
  id: string;
  amount: number;
  sold_at?: string;
  operator_id?: string;
  booth_id?: string;
};

type CashMovementRow = {
  id: string;
  movement_type: "suprimento" | "sangria" | "ajuste";
  amount: number;
  created_at: string;
  booth_id?: string;
  note?: string | null;
};

type ShiftCashClosingRow = {
  id: string;
  difference: number;
  created_at: string;
  booth_id?: string;
  note?: string | null;
};

type ConversationShortcut = {
  operatorId: string;
  operatorName: string;
  boothId: string;
  boothName: string;
};

type AdminOperatorsSectionProps = {
  booths: BoothRow[];
  operatorBoothLinks: OperatorBoothLink[];
  shiftRows: ShiftRow[];
  timePunchRows: TimePunchRow[];
  attendanceRows: AttendanceRow[];
  reportTxs: TxRow[];
  cashMovementRows: CashMovementRow[];
  shiftCashClosingRows: ShiftCashClosingRow[];
  isMounted: boolean;
  punchPage: number;
  punchPerPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onOpenConversation: (shortcut: ConversationShortcut) => void;
};

type BoothSummary = {
  booth: BoothRow;
  operatorId: string | null;
  operatorName: string;
  boothActive: boolean;
  online: boolean;
  attendanceActive: boolean;
  shiftOpen: boolean;
  totalToday: number;
  txCountToday: number;
  movementCountToday: number;
  shiftDurationLabel: string;
  shiftNeedsAttention: boolean;
  lastDifference: number;
  lastClosingAt: string | null;
  lastActivityAt: string | null;
  lastActivityLabel: string;
};

function isSameLocalDay(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function formatPunchType(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDurationSince(value?: string | null) {
  if (!value) return "Sem turno ativo";
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${Math.max(1, minutes)} min`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
}

export function AdminOperatorsSection({
  booths,
  operatorBoothLinks,
  shiftRows,
  timePunchRows,
  attendanceRows,
  reportTxs,
  cashMovementRows,
  shiftCashClosingRows,
  isMounted,
  punchPage,
  punchPerPage,
  onPreviousPage,
  onNextPage,
  onOpenConversation,
}: AdminOperatorsSectionProps) {
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);

  const boothSummaries = useMemo<BoothSummary[]>(() => {
    return booths
      .map((booth) => {
        const activeLink = operatorBoothLinks.find((link) => link.booth_id === booth.id && link.active);
        const latestShift = shiftRows.find((row) => row.booth_id === booth.id);
        const openShift = shiftRows.find((row) => row.booth_id === booth.id && row.status === "open");
        const lastClosing = shiftCashClosingRows.find((row) => row.booth_id === booth.id);
        const operatorId = activeLink?.operator_id ?? openShift?.operator_id ?? null;
        const operatorName = nameOf(activeLink?.profiles ?? null) ?? openShift?.operator_name ?? "Nao vinculado";
        const activeAttendance = operatorId ? attendanceRows.find((row) => row.user_id === operatorId && !row.clock_out) : null;
        const txsToday = reportTxs.filter((tx) => tx.booth_id === booth.id && isSameLocalDay(tx.sold_at));
        const movementsToday = cashMovementRows.filter((movement) => movement.booth_id === booth.id && isSameLocalDay(movement.created_at));
        const latestPunch = timePunchRows.find((punch) => {
          const punchBooth = boothOf(punch.booths);
          return punchBooth ? punchBooth.code === booth.code || punchBooth.name === booth.name : false;
        });
        const shiftNeedsAttention = Boolean(
          openShift?.opened_at && Date.now() - new Date(openShift.opened_at).getTime() >= 10 * 60 * 60 * 1000,
        );

        const candidates = [
          latestPunch
            ? { at: latestPunch.punched_at, label: `Ponto: ${formatPunchType(latestPunch.punch_type)}` }
            : null,
          txsToday[0]?.sold_at
            ? { at: txsToday[0].sold_at, label: "Lancamento registrado" }
            : null,
          openShift?.opened_at
            ? { at: openShift.opened_at, label: shiftNeedsAttention ? "Turno aberto em atencao" : "Turno aberto" }
            : null,
          lastClosing?.created_at
            ? { at: lastClosing.created_at, label: Math.abs(Number(lastClosing.difference || 0)) > 0.009 ? "Ultimo fechamento com divergencia" : "Ultimo fechamento conferido" }
            : null,
          latestShift?.closed_at
            ? { at: latestShift.closed_at, label: "Ultimo turno fechado" }
            : null,
        ].filter((candidate): candidate is { at: string; label: string } => Boolean(candidate?.at));

        const latestActivity = candidates.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0] ?? null;

        return {
          booth,
          operatorId,
          operatorName,
          boothActive: booth.active,
          online: Boolean(activeAttendance || openShift),
          attendanceActive: Boolean(activeAttendance),
          shiftOpen: openShift?.status === "open",
          totalToday: txsToday.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
          txCountToday: txsToday.length,
          movementCountToday: movementsToday.length,
          shiftDurationLabel: openShift?.opened_at ? formatDurationSince(openShift.opened_at) : "Sem turno ativo",
          shiftNeedsAttention,
          lastDifference: Number(lastClosing?.difference ?? 0),
          lastClosingAt: lastClosing?.created_at ?? latestShift?.closed_at ?? null,
          lastActivityAt: latestActivity?.at ?? null,
          lastActivityLabel: latestActivity?.label ?? "Sem atividade recente",
        };
      })
      .sort((a, b) => Number(b.online) - Number(a.online) || Number(b.shiftOpen) - Number(a.shiftOpen) || a.booth.name.localeCompare(b.booth.name));
  }, [attendanceRows, booths, cashMovementRows, operatorBoothLinks, reportTxs, shiftCashClosingRows, shiftRows, timePunchRows]);

  const operationalSummary = useMemo(() => ({
    openCount: boothSummaries.filter((summary) => summary.shiftOpen).length,
    attentionCount: boothSummaries.filter((summary) => summary.shiftNeedsAttention).length,
    divergenceCount: boothSummaries.filter((summary) => Math.abs(summary.lastDifference) > 0.009).length,
  }), [boothSummaries]);

  const selectedBooth = boothSummaries.find((summary) => summary.booth.id === selectedBoothId) ?? null;
  const paginatedRows = timePunchRows.slice((punchPage - 1) * punchPerPage, punchPage * punchPerPage);
  const totalPages = Math.ceil(timePunchRows.length / punchPerPage);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeader
          title="Resumo por Guiche"
          subtitle="Clique em um guiche para abrir um resumo operacional rapido."
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="border border-border/70 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Turnos abertos agora</p>
                <p className="text-lg font-semibold text-foreground">{operationalSummary.openCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border border-border/70 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Turnos em atencao</p>
                <p className="text-lg font-semibold text-foreground">{operationalSummary.attentionCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border border-border/70 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Fechamentos com divergencia</p>
                <p className="text-lg font-semibold text-foreground">{operationalSummary.divergenceCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {boothSummaries.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhum guiche cadastrado no momento.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {boothSummaries.map((summary) => (
              <button
                key={summary.booth.id}
                type="button"
                onClick={() => setSelectedBoothId(summary.booth.id)}
                className="text-left"
              >
                <Card className="h-full border border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{summary.booth.code}</p>
                      <h3 className="truncate text-base font-semibold text-foreground">{summary.booth.name}</h3>
                    </div>
                    <Badge variant={summary.shiftOpen ? "success" : "secondary"}>
                      {summary.shiftOpen ? "Turno aberto" : "Fechado"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Operador</span>
                      <span className="max-w-[60%] truncate font-medium text-foreground">{summary.operatorName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Status</span>
                      <span className={`font-medium ${summary.online ? "text-emerald-400" : "text-slate-300"}`}>
                        {summary.online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Hoje</span>
                      <span className="font-medium text-foreground">{formatCurrency(summary.totalToday)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Lancamentos</span>
                      <span className="font-medium text-foreground">{summary.txCountToday}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Tempo</span>
                      <span className={`font-medium ${summary.shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>{summary.shiftDurationLabel}</span>
                    </div>
                  </div>

                  {(summary.shiftNeedsAttention || Math.abs(summary.lastDifference) > 0.009) && (
                    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
                      {summary.shiftNeedsAttention
                        ? `Turno aberto alem do ideal (${summary.shiftDurationLabel}).`
                        : `Ultimo fechamento com ${summary.lastDifference > 0 ? "sobra" : "falta"} de ${formatCurrency(Math.abs(summary.lastDifference))}.`}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                    <span className="truncate">{summary.lastActivityLabel}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      Ver resumo
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Registro de Ponto</h2>
          <span className="text-sm text-muted">{timePunchRows.length} registros</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedRows.map((punch) => {
            const booth = boothOf(punch.booths);
            const punchTypeColors: Record<string, string> = {
              entrada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
              saida: "bg-amber-500/20 text-amber-400 border-amber-500/30",
              pausa_inicio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
              pausa_fim: "bg-purple-500/20 text-purple-400 border-purple-500/30",
            };
            const colorClass = punchTypeColors[punch.punch_type] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";

            return (
              <Card key={punch.id} className="relative overflow-hidden">
                <div className={`absolute left-0 top-0 h-full w-1 ${colorClass.split(" ")[0]}`} />
                <div className="pl-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge className={colorClass}>{formatPunchType(punch.punch_type)}</Badge>
                    <span className="text-xs text-muted">{isMounted ? new Date(punch.punched_at).toLocaleString("pt-BR") : "--"}</span>
                  </div>
                  <p className="mb-1 font-semibold text-foreground">{nameOf(punch.profiles) ?? "Operador"}</p>
                  <p className="text-sm text-muted">{booth ? `${booth.code} - ${booth.name}` : "-"}</p>
                  {punch.note && <p className="mt-2 text-xs italic text-muted">{punch.note}</p>}
                </div>
              </Card>
            );
          })}
        </div>

        {timePunchRows.length > punchPerPage && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" disabled={punchPage === 1} onClick={onPreviousPage}>
              Anterior
            </Button>
            <span className="px-4 text-sm text-muted">
              Pagina {punchPage} de {totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={punchPage >= totalPages} onClick={onNextPage}>
              Proxima
            </Button>
          </div>
        )}
      </div>

      <Drawer
        open={Boolean(selectedBooth)}
        onClose={() => setSelectedBoothId(null)}
        title={selectedBooth ? `${selectedBooth.booth.code} - ${selectedBooth.booth.name}` : "Resumo do Guiche"}
        description="Visao operacional objetiva do guiche selecionado."
        size="lg"
      >
        {selectedBooth && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={selectedBooth.boothActive ? "success" : "neutral"}>
                Guiche {selectedBooth.boothActive ? "ativo" : "inativo"}
              </Badge>
              <Badge variant={selectedBooth.online ? "success" : "secondary"}>
                Operador {selectedBooth.online ? "online" : "offline"}
              </Badge>
              <Badge variant={selectedBooth.attendanceActive ? "primary" : "neutral"}>
                Ponto {selectedBooth.attendanceActive ? "ativo" : "inativo"}
              </Badge>
              <Badge variant={selectedBooth.shiftOpen ? "success" : "neutral"}>
                Turno {selectedBooth.shiftOpen ? "aberto" : "fechado"}
              </Badge>
              {selectedBooth.shiftNeedsAttention && <Badge variant="warning">Acompanhar fechamento</Badge>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="border border-border/70 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Total do dia</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(selectedBooth.totalToday)}</p>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/70 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Lancamentos no dia</p>
                    <p className="text-lg font-semibold text-foreground">{selectedBooth.txCountToday}</p>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/70 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                    <CircleDot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Operador vinculado</p>
                    <p className="text-sm font-semibold text-foreground">{selectedBooth.operatorName}</p>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/70 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Ultima atividade</p>
                    <p className="text-sm font-semibold text-foreground">{selectedBooth.lastActivityLabel}</p>
                    <p className="text-xs text-muted">
                      {selectedBooth.lastActivityAt ? (isMounted ? new Date(selectedBooth.lastActivityAt).toLocaleString("pt-BR") : "--") : "Sem registros recentes"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/70 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Controle do turno</p>
                    <p className={`text-sm font-semibold ${selectedBooth.shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>
                      {selectedBooth.shiftDurationLabel}
                    </p>
                    <p className="text-xs text-muted">
                      {Math.abs(selectedBooth.lastDifference) > 0.009
                        ? `Ultima divergencia: ${formatCurrency(selectedBooth.lastDifference)}`
                        : "Sem divergencia relevante no ultimo fechamento"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="border border-border/70">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Nome do guiche</p>
                  <p className="mt-1 font-medium text-foreground">{selectedBooth.booth.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Codigo</p>
                  <p className="mt-1 font-medium text-foreground">{selectedBooth.booth.code}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Status do guiche</p>
                  <p className="mt-1 font-medium text-foreground">{selectedBooth.boothActive ? "Ativo" : "Inativo"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Operador atual</p>
                  <p className="mt-1 font-medium text-foreground">{selectedBooth.operatorName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Tempo do turno</p>
                  <p className={`mt-1 font-medium ${selectedBooth.shiftNeedsAttention ? "text-amber-300" : "text-foreground"}`}>{selectedBooth.shiftDurationLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Movimentos de caixa hoje</p>
                  <p className="mt-1 font-medium text-foreground">{selectedBooth.movementCountToday}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  if (!selectedBooth.operatorId) return;
                  onOpenConversation({
                    operatorId: selectedBooth.operatorId,
                    operatorName: selectedBooth.operatorName,
                    boothId: selectedBooth.booth.id,
                    boothName: selectedBooth.booth.name,
                  });
                }}
                disabled={!selectedBooth.operatorId}
                icon={<MessageSquare className="h-4 w-4" />}
              >
                Abrir conversa
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelectedBoothId(null)} icon={<Building2 className="h-4 w-4" />}>
                Fechar resumo
              </Button>
            </div>

            {!selectedBooth.operatorId && (
              <p className="text-xs text-muted">Vincule um operador a este guiche para usar o atalho de conversa.</p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
