import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreateUserBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: "operator" | "financeiro" | "tenant_admin";
  active?: boolean;
  boothId?: string | null;
};

type DeleteUserBody = {
  userId?: string;
};

function envOrThrow(name: string, aliases: string[] = []) {
  const candidates = [name, ...aliases];

  for (const key of candidates) {
    const value = process.env[key];
    if (value) return value;
  }

  throw new Error(`Variável obrigatória ausente: ${candidates.join(" ou ")}`);
}

async function resolveRequester(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 }) };

  const url = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const anon = envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authUserData, error: authUserError } = await authClient.auth.getUser(token);
  if (authUserError || !authUserData.user) {
    return { error: NextResponse.json({ error: "Sessão inválida." }, { status: 401 }) };
  }

  const requesterId = authUserData.user.id;
  const { data: requesterProfile, error: requesterProfileError } = await authClient
    .from("profiles")
    .select("role,tenant_id")
    .eq("user_id", requesterId)
    .single();

  if (requesterProfileError || !requesterProfile) {
    return { error: NextResponse.json({ error: "Perfil do solicitante não encontrado." }, { status: 403 }) };
  }

  if (!["tenant_admin", "admin"].includes(String(requesterProfile.role))) {
    return { error: NextResponse.json({ error: "Sem permissão para gerenciar usuários." }, { status: 403 }) };
  }

  return { requesterProfile, requesterId };
}

export async function POST(req: Request) {
  try {
    const requester = await resolveRequester(req);
    if ("error" in requester) return requester.error;

    const body = (await req.json()) as CreateUserBody;
    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password?.trim() || "";
    const role = body.role || "operator";
    const active = body.active !== false;
    const boothId = body.boothId || null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }
    if (!email.includes("@")) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Senha precisa ter ao menos 6 caracteres." }, { status: 400 });

    const url = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = envOrThrow("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]);
    const { requesterProfile } = requester;

    const adminClient = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createAuthError || !createdAuth.user) {
      return NextResponse.json({ error: createAuthError?.message || "Falha ao criar usuário no Auth." }, { status: 400 });
    }

    const newUserId = createdAuth.user.id;
    const { error: profileError } = await adminClient.from("profiles").upsert({
      user_id: newUserId,
      full_name: name,
      role,
      active,
      tenant_id: requesterProfile.tenant_id || null,
    });

    if (profileError) {
      return NextResponse.json({ error: `Usuário criado no Auth, mas falhou ao salvar perfil: ${profileError.message}` }, { status: 400 });
    }

    if (boothId) {
      const { data: existingLink } = await adminClient
        .from("operator_booths")
        .select("id,active")
        .eq("operator_id", newUserId)
        .eq("booth_id", boothId)
        .maybeSingle();

      if (!existingLink) {
        const { error: linkError } = await adminClient.from("operator_booths").insert({
          operator_id: newUserId,
          booth_id: boothId,
          active: true,
        });
        if (linkError) {
          return NextResponse.json({ error: `Usuário criado, mas vínculo inicial falhou: ${linkError.message}` }, { status: 400 });
        }
      } else if (!existingLink.active) {
        const { error: reactivateError } = await adminClient.from("operator_booths").update({ active: true }).eq("id", existingLink.id);
        if (reactivateError) {
          return NextResponse.json({ error: `Usuário criado, mas vínculo não pôde ser reativado: ${reactivateError.message}` }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ ok: true, userId: newUserId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const requester = await resolveRequester(req);
    if ("error" in requester) return requester.error;

    const body = (await req.json()) as DeleteUserBody;
    const userId = body.userId?.trim();
    if (!userId) return NextResponse.json({ error: "userId é obrigatório." }, { status: 400 });
    if (userId === requester.requesterId) return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });

    const url = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = envOrThrow("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]);
    const adminClient = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [shiftsCount, txCount, punchesCount, cashCount] = await Promise.all([
      adminClient.from("shifts").select("id", { count: "exact", head: true }).eq("operator_id", userId),
      adminClient.from("transactions").select("id", { count: "exact", head: true }).eq("operator_id", userId),
      adminClient.from("time_punches").select("id", { count: "exact", head: true }).eq("user_id", userId),
      adminClient.from("cash_movements").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const hasHistory = [shiftsCount.count || 0, txCount.count || 0, punchesCount.count || 0, cashCount.count || 0].some((c) => c > 0);
    if (hasHistory) {
      return NextResponse.json({ error: "Usuário possui histórico operacional. Use Inativar em vez de excluir." }, { status: 409 });
    }

    const { error: linkError } = await adminClient.from("operator_booths").delete().eq("operator_id", userId);
    if (linkError) return NextResponse.json({ error: `Falha ao remover vínculos: ${linkError.message}` }, { status: 400 });

    const { error: profileError } = await adminClient.from("profiles").delete().eq("user_id", userId);
    if (profileError) return NextResponse.json({ error: `Falha ao remover perfil: ${profileError.message}` }, { status: 400 });

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) return NextResponse.json({ error: `Perfil removido, mas falhou ao remover auth user: ${authDeleteError.message}` }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
