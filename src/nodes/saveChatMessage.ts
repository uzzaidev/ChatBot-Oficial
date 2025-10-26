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

    // O n8n_chat_histories salva no formato LangChain:
    // { "type": "human" | "ai", "content": "...", "additional_kwargs": {}, "response_metadata": {} }
    const messageJson = {
      type: type === 'user' ? 'human' : 'ai',  // Converter 'user' → 'human'
      content: message,
      additional_kwargs: {},
      response_metadata: {}
    }

    const record = {
      session_id: phone,
      message: JSON.stringify(messageJson),
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('n8n_chat_histories')
      .insert(record)

    if (error) {
      throw new Error(`Erro ao salvar mensagem no histórico: ${error.message}`)
    }

    // Nota: Tabela "Clientes WhatsApp" não tem campos ultima_mensagem ou updated_at
    // Essas atualizações foram removidas para evitar erros de banco de dados
  } catch (error) {
    throw new Error(
      `saveChatMessage falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}
