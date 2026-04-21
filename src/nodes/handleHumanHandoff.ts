import { query } from '@/lib/postgres'
import { sendEmail } from '@/lib/gmail'
import { ClientConfig } from '@/lib/types'
import { createServiceRoleClient } from '@/lib/supabase'
import { sendHumanHandoffNotification } from '@/lib/push-dispatch'

export interface HandleHumanHandoffInput {
  phone: string
  customerName: string
  config: ClientConfig // 🔐 Config dinâmica do cliente
  reason?: string
}

/**
 * 🔐 Transfere atendimento para humano usando config dinâmica do cliente
 *
 * Usa notificationEmail do config do cliente
 */
export const handleHumanHandoff = async (input: HandleHumanHandoffInput): Promise<void> => {
  const { phone, customerName, config, reason } = input


  try {
    // Atualizar status do cliente para 'transferido' (CRÍTICO - deve sempre funcionar)
    const updateResult = await query(
      'UPDATE clientes_whatsapp SET status = $1 WHERE telefone = $2 AND client_id = $3',
      ['transferido', phone, config.id]
    )

    if ((updateResult.rowCount ?? 0) === 0) {
      throw new Error('Customer not found for tenant during human handoff')
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to update customer status: ${errorMessage}`)
  }

  // Tentar enviar email de notificação (OPCIONAL - não deve quebrar o handoff se falhar)
  try {
    // Usar notificationEmail do config do cliente (ou fallback para env)
    const notificationEmail = config.notificationEmail || process.env.GMAIL_USER
    const hasGmailConfig = notificationEmail && process.env.GMAIL_APP_PASSWORD

    if (!hasGmailConfig) {
      return
    }

    const emailSubject = 'Novo Lead aguardando contato'
    const emailBody = `Novo lead aguardando atendimento no WhatsApp.

Nome: ${customerName}
Telefone: ${phone}
${reason ? `Motivo: ${reason}` : ''}

Por favor, entre em contato o mais breve possível.`

    await sendEmail(
      notificationEmail, // 🔐 Usa email do config do cliente
      emailSubject,
      emailBody.replace(/\n/g, '<br>')
    )

  } catch (emailError) {
    // NÃO lança erro - handoff deve continuar mesmo se email falhar
  }

  // Tentar enviar push crítico para usuários ativos do cliente
  // (não pode quebrar o handoff se falhar)
  try {
    const supabase = createServiceRoleClient() as any

    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('client_id', config.id)
      .eq('is_active', true)

    if (usersError) {
      console.warn('[handoff-push] Failed to fetch active users', usersError)
      return
    }

    if (users && users.length > 0) {
      const userIds = users.map((user: { id: string }) => user.id)
      await sendHumanHandoffNotification(userIds, phone, customerName, config.id)
    }
  } catch (pushError) {
    console.warn('[handoff-push] Failed to send handoff push notification', pushError)
  }
}
