import { createServerClient } from '@/lib/supabase'

interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
}

export async function saveChatMessage(input: SaveChatMessageInput): Promise<void> {
  const { phone, message, type } = input

  try {
    const supabase = createServerClient()

    const record = {
      session_id: phone,
      type,
      message,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('n8n_chat_histories')
      .insert(record)

    if (error) {
      throw new Error(`Erro ao salvar mensagem no histórico: ${error.message}`)
    }

    // Atualizar a última mensagem do cliente na tabela Clientes WhatsApp
    const { error: updateError } = await supabase
      .from('Clientes WhatsApp')
      .update({
        ultima_mensagem: message,
        updated_at: new Date().toISOString()
      })
      .eq('telefone', phone)

    if (updateError) {
      // Log do erro mas não falha a operação principal
      console.error('Erro ao atualizar última mensagem do cliente:', updateError.message)
    }
  } catch (error) {
    throw new Error(
      `saveChatMessage falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}
