import { query } from '@/lib/postgres'
import { sendEmail } from '@/lib/gmail'

export interface HandleHumanHandoffInput {
  phone: string
  customerName: string
  reason?: string
}

export const handleHumanHandoff = async (input: HandleHumanHandoffInput): Promise<void> => {
  const { phone, customerName, reason } = input

  console.log(`[handleHumanHandoff] 📞 Transferring ${phone} to human agent`)

  try {
    // Atualizar status do cliente para 'human' (CRÍTICO - deve sempre funcionar)
    await query(
      'UPDATE "Clientes WhatsApp" SET status = $1 WHERE telefone = $2',
      ['Transferido', phone]
    )

    console.log(`[handleHumanHandoff] ✅ Customer status updated to 'Transferido'`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleHumanHandoff] ❌ Failed to update customer status: ${errorMessage}`)
    throw new Error(`Failed to update customer status: ${errorMessage}`)
  }

  // Tentar enviar email de notificação (OPCIONAL - não deve quebrar o handoff se falhar)
  try {
    const hasGmailConfig = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD

    if (!hasGmailConfig) {
      console.warn(`[handleHumanHandoff] ⚠️ Gmail not configured - skipping email notification`)
      console.warn(`[handleHumanHandoff] 💡 To enable email notifications, set GMAIL_USER and GMAIL_APP_PASSWORD`)
      return
    }

    const emailSubject = 'Novo Lead aguardando contato'
    const emailBody = `Novo lead aguardando atendimento no WhatsApp.

Nome: ${customerName}
Telefone: ${phone}
${reason ? `Motivo: ${reason}` : ''}

Por favor, entre em contato o mais breve possível.`

    await sendEmail(
      process.env.GMAIL_USER,
      emailSubject,
      emailBody.replace(/\n/g, '<br>')
    )

    console.log(`[handleHumanHandoff] ✅ Notification email sent to ${process.env.GMAIL_USER}`)
  } catch (emailError) {
    const emailErrorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
    console.error(`[handleHumanHandoff] ⚠️ Failed to send email notification: ${emailErrorMessage}`)
    console.warn(`[handleHumanHandoff] ℹ️ Handoff completed but email notification failed`)
    // NÃO lança erro - handoff deve continuar mesmo se email falhar
  }
}
