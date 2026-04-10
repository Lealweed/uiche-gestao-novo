import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

import { createClient as createServerClient } from "@/lib/supabase/server";

const RATE_LIMIT = { limit: 30, windowSeconds: 60 };

type CheckoutBody = {
  user_id?: string;
};

function envOrThrow(name: string, aliases: string[] = []) {
  const candidates = [name, ...aliases];

  for (const key of candidates) {
    const value = process.env[key];
    if (value) return value;
  }

  throw new Error(`Variável obrigatória ausente: ${candidates.join(" ou ")}`);
}

async function parseCheckoutBody(req: Request): Promise<CheckoutBody> {
  const raw = await req.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw) as CheckoutBody;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(rateLimitKey(req, "attendance-checkout"), RATE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Muitas requisicoes." }, { status: 429 });

    const payload = await parseCheckoutBody(req);
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
    }

    const url = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = envOrThrow("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]);
    const adminClient = createAdminClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await adminClient
      .from("user_attendance")
      .update({ clock_out: now.toISOString() })
      .eq("user_id", user.id)
      .is("clock_out", null)
      .gte("clock_in", today.toISOString())
      .lt("clock_in", tomorrow.toISOString())
      .select("id");

    if (error) {
      return NextResponse.json({ error: `Falha ao encerrar o ponto: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, closedCount: data?.length ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado ao encerrar o ponto." },
      { status: 500 },
    );
  }
}
