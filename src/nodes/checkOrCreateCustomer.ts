import { CustomerRecord } from '@/lib/types'
import { createServerClient } from '@/lib/supabase'

// Constant for legacy table that doesn't have client_id column
const DEFAULT_CLIENT_ID = 'demo-client-id'

export interface CheckOrCreateCustomerInput {
  phone: string
  name: string
}

export const checkOrCreateCustomer = async (
  input: CheckOrCreateCustomerInput
): Promise<CustomerRecord> => {
  try {
    console.log('[checkOrCreateCustomer] 🚀 Iniciando...', { phone: input.phone })
    
    const supabase = createServerClient()
    const { phone, name } = input

    console.log('[checkOrCreateCustomer] 🔍 Consultando cliente existente...')
    const startQuery = Date.now()
    
    const { data: existingCustomer, error: selectError } = await supabase
      .from('Clientes WhatsApp')
      .select('*')
      .eq('telefone', phone)
      .single()

    const queryDuration = Date.now() - startQuery
    console.log(`[checkOrCreateCustomer] ⏱️ Query levou ${queryDuration}ms`)

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[checkOrCreateCustomer] ❌ Erro na query:', selectError)
      throw new Error(`Failed to check existing customer: ${selectError.message}`)
    }

    if (existingCustomer) {
      console.log('[checkOrCreateCustomer] ✅ Cliente encontrado:', existingCustomer.telefone)
      const telefoneStr = String(existingCustomer.telefone)
      return {
        id: telefoneStr,
        client_id: DEFAULT_CLIENT_ID, // Tabela legada não tem client_id
        phone: telefoneStr,
        name: existingCustomer.nome,
        status: existingCustomer.status,
        created_at: existingCustomer.created_at,
        updated_at: existingCustomer.created_at, // Tabela não tem updated_at, usando created_at
      }
    }

    console.log('[checkOrCreateCustomer] 📝 Cliente não existe, criando novo...')
    const startInsert = Date.now()
    
    const { data: newCustomer, error: insertError } = await supabase
      .from('Clientes WhatsApp')
      .insert({
        telefone: phone,
        nome: name,
        status: 'bot',
      })
      .select()
      .single()

    const insertDuration = Date.now() - startInsert
    console.log(`[checkOrCreateCustomer] ⏱️ Insert levou ${insertDuration}ms`)

    if (insertError || !newCustomer) {
      console.error('[checkOrCreateCustomer] ❌ Erro ao criar cliente:', insertError)
      throw new Error(`Failed to create new customer: ${insertError?.message || 'No data returned'}`)
    }

    console.log('[checkOrCreateCustomer] ✅ Cliente criado:', newCustomer.telefone)
    const telefoneStr = String(newCustomer.telefone)
    return {
      id: telefoneStr,
      client_id: DEFAULT_CLIENT_ID, // Tabela legada não tem client_id
      phone: telefoneStr,
      name: newCustomer.nome,
      status: newCustomer.status,
      created_at: newCustomer.created_at,
      updated_at: newCustomer.created_at, // Tabela não tem updated_at, usando created_at
    }
  } catch (error) {
    console.error('[checkOrCreateCustomer] 💥 ERRO CRÍTICO:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
