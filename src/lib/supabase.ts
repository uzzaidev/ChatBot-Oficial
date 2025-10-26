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

export const createServerClient = () => {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options = {}) => {
        // Timeout de 10 segundos para evitar hang infinito
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })
}

export const createClientBrowser = () => {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}
