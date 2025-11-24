/**
 * API Helper - Centraliza configuração de URLs de API
 *
 * PROBLEMA:
 * - Web: API routes funcionam (SSR/Serverless)
 * - Mobile (Capacitor): API routes NÃO funcionam (static export)
 *
 * SOLUÇÃO:
 * - Web: usa URL relativa ('/api/...')
 * - Mobile: usa URL absoluta de produção (NEXT_PUBLIC_API_URL)
 */

import { Capacitor } from '@capacitor/core'

/**
 * Retorna a base URL da API baseado na plataforma
 *
 * @returns '' (web) ou 'https://uzzapp.uzzai.com.br' (mobile)
 *
 * @example
 * ```typescript
 * import { getApiBaseUrl } from '@/lib/api'
 *
 * const baseUrl = getApiBaseUrl()
 * const response = await fetch(`${baseUrl}/api/conversations`)
 * ```
 */
export function getApiBaseUrl(): string {
  const isMobile = Capacitor.isNativePlatform()

  if (isMobile) {
    // Mobile: usa variável de ambiente (configurável)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    if (!apiUrl) {
      console.warn(
        '[API] NEXT_PUBLIC_API_URL não configurada! Mobile não conseguirá acessar APIs. ' +
        'Configure em .env.mobile'
      )
      // Fallback para produção
      return 'https://uzzapp.uzzai.com.br'
    }

    return apiUrl
  }

  // Web: usa URL relativa (localhost em dev, domínio em prod)
  return ''
}

/**
 * Helper para fazer fetch em API routes com suporte mobile
 *
 * @param endpoint - Endpoint da API (ex: '/api/conversations')
 * @param options - Opções do fetch
 * @returns Promise<Response>
 *
 * @example
 * ```typescript
 * import { apiFetch } from '@/lib/api'
 *
 * const response = await apiFetch('/api/conversations?limit=50')
 * const data = await response.json()
 * ```
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  // Mobile: adiciona credenciais para autenticação funcionar
  const fetchOptions: RequestInit = {
    ...options,
    credentials: Capacitor.isNativePlatform() ? 'include' : options?.credentials || 'same-origin',
  }

  return fetch(url, fetchOptions)
}

/**
 * Verifica se está rodando em mobile (Capacitor)
 */
export function isMobilePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Retorna informações da plataforma (útil para debug)
 */
export function getPlatformInfo() {
  return {
    isMobile: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(), // 'web', 'ios', 'android'
    apiBaseUrl: getApiBaseUrl(),
  }
}
