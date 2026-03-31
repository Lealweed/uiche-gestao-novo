import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const rawCompany = formData.get("company");
  const company = typeof rawCompany === "string" ? rawCompany.trim() : "";
  if (!company) return NextResponse.json({ error: "Empresa não informada" }, { status: 400 });

  const supabase = createClient();

  let companyId = company;
  if (!isUuidLike(company)) {
    const { data: companyRow, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("name", company)
      .maybeSingle();

    if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });
    if (!companyRow?.id) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    companyId = companyRow.id;
  }

  // Busca todas as transactions 'posted' da empresa
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("status", "posted")
    .eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (txs || []).map((t) => t.id);
  if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  // Atualiza status para 'settled'
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ status: "settled" })
    .in("id", ids);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: ids.length });
}
