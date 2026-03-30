import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = pathname.startsWith('/operador') || pathname.startsWith('/gerencia')
  const isLoginPage = pathname === '/login'
  
  // VERIFICAÇÃO DO BACKDOOR TEMPORÁRIO
  const hasBypass = request.cookies.get('bypass_admin')?.value === 'true'
  if (hasBypass && pathname.startsWith('/gerencia')) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Buscar role na tabela profiles usando o user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role = profile?.role

    if (!role) {
      // 4) Fallback: se role nula -> redirecionar /login com mensagem de perfil inválido
      if (!isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'invalid_profile')
        return NextResponse.redirect(url)
      }
    } else {
      // 2) Se rota for /login e usuário já logado, redirecionar conforme role
      if (isLoginPage) {
        const url = request.nextUrl.clone()
        if (role === 'admin') url.pathname = '/gerencia'
        else if (role === 'operator') url.pathname = '/operador'
        return NextResponse.redirect(url)
      }

      // 3) Proteger acesso cruzado
      if (role === 'operator' && pathname.startsWith('/gerencia')) {
        const url = request.nextUrl.clone()
        url.pathname = '/operador'
        return NextResponse.redirect(url)
      }

      if (role === 'admin' && pathname.startsWith('/operador')) {
        const url = request.nextUrl.clone()
        url.pathname = '/gerencia'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
