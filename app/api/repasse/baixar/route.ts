import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const company = formData.get("company");
  if (!company) return NextResponse.json({ error: "Empresa não informada" }, { status: 400 });

  const supabase = createClient();
  // Busca todas as transactions 'posted' da empresa
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("status", "posted")
    .eq("company_id.name", company);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (txs || []).map((t) => t.id);
  if (ids.length === 0) return NextResponse.json({ ok: true });

  // Atualiza status para 'settled'
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ status: "settled" })
    .in("id", ids);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
