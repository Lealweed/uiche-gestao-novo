"use client";

import { boothOf, nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";

type TimePunchRow = {
  id: string;
  punch_type: string;
  punched_at: string;
  note: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { code: string; name: string } | { code: string; name: string }[] | null;
};

type AdminOperatorsSectionProps = {
  timePunchRows: TimePunchRow[];
  punchPage: number;
  punchPerPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function AdminOperatorsSection({
  timePunchRows,
  punchPage,
  punchPerPage,
  onPreviousPage,
  onNextPage,
}: AdminOperatorsSectionProps) {
  const paginatedRows = timePunchRows.slice((punchPage - 1) * punchPerPage, punchPage * punchPerPage);
  const totalPages = Math.ceil(timePunchRows.length / punchPerPage);

  return (
    <>
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
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={colorClass}>{punch.punch_type.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted">{new Date(punch.punched_at).toLocaleString("pt-BR")}</span>
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
    </>
  );
}
