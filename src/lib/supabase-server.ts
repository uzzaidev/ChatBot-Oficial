/**
 * Supabase Client - Server-Side (Next.js App Router)
 *
 * Usado em:
 * - Server Components
 * - API Routes
 * - Server Actions
 *
 * Features:
 * - Cookie-based authentication
 * - Automatic session refresh
 * - Type-safe with Database types
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

/**
 * Cria cliente Supabase para Server Components
 *
 * IMPORTANTE: Só funciona em Server Components, não em Client Components
 *
 * @returns Supabase client com autenticação via cookies
 *
 * @example
 * // Em um Server Component
 * const supabase = await createServerClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export const createServerClient = async () => {
  // Verificar variáveis de ambiente antes de criar o cliente
  // Isso evita erros confusos durante o build quando .env.local não existe
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. ' +
      'Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'no arquivo .env.local'
    )
  }

  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignora erro em Server Components (cookies são read-only)
            // Cookies são setados corretamente em Route Handlers
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignora erro em Server Components
          }
        },
      },
    }
  )
}

/**
 * Cria cliente Supabase com SERVICE ROLE (bypass RLS)
 *
 * IMPORTANTE: Use APENAS para operações admin/system que precisam bypass RLS
 *
 * @returns Supabase client com service role key (acesso total, ignora RLS)
 *
 * @example
 * // Em API Routes admin
 * const supabase = createServiceClient()
 * const { data } = await supabase.from('usage_logs').select('*') // Bypass RLS
 */
export const createServiceClient = () => {
  // Verificar variáveis de ambiente antes de criar o cliente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. ' +
      'Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ' +
      'no arquivo .env.local'
    )
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey
  )
}

/**
 * Cria cliente Supabase para API Routes (Route Handlers)
 *
 * IMPORTANTE: Só funciona em Route Handlers (app/api/[path]/route.ts)
 *
 * @returns Supabase client com autenticação via cookies
 *
 * @example
 * // Em app/api/example/route.ts
 * export async function GET(request: NextRequest) {
 *   const supabase = await createRouteHandlerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   return NextResponse.json({ user })
 * }
 */
export const createRouteHandlerClient = async (request?: Request) => {
  // Verificar variáveis de ambiente antes de criar o cliente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. ' +
      'Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'no arquivo .env.local'
    )
  }

  // Check for Bearer token first (mobile)
  const bearerToken = getBearerToken(request)

  if (bearerToken) {
    // Mobile: use standard client with Bearer token
    return createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`
          }
        }
      }
    )
  }

  // Web: use cookie-based client
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * Helper: Obtém usuário autenticado ou retorna null
 *
 * @returns User object ou null se não autenticado
 *
 * @example
 * const user = await getCurrentUser()
 * if (!user) {
 *   redirect('/login')
 * }
 */
export const getCurrentUser = async () => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Helper: Obtém client_id do usuário autenticado
 *
 * Busca o client_id do user_profile linkado ao usuário
 * Se profile não existir, tenta criar automaticamente (fallback para trigger falho)
 *
 * @returns client_id (UUID) ou null se não autenticado
 *
 * @example
 * const clientId = await getClientIdFromSession()
 * if (!clientId) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 */
/**
 * Extrai token Bearer do header Authorization
 */
function getBearerToken(request?: Request): string | null {
  if (!request) return null

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  return authHeader.substring(7)
}

export const getClientIdFromSession = async (request?: Request): Promise<string | null> => {
  // Verificar variáveis de ambiente antes de criar o cliente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. ' +
      'Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'no arquivo .env.local'
    )
  }

  // Tentar usar Bearer token primeiro (mobile)
  const bearerToken = getBearerToken(request)

  let supabase
  if (bearerToken) {
    // Mobile: criar client padrão com Bearer token
    supabase = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`
          }
        }
      }
    )
  } else {
    // Web: usar cookies (padrão)
    supabase = await createServerClient()
  }

  // 1. Obter usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 2. Buscar user_profile para pegar client_id
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  // 3. Se profile existe, retornar client_id
  if (profile && profile.client_id) {
    return profile.client_id
  }

  // 4. FALLBACK: Se profile não existe, tentar criar automaticamente
  // Isso pode acontecer se o trigger handle_new_user() falhou

  // Verificar se user_metadata tem client_id
  const metadataClientId = user.user_metadata?.client_id

  if (!metadataClientId) {
    return null
  }

  // Tentar criar profile manualmente
  const { data: newProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      client_id: metadataClientId,
      email: user.email!,
      full_name: user.user_metadata?.full_name || null,
    })
    .select('client_id')
    .single()

  if (createError || !newProfile) {
    return null
  }

  return newProfile.client_id
}

/**
 * Helper: Verifica se usuário está autenticado (throw redirect se não)
 *
 * @throws Redirect para /login se não autenticado
 *
 * @example
 * // Em um Server Component
 * await requireAuth()
 * // Se chegou aqui, usuário está autenticado
 */
export const requireAuth = async () => {
  const { redirect } = await import('next/navigation')
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Helper: Obtém configuração do cliente atual (autenticado)
 *
 * Substitui getClientConfigWithFallback() após implementar autenticação
 *
 * @returns ClientConfig ou null
 *
 * @example
 * const config = await getClientConfigFromAuth()
 * if (!config) {
 *   return NextResponse.json({ error: 'Client not found' }, { status: 404 })
 * }
 */
export const getClientConfigFromAuth = async () => {
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    return null
  }

  const { getClientConfig } = await import('./config')
  return getClientConfig(clientId)
}
