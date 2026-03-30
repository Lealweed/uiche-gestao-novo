import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { DataTable } from "@/components/rebuild/ui/table";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import React from "react";

export const dynamic = "force-dynamic";

type RepasseRow = {
  company: string;
  qtd: number;
  total: number;
  comissao: number;
  liquido: number;
  txs: any[];
};

async function getRepassesData(): Promise<RepasseRow[]> {
  const supabase = createClient();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, amount, commission_amount, company:company_id(name), status, company_id")
    .eq("status", "posted");
  if (error) throw new Error(error.message);

  // Agrupa por company_id
  const grouped = new Map<string, any[]>();
  for (const tx of transactions || []) {
    const company = String(typeof tx.company === "object" && tx.company && "name" in tx.company ? tx.company.name : "-");
    if (!grouped.has(company)) grouped.set(company, []);
    grouped.get(company)!.push(tx);
  }
  // Monta linhas
  const rows: RepasseRow[] = Array.from(grouped.entries()).map(([company, txs]) => {
    const qtd = txs.length;
    const total = txs.reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const comissao = txs.reduce((a: number, t: any) => a + Number(t.commission_amount || 0), 0);
    const liquido = total - comissao;
    return {
      company,
      qtd,
      total,
      comissao,
      liquido,
      txs,
    };
  });
  return rows;
}

export default async function AcertoDeContasPage() {
  const rows = await getRepassesData();
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <SectionHeader title="Acerto de Contas" subtitle="Resumo de repasses de vendas por viação." />
      <Card className="mt-8">
        <DataTable
          columns={[
            { key: "company", header: "Empresa", render: (row) => row.company },
            { key: "qtd", header: "Qtd. Passagens", render: (row) => row.qtd },
            { key: "total", header: "Total Arrecadado", render: (row) => row.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { key: "comissao", header: "Comissão Retida", render: (row) => row.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
            { key: "liquido", header: "Valor Líquido a Repassar", render: (row) => <span className="text-red-600 font-bold">{row.liquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> },
            {
              key: "acoes",
              header: "Ações",
              render: (row) => (
                <form action="/api/repasse/baixar" method="POST">
                  <input type="hidden" name="company" value={row.company} />
                  <Button type="submit" variant="primary">Baixar Repasse</Button>
                </form>
              ),
            },
          ]}
          rows={rows}
          keyExtractor={(row) => row.company}
        />
      </Card>
    </div>
  );
}
