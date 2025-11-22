import { query } from '@/lib/postgres'
import { sendEmail } from '@/lib/gmail'
import { ClientConfig } from '@/lib/types'

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
    // Atualizar status do cliente para 'human' (CRÍTICO - deve sempre funcionar)
    await query(
      'UPDATE clientes_whatsapp SET status = $1 WHERE telefone = $2',
      ['Transferido', phone]
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleHumanHandoff] ❌ Failed to update customer status: ${errorMessage}`)
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
    const emailErrorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
    console.error(`[handleHumanHandoff] ⚠️ Failed to send email notification: ${emailErrorMessage}`)
    // NÃO lança erro - handoff deve continuar mesmo se email falhar
  }
}
