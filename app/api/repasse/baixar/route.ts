import { createClient } from "@/lib/supabase/server";
import { canAccessAdminArea } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const company = String(formData.get("company") ?? "").trim();
  if (!company) return NextResponse.json({ error: "Empresa não informada" }, { status: 400 });

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("user_id", authData.user.id)
    .single();

  const role = (profile as { role?: string; active?: boolean } | null)?.role ?? "";
  const isActive = (profile as { role?: string; active?: boolean } | null)?.active !== false;

  if (profileError || !profile || !isActive || !canAccessAdminArea(role)) {
    return NextResponse.json({ error: "Sem permissao para baixar repasse." }, { status: 403 });
  }

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("status", "posted")
    .eq("company_id.name", company);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (txs || []).map((t) => t.id);
  if (ids.length === 0) return NextResponse.json({ ok: true });

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ status: "settled" })
    .in("id", ids);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
