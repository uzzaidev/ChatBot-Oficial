import { createServiceRoleClient } from '@/lib/supabase'

/**
 * Verifica se um contato está marcado como "silenciado" — i.e. com
 * `metadata.save_history === false` em `clientes_whatsapp`.
 *
 * Quando true, o chatbotFlow deve:
 *  - pausar o bot (não responder)
 *  - não persistir mensagens (n8n_chat_histories e messages)
 *
 * Fail-safe: em caso de erro, retorna false (mantém comportamento padrão).
 */
export const isContactSilenced = async (
  clientId: string,
  phone: string
): Promise<boolean> => {
  if (!clientId || !phone) return false

  try {
    const supabase = createServiceRoleClient()
    const supabaseAny = supabase as any

    const cleanPhone = String(phone).replace(/\D/g, '')

    const { data, error } = await supabaseAny
      .from('clientes_whatsapp')
      .select('metadata')
      .eq('client_id', clientId)
      .eq('telefone', cleanPhone)
      .maybeSingle()

    if (error || !data) return false

    const metadata = data.metadata as Record<string, unknown> | null
    if (!metadata || typeof metadata !== 'object') return false

    return metadata.save_history === false
  } catch {
    return false
  }
}
