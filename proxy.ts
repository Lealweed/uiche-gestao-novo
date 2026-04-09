import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdminArea, canManageUsers, getHomeRouteForRole, normalizeRole } from "@/lib/rbac";

const LOGIN_PATH = "/login";
const API_ADMIN_USERS = "/api/admin/users";
const API_REPASSE_BAIXAR = "/api/repasse/baixar";
const API_ATTENDANCE_CHECKOUT = "/api/attendance/checkout";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

function redirectTo(request: NextRequest, baseResponse: NextResponse, pathname: string) {
  const url = new URL(pathname, request.url);
  return copyCookies(baseResponse, NextResponse.redirect(url));
}

function jsonError(baseResponse: NextResponse, message: string, status: number) {
  return copyCookies(baseResponse, NextResponse.json({ error: message }, { status }));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return isApiRequest
      ? jsonError(supabaseResponse, "Sessao invalida.", 401)
      : redirectTo(request, supabaseResponse, LOGIN_PATH);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = normalizeRole((profile as { role?: string } | null)?.role);
  const isActive = (profile as { active?: boolean } | null)?.active !== false;

  if (profileError || !profile) {
    return isApiRequest
      ? jsonError(supabaseResponse, "Perfil nao encontrado.", 403)
      : redirectTo(request, supabaseResponse, LOGIN_PATH);
  }

  if (!isActive) {
    return isApiRequest
      ? jsonError(supabaseResponse, "Acesso inativo.", 403)
      : redirectTo(request, supabaseResponse, LOGIN_PATH);
  }

  if (pathname.startsWith("/rebuild/admin") && !canAccessAdminArea(role)) {
    return redirectTo(request, supabaseResponse, getHomeRouteForRole(role) ?? LOGIN_PATH);
  }

  if (pathname.startsWith("/rebuild/operator") && role !== "operator") {
    return redirectTo(request, supabaseResponse, getHomeRouteForRole(role) ?? LOGIN_PATH);
  }

  if (pathname === API_ADMIN_USERS && !canManageUsers(role)) {
    return jsonError(supabaseResponse, "Sem permissao para gerenciar usuarios.", 403);
  }

  if (pathname === API_REPASSE_BAIXAR && !canAccessAdminArea(role)) {
    return jsonError(supabaseResponse, "Sem permissao para baixar repasse.", 403);
  }

  if (pathname === API_ATTENDANCE_CHECKOUT && role !== "operator") {
    return jsonError(supabaseResponse, "Sem permissao para encerrar ponto.", 403);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/rebuild/admin/:path*",
    "/rebuild/operator/:path*",
    "/api/admin/users",
    "/api/repasse/baixar",
    "/api/attendance/checkout",
  ],
};
