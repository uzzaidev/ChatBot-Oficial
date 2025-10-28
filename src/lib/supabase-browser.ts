/**
 * Supabase Client - Browser-Side (Next.js App Router)
 *
 * Usado em:
 * - Client Components ('use client')
 * - Frontend interativo (login, logout, signup)
 *
 * Features:
 * - Cookie-based authentication
 * - Automatic session refresh
 * - Type-safe with Database types
 */

'use client'

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Cria cliente Supabase para Client Components
 *
 * IMPORTANTE: Só funciona em Client Components ('use client')
 *
 * @returns Supabase client com autenticação via cookies
 *
 * @example
 * 'use client'
 *
 * import { createBrowserClient } from '@/lib/supabase-browser'
 *
 * const supabase = createBrowserClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export const createBrowserClient = () => {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Helper: Login com email e senha
 *
 * @param email Email do usuário
 * @param password Senha do usuário
 * @returns Session ou error
 *
 * @example
 * const { data, error } = await signInWithEmail('user@example.com', 'password')
 * if (error) {
 *   console.error('Login failed:', error.message)
 * } else {
 *   console.log('Logged in:', data.user.email)
 * }
 */
export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createBrowserClient()
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Helper: Logout
 *
 * @example
 * await signOut()
 * router.push('/login')
 */
export const signOut = async () => {
  const supabase = createBrowserClient()
  return supabase.auth.signOut()
}

/**
 * Helper: Signup (criar nova conta)
 *
 * IMPORTANTE: user_metadata deve incluir client_id para trigger funcionar
 *
 * @param email Email do novo usuário
 * @param password Senha do novo usuário
 * @param clientId ID do cliente (UUID)
 * @param fullName Nome completo (opcional)
 * @returns User ou error
 *
 * @example
 * const { data, error } = await signUp(
 *   'newuser@example.com',
 *   'securepassword',
 *   'b21b314f-c49a-467d-94b3-a21ed4412227',
 *   'John Doe'
 * )
 */
export const signUp = async (
  email: string,
  password: string,
  clientId: string,
  fullName?: string
) => {
  const supabase = createBrowserClient()

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        client_id: clientId,
        full_name: fullName,
      },
    },
  })
}

/**
 * Helper: Obtém usuário atual (client-side)
 *
 * @returns User ou null
 *
 * @example
 * const user = await getCurrentUser()
 * if (!user) {
 *   router.push('/login')
 * }
 */
export const getCurrentUser = async () => {
  const supabase = createBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Helper: Subscribe to auth state changes
 *
 * @param callback Função chamada quando auth state muda
 * @returns Unsubscribe function
 *
 * @example
 * useEffect(() => {
 *   const unsubscribe = onAuthStateChange((event, session) => {
 *     if (event === 'SIGNED_IN') {
 *       console.log('User signed in:', session?.user.email)
 *     }
 *     if (event === 'SIGNED_OUT') {
 *       console.log('User signed out')
 *     }
 *   })
 *
 *   return () => unsubscribe()
 * }, [])
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  const supabase = createBrowserClient()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)

  return () => subscription.unsubscribe()
}
