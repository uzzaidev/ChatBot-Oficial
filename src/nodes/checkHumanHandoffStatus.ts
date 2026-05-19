import { createServiceRoleClient } from '@/lib/supabase'

export interface CheckHumanHandoffInput {
  phone: string
  clientId: string
}

export interface CheckHumanHandoffOutput {
  skipBot: boolean
  /**
   * Quando true, além de pular o bot, o flow deve evitar persistir
   * mensagens (contato silenciado via `metadata.save_history === false`).
   */
  skipSave?: boolean
  customerStatus: string
  reason?: string
}

/**
 * NODE 3: Check Human Handoff Status
 *
 * Verifica se a conversa está em atendimento humano.
 * Se sim, para o processamento do bot.
 *
 * Estados:
 * - 'bot': Atendimento automático (continua fluxo)
 * - 'humano': Atendimento humano ativo (para fluxo)
 * - 'transferido': Transferido para humano (para fluxo)
 */
export const checkHumanHandoffStatus = async (
  input: CheckHumanHandoffInput
): Promise<CheckHumanHandoffOutput> => {
  const { phone, clientId } = input

  try {
    // 🔐 SECURITY: Use service role client to bypass RLS
    // This is SAFE because:
    // 1. Query filters by client_id (tenant isolation maintained)
    // 2. Only reads status field (no sensitive data exposure)
    // 3. Node is called from authenticated chatbot flow with validated clientId
    const supabase = createServiceRoleClient()

    // Cast to 'any' to bypass TypeScript type checking (table not in generated types yet)
    const supabaseAny = supabase as any

    // Buscar status do cliente - FILTERED BY client_id for tenant isolation
    const { data: customer, error } = await supabaseAny
      .from('clientes_whatsapp')
      .select('status, metadata')
      .eq('telefone', phone)
      .eq('client_id', clientId) // 🔐 CRITICAL: Tenant isolation filter
      .single()

    if (error || !customer) {
      // Se cliente não existe, será criado depois com status 'bot'
      return {
        skipBot: false,
        customerStatus: 'bot',
        reason: error ? `Erro ao buscar cliente: ${error.message}` : 'Cliente não existe ainda'
      }
    }

    const status = customer.status
    const statusLower = status?.toLowerCase() || ''
    const metadata = (customer.metadata && typeof customer.metadata === 'object'
      ? customer.metadata
      : null) as Record<string, unknown> | null
    const silenced = metadata?.save_history === false

    if (silenced) {
      return {
        skipBot: true,
        skipSave: true,
        customerStatus: status,
        reason: 'Contato silenciado: bot pausado e mensagens não persistidas'
      }
    }

    // Se está em atendimento humano, para o bot
    // Usar case-insensitive comparison para evitar bugs de capitalização
    if (statusLower === 'humano' || statusLower === 'transferido') {
      return {
        skipBot: true,
        customerStatus: status,
        reason: `Conversa em atendimento ${statusLower === 'humano' ? 'humano ativo' : 'aguardando humano'}`
      }
    }

    // Continua fluxo normal
    return {
      skipBot: false,
      customerStatus: status
    }
  } catch (error) {
    // Em caso de erro, continua com bot (fail-safe)
    return {
      skipBot: false,
      customerStatus: 'bot',
      reason: 'Erro ao verificar status, continuando com bot'
    }
  }
}
