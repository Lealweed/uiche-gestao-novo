"use client";

import { CircleDot, Clock, Download, Printer, RefreshCw } from "lucide-react";

import { Button } from "@/components/rebuild/ui/button";

type AdminPageHeaderProps = {
  title: string;
  lastUpdate: Date | null;
  autoRefresh: boolean;
  loading: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onExport: () => void;
};

export function AdminPageHeader({
  title,
  lastUpdate,
  autoRefresh,
  loading,
  onToggleAutoRefresh,
  onRefresh,
  onExport,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Central Viagens</p>
          {lastUpdate && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Atualizado {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAutoRefresh}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            autoRefresh
              ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
              : "border border-border bg-slate-700/50 text-muted hover:text-foreground"
          }`}
          title={autoRefresh ? "Desativar atualizacao automatica" : "Ativar atualizacao automatica (60s)"}
        >
          <CircleDot className={`h-3 w-3 ${autoRefresh ? "animate-pulse" : ""}`} />
          {autoRefresh ? "Tempo Real" : "Manual"}
        </button>

        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
