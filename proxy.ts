import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy - Route Protection (Next.js 16)
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
export async function proxy(request: NextRequest) {
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

  let profile: { client_id: string | null; role: string | null; is_active: boolean | null } | null = null

  // Protected routes: /dashboard/*
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const { data: loadedProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role, is_active')
      .eq('id', user.id)
      .single()

    profile = loadedProfile as any

    if (profileError || !profile || !profile.is_active) {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Apenas admins podem operar sem client_id.
    if (!profile.client_id && profile.role !== 'admin') {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    response.headers.set('x-user-role', profile.role || 'user')
    response.headers.set('x-user-client-id', profile.client_id || '')
    response.headers.set('x-user-is-active', String(profile.is_active))
  }

  // /dashboard/admin => somente admin
  if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    if (!profile?.role || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // /dashboard/payments => admin ou client_admin
  if (request.nextUrl.pathname.startsWith('/dashboard/payments')) {
    if (!profile?.role || !['admin', 'client_admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Legacy /admin route guard (caso exista rota antiga fora de /dashboard)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!profile) {
      const { data: fallbackProfile } = await supabase
        .from('user_profiles')
        .select('role, is_active, client_id')
        .eq('id', user.id)
        .single()
      profile = fallbackProfile as any
    }

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
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
     * - register (register page)
     * - components-showcase (components showcase page - pública)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|components-showcase).*)',
  ],
}
