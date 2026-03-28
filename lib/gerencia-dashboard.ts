import { createClient } from "@/lib/supabase/server";

/**
 * Busca dados reais do dashboard da gerência a partir da tabela 'transactions' do Supabase.
 * Inclui faturamento do mês, repasse, lucro e últimas operações.
 */
export async function getGerenciaDashboardData() {
  const supabase = createClient();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayISO = firstDay.toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastDayISO = lastDay.toISOString();

  // Busca todas as vendas do mês
  const { data: vendas, error } = await supabase
    .from("transactions")
    .select(`id, amount, sold_at, payment_method, company:company_id(name), operador:operator_id(full_name), passageiro, empresa_parceira, forma_pagamento`)
    .gte("sold_at", firstDayISO)
    .lte("sold_at", lastDayISO)
    .eq("status", "posted")
    .order("sold_at", { ascending: false });

  if (error) {
    throw new Error("Erro ao buscar vendas: " + error.message);
  }

  // Faturamento bruto
  const faturamento = vendas?.reduce((acc, v) => acc + Number(v.amount || 0), 0) || 0;
  const repasse = faturamento * 0.85;
  const lucro = faturamento * 0.15;

  // Últimas 10 operações
  const ultimas = (vendas || []).slice(0, 10).map((v) => [
    v.sold_at ? new Date(v.sold_at).toLocaleString("pt-BR") : "-",
    (typeof v.company === "object" && v.company && "name" in v.company ? v.company.name : undefined) || v.empresa_parceira || "-",
    v.passageiro || "-",
    (v.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    v.forma_pagamento || v.payment_method || "-",
    (typeof v.operador === "object" && v.operador && "full_name" in v.operador ? v.operador.full_name : undefined) || "-",
  ]);

  return {
    faturamento: faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    repasse: repasse.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    lucro: lucro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ultimasOperacoes: ultimas,
    totalVendas: vendas?.length || 0,
  };
}
