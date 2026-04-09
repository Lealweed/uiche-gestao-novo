import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canAccessAdminArea, canManageUsers, type AppRole } from "@/lib/rbac";
import { isSchemaToleranceError } from "@/lib/schema-tolerance";

type CreateUserBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: AppRole;
  active?: boolean;
  boothId?: string | null;
};

type DeleteUserBody = {
  userId?: string;
};

type ListUserRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  active: boolean;
};

function envOrThrow(name: string, aliases: string[] = []) {
  const candidates = [name, ...aliases];

  for (const key of candidates) {
    const value = process.env[key];
    if (value) return value;
  }

  throw new Error(`Variável obrigatória ausente: ${candidates.join(" ou ")}`);
}

async function resolveRequester(req: Request, access: "read" | "manage" = "manage") {
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

  let requesterProfile: { role?: string | null; tenant_id?: string | null } | null = null;
  let requesterProfileError: { message?: string; code?: string } | null = null;

  const requesterWithTenant = await authClient
    .from("profiles")
    .select("role,tenant_id")
    .eq("user_id", requesterId)
    .maybeSingle();

  requesterProfile = requesterWithTenant.data;
  requesterProfileError = requesterWithTenant.error;

  if (requesterProfileError && isSchemaToleranceError(requesterProfileError)) {
    const fallbackRequester = await authClient
      .from("profiles")
      .select("role")
      .eq("user_id", requesterId)
      .maybeSingle();

    requesterProfile = fallbackRequester.data ? { ...fallbackRequester.data, tenant_id: null } : null;
    requesterProfileError = fallbackRequester.error;
  }

  if (requesterProfileError || !requesterProfile) {
    return { error: NextResponse.json({ error: "Perfil do solicitante não encontrado." }, { status: 403 }) };
  }

  const requesterRole = String(requesterProfile.role);

  if (access === "manage") {
    if (!canManageUsers(requesterRole)) {
      return { error: NextResponse.json({ error: "Sem permissão para gerenciar usuários." }, { status: 403 }) };
    }
  } else if (!canAccessAdminArea(requesterRole)) {
    return { error: NextResponse.json({ error: "Sem permissão para acessar os dados administrativos." }, { status: 403 }) };
  }

  return { requesterProfile, requesterId };
}

export async function GET(req: Request) {
  try {
    const requester = await resolveRequester(req, "read");
    if ("error" in requester) return requester.error;

    const url = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = envOrThrow("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]);
    const adminClient = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const isRootAdmin = String(requester.requesterProfile.role) === "admin";
    const requesterTenantId = requester.requesterProfile.tenant_id ?? null;

    let profilesQuery = adminClient
      .from("profiles")
      .select("user_id,full_name,cpf,address,phone,avatar_url,role,active,tenant_id");

    if (!isRootAdmin && requesterTenantId) {
      profilesQuery = profilesQuery.eq("tenant_id", requesterTenantId);
    }

    let { data: profileRows, error: profileError } = await profilesQuery.order("full_name");

    if (profileError && isSchemaToleranceError(profileError)) {
      let fallbackProfilesQuery = adminClient
        .from("profiles")
        .select("user_id,full_name,cpf,address,phone,avatar_url,role,active");

      if (!isRootAdmin && requesterTenantId) {
        fallbackProfilesQuery = fallbackProfilesQuery.eq("user_id", requester.requesterId);
      }

      const fallbackProfiles = await fallbackProfilesQuery.order("full_name");
      profileRows = (fallbackProfiles.data ?? []).map((row) => ({ ...row, tenant_id: requesterTenantId }));
      profileError = fallbackProfiles.error;
    }

    if (profileError) {
      return NextResponse.json({ error: `Falha ao carregar perfis: ${profileError.message}` }, { status: 400 });
    }

    const { data: authListData, error: authListError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) {
      return NextResponse.json({ error: `Falha ao listar usuários do Auth: ${authListError.message}` }, { status: 400 });
    }

    const authUsers = ((authListData?.users ?? []) as Array<{
      id: string;
      email?: string | null;
      user_metadata?: { full_name?: string; avatar_url?: string } | null;
    }>);
    const authById = new Map(authUsers.map((user) => [user.id, user]));

    const profileUsers: ListUserRow[] = (((profileRows ?? []) as Array<{
      user_id: string;
      full_name: string;
      cpf: string | null;
      address: string | null;
      phone: string | null;
      avatar_url: string | null;
      role: AppRole;
      active: boolean;
    }>)).map((profile) => {
      const authUser = authById.get(profile.user_id);
      return {
        user_id: profile.user_id,
        full_name: profile.full_name?.trim() || authUser?.user_metadata?.full_name?.trim() || authUser?.email || profile.user_id,
        email: authUser?.email ?? null,
        cpf: profile.cpf ?? null,
        address: profile.address ?? null,
        phone: profile.phone ?? null,
        avatar_url: profile.avatar_url ?? authUser?.user_metadata?.avatar_url ?? null,
        role: profile.role,
        active: profile.active,
      };
    });

    const profileIds = new Set(profileUsers.map((profile) => profile.user_id));
    const authOnlyUsers: ListUserRow[] = isRootAdmin
      ? authUsers
          .filter((user) => !profileIds.has(user.id))
          .map((user) => ({
            user_id: user.id,
            full_name: user.user_metadata?.full_name?.trim() || user.email || user.id,
            email: user.email ?? null,
            cpf: null,
            address: null,
            phone: null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            role: "operator",
            active: true,
          }))
      : [];

    const users = [...profileUsers, ...authOnlyUsers].sort(
      (a, b) => Number(b.active) - Number(a.active) || a.full_name.localeCompare(b.full_name, "pt-BR"),
    );

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
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
    const profilePayload = {
      user_id: newUserId,
      full_name: name,
      role,
      active,
      tenant_id: requesterProfile.tenant_id || null,
    };

    let { error: profileError } = await adminClient.from("profiles").upsert(profilePayload);

    if (profileError && isSchemaToleranceError(profileError)) {
      const fallbackProfile = await adminClient.from("profiles").upsert({
        user_id: newUserId,
        full_name: name,
        role,
        active,
      });
      profileError = fallbackProfile.error;
    }

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
