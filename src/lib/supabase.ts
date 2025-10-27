import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

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

// Singleton global do cliente Supabase (reutilizado em toda a execução)
let serverClientInstance: ReturnType<typeof createClient> | null = null

// Reset forçado da conexão (útil no início de cada workflow)
export const resetServerClient = () => {
  console.log('[Supabase] 🔄 Reset forçado do cliente')
  serverClientInstance = null
}

export const createServerClient = () => {
  // Reutiliza instância se já existe
  if (serverClientInstance) {
    console.log('[Supabase] ♻️ Reutilizando cliente existente')
    return serverClientInstance
  }

  console.log('[Supabase] 🆕 Criando novo cliente')
  serverClientInstance = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
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

  return serverClientInstance
}

export const createClientBrowser = () => {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}
