import { createServerClient } from '@/lib/supabase-server'

export interface CheckHumanHandoffInput {
  phone: string
  clientId: string
}

export interface CheckHumanHandoffOutput {
  skipBot: boolean
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
    const supabase = createServerClient()

    // Buscar status do cliente
    const { data: customer, error } = await supabase
      .from('clientes_whatsapp')
      .select('status')
      .eq('telefone', phone)
      .eq('client_id', clientId)
      .single()

    if (error || !customer) {
      // Se cliente não existe, será criado depois com status 'bot'
      return {
        skipBot: false,
        customerStatus: 'bot'
      }
    }

    const status = customer.status

    // Se está em atendimento humano, para o bot
    if (status === 'humano' || status === 'transferido') {
      return {
        skipBot: true,
        customerStatus: status,
        reason: `Conversa em atendimento ${status === 'humano' ? 'humano ativo' : 'aguardando humano'}`
      }
    }

    // Continua fluxo normal
    return {
      skipBot: false,
      customerStatus: status
    }
  } catch (error) {
    console.error('[checkHumanHandoffStatus] Erro:', error)
    // Em caso de erro, continua com bot (fail-safe)
    return {
      skipBot: false,
      customerStatus: 'bot',
      reason: 'Erro ao verificar status, continuando com bot'
    }
  }
}
