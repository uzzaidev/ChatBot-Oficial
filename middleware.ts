import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware - Route Protection
 *
 * Protege rotas do dashboard e admin com autenticação
 *
 * Features:
 * - Verifica session válida via Supabase Auth
 * - Redireciona usuários não autenticados para /login
 * - Injeta client_id do usuário no header para API routes
 * - Refresh automático de session
 *
 * Routes protegidas:
 * - /dashboard/* - Requer autenticação
 * - /admin/* - Requer autenticação + role admin (futuro)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session (importante para manter usuário logado)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes: /dashboard/*
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Usuário não autenticado - redirecionar para login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Buscar user_profile para obter client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single()

    // Se profile não existe ou está inválido - redirecionar para login
    if (profileError || !profile || !profile.client_id) {
      console.error('[middleware] Profile não encontrado ou inválido:', user.id)
      console.error('  Error:', profileError?.message || 'Profile sem client_id')
      console.error('  → Redirecionando para /login')

      // Fazer logout (limpar cookies) antes de redirecionar
      await supabase.auth.signOut()

      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Injetar client_id no header para API routes poderem acessar
    response.headers.set('x-user-client-id', profile.client_id)
    response.headers.set('x-user-role', profile.role || 'user')

  }

  // Admin-only routes: /admin/*
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active, client_id')
      .eq('id', user.id)
      .single()

    // Verificar se tem role de admin e está ativo

    if (!profile || !['admin', 'client_admin'].includes(profile.role as string) || !profile.is_active) {
      // Não é admin ou está desativado - redirecionar para dashboard
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Injetar role e client_id nos headers para uso nas páginas admin
    response.headers.set('x-user-role', profile.role)
    response.headers.set('x-user-client-id', profile.client_id)
    response.headers.set('x-user-is-active', String(profile.is_active))

  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
