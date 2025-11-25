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

import { Capacitor } from "@capacitor/core";

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
  const isMobile = Capacitor.isNativePlatform();

  if (isMobile) {
    // Mobile: usa variável de ambiente (configurável)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      console.warn(
        "[API] NEXT_PUBLIC_API_URL não configurada! Mobile não conseguirá acessar APIs. " +
          "Configure em .env.mobile",
      );
      // Fallback para produção
      return "https://uzzapp.uzzai.com.br";
    }

    return apiUrl;
  }

  // Web: usa URL relativa (localhost em dev, domínio em prod)
  return "";
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
  options?: RequestInit,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  console.log("[API] apiFetch chamado:", endpoint);
  console.log("[API] isMobile:", Capacitor.isNativePlatform());
  console.log("[API] baseUrl:", baseUrl);

  // Mobile: pegar token de autenticação e incluir no header
  let headers = { ...options?.headers } as Record<string, string>;

  if (Capacitor.isNativePlatform()) {
    console.log("[API] Mobile detectado - buscando token...");

    try {
      // Importar dinamicamente para evitar erro no servidor
      const { createBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      console.log("[API] Sessão:", session ? "EXISTE" : "NÃO EXISTE");

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
        console.log("[API] Token adicionado ao header");
      } else {
        console.warn(
          "[API] ❌ Nenhuma sessão ativa no mobile - requisição sem autenticação",
        );
      }
    } catch (error) {
      console.error("[API] ❌ Erro ao buscar sessão:", error);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: Capacitor.isNativePlatform()
      ? "omit"
      : options?.credentials || "same-origin",
  };

  console.log("[API] Fazendo requisição para:", url);
  console.log("[API] Headers:", headers);

  return fetch(url, fetchOptions);
}

/**
 * Verifica se está rodando em mobile (Capacitor)
 */
export function isMobilePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Retorna informações da plataforma (útil para debug)
 */
export function getPlatformInfo() {
  return {
    isMobile: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(), // 'web', 'ios', 'android'
    apiBaseUrl: getApiBaseUrl(),
  };
}

/**
 * Marca uma conversa como lida (atualiza last_read_at no Supabase)
 *
 * @param phone - Número de telefone da conversa
 * @returns Promise<{ success: boolean, error?: string }>
 *
 * @example
 * ```typescript
 * import { markConversationAsRead } from '@/lib/api'
 *
 * await markConversationAsRead('5511999999999')
 * ```
 */
export async function markConversationAsRead(
  phone: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("👁️ [markConversationAsRead] Marking as read:", phone);

    const response = await apiFetch("/api/conversations/mark-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [markConversationAsRead] Error:", data.error);
      return { success: false, error: data.error };
    }

    console.log("✅ [markConversationAsRead] Success:", data);
    return { success: true };
  } catch (error) {
    console.error("❌ [markConversationAsRead] Exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
