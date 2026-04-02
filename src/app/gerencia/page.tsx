import React from "react";
import { getGerenciaDashboardData } from "@/lib/gerencia-dashboard";
import { LoadingState } from "@/components/rebuild/ui/loading-state";

// LEGADO: página mantida apenas como referência histórica.
// O fluxo principal ativo do sistema está em `app/` com `/rebuild/admin` e `/rebuild/operator`.
import { ErrorState } from "@/components/rebuild/ui/error-state";
import { DataTable } from "@/components/rebuild/ui/table";

export default async function GerenciaDashboardPage() {
  let data, error;
  try {
    data = await getGerenciaDashboardData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro desconhecido";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-10">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data) {
    return <LoadingState />;
  }

  const { faturamento, repasse, lucro, ultimasOperacoes, totalVendas } = data;
  const isEmpty = totalVendas === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Cards de Big Number */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <BigNumberCard
          label="Faturamento Bruto"
          value={faturamento}
          color="from-sapphire-400 to-sapphire-600"
        />
        <BigNumberCard
          label="Repasse às Viações (85%)"
          value={repasse}
          color="from-yellow-400 to-yellow-600"
        />
        <BigNumberCard
          label="Lucro Central Viagens (15%)"
          value={lucro}
          color="from-emerald-400 to-emerald-600"
        />
      </div>
      {/* Tabela Últimas Operações */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-sapphire-200">Últimas Operações</h2>
        <DataTable<string[]>
          columns={[
            { key: "data", header: "Data/Hora", render: (row) => row[0] },
            { key: "empresa", header: "Empresa", render: (row) => row[1] },
            { key: "passageiro", header: "Passageiro", render: (row) => row[2] },
            { key: "valor", header: "Valor", render: (row) => row[3] },
            { key: "forma_pagamento", header: "Forma de Pagamento", render: (row) => row[4] },
            { key: "operador", header: "Operador", render: (row) => row[5] },
          ]}
          rows={ultimasOperacoes}
          emptyMessage={isEmpty ? "Nenhuma venda registrada neste mês." : undefined}
          keyExtractor={(_, idx) => String(idx)}
        />
      </section>
    </div>
  );
}

function BigNumberCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className={`rounded-2xl p-8 bg-gradient-to-br ${color} shadow-xl flex flex-col items-center min-h-[160px]`}
    >
      <span className="text-lg font-medium text-white/80 mb-2">{label}</span>
      <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{value}</span>
    </div>
  );
}
