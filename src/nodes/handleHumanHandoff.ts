import { query } from '@/lib/postgres'
import { sendEmail } from '@/lib/gmail'

export interface HandleHumanHandoffInput {
  phone: string
  customerName: string
  reason?: string
}

export const handleHumanHandoff = async (input: HandleHumanHandoffInput): Promise<void> => {
  try {
    const { phone, customerName, reason } = input

    console.log(`[handleHumanHandoff] 📞 Transferring ${phone} to human agent`)

    // Atualizar status do cliente para 'human'
    await query(
      'UPDATE "Clientes WhatsApp" SET status = $1 WHERE telefone = $2',
      ['Transferido', phone]
    )

    console.log(`[handleHumanHandoff] ✅ Customer status updated to 'Transferido'`)

    // Enviar email de notificação
    const emailSubject = 'Novo Lead aguardando contato'
    const emailBody = `Novo lead aguardando atendimento no WhatsApp.

Nome: ${customerName}
Telefone: ${phone}
${reason ? `Motivo: ${reason}` : ''}

Por favor, entre em contato o mais breve possível.`

    await sendEmail(
      process.env.GMAIL_USER || 'luisfboff@hotmail.com',
      emailSubject,
      emailBody.replace(/\n/g, '<br>')
    )

    console.log(`[handleHumanHandoff] ✅ Notification email sent`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[handleHumanHandoff] ❌ Error during handoff: ${errorMessage}`)
    throw new Error(`Failed to handle human handoff: ${errorMessage}`)
  }
}
