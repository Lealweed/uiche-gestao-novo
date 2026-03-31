import { Card } from "@/components/rebuild/ui/card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import type { BoothLink, Shift } from "@/lib/rebuild/data/operator";

type SettingsSectionProps = {
  operatorBlocked: boolean;
  shift: Shift | null;
  totalGeral: number;
  booths: BoothLink[];
};

export function SettingsSection({ operatorBlocked, shift, totalGeral, booths }: SettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card className="p-0">
        <SectionHeader title="Status operacional" />
        <div className="grid gap-3 p-4 text-sm">
          <div>
            <p className="text-white/60">Perfil</p>
            <p className="font-semibold">{operatorBlocked ? "Inativo / bloqueado" : "Ativo para operacao"}</p>
          </div>
          <div>
            <p className="text-white/60">Turno</p>
            <p className="font-semibold">{shift ? "Aberto" : "Fechado"}</p>
          </div>
          <div>
            <p className="text-white/60">Ultimo total carregado</p>
            <p className="font-semibold">R$ {totalGeral.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <SectionHeader title="Guiches vinculados" />
        <div className="grid gap-2 p-4 text-sm">
          {booths.length > 0 ? (
            booths.map((booth) => (
              <div key={booth.booth_id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                {booth.booth_name}
              </div>
            ))
          ) : (
            <p className="text-white/60">Nenhum guiche vinculado a este operador.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
