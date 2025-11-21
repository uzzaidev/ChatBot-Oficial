import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr'

const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  return url
}

const getSupabaseAnonKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }
  return key
}

const getSupabaseServiceRoleKey = (): string => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  return key
}

/**
 * createServerClient - Para API routes que precisam LER a sessão do usuário
 * Usa cookies para manter a autenticação do browser
 */
export const createServerClient = () => {
  // Import dinâmico para evitar erro em client components
  const { cookies } = require('next/headers')
  const cookieStore = cookies()

  return createSSRServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookies podem não ser settable em alguns contextos (middleware, etc)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  )
}

/**
 * createServiceRoleClient - Para operações administrativas SEM autenticação de usuário
 * Usa service role key (bypass RLS)
 */
// Singleton global do cliente Supabase (reutilizado em toda a execução)
let serviceRoleClientInstance: ReturnType<typeof createClient> | null = null

// Reset forçado da conexão (útil no início de cada workflow)
export const resetServiceRoleClient = () => {
  serviceRoleClientInstance = null
}

export const createServiceRoleClient = () => {
  // Reutiliza instância se já existe
  if (serviceRoleClientInstance) {
    return serviceRoleClientInstance
  }

  serviceRoleClientInstance = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-node',
        'Connection': 'keep-alive',
      },
      fetch: (url, options = {}) => {
        // Timeout de 15 segundos (mais do que suficiente para queries simples)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
          // @ts-ignore - keepalive não está na tipagem mas funciona
          keepalive: true,
        }).finally(() => clearTimeout(timeout))
      },
    },
  })

  return serviceRoleClientInstance
}

export const createClientBrowser = () => {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}
