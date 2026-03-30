import { getGerenciaDashboardData } from "@/lib/gerencia-dashboard";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { Card } from "@/components/rebuild/ui/card";
import React from "react";

export const dynamic = "force-dynamic";

export default async function GerenciaDashboardPage() {
  const data = await getGerenciaDashboardData();

  // TODO: Ajustar para buscar e somar commission_amount e taxa_embarque se disponível
  // Aqui usamos apenas amount, pois taxa_embarque não está no schema
  // commission_amount está disponível, mas não está sendo buscado na função

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <SectionHeader title="Fechamento do Dia" subtitle="Resumo financeiro do fechamento de vendas do dia." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
        <StatCard
          label="Vendas Totais Brutas"
          value={data.faturamento}
          delta="Soma total de vendas brutas."
        />
        <StatCard
          label="Lucro da Agência"
          value={data.lucro}
          delta="Comissão total retida pela agência."
        />
        <StatCard
          label="Repasse às Viações"
          value={data.repasse}
          delta="Valor a ser repassado às viações."
        />
      </div>
      <Card className="mt-8 p-4">
        <SectionHeader title="Últimas Operações" />
        {/* Aqui pode-se adicionar uma tabela de últimas operações se necessário */}
      </Card>
    </div>
  );
}
