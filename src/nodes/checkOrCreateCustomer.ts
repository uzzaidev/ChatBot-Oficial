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
    const supabase = createServerClient()
    const { phone, name } = input

    const { data: existingCustomer, error: selectError } = await supabase
      .from('Clientes WhatsApp')
      .select('*')
      .eq('telefone', phone)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing customer: ${selectError.message}`)
    }

    if (existingCustomer) {
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

    const { data: newCustomer, error: insertError } = await supabase
      .from('Clientes WhatsApp')
      .insert({
        telefone: phone,
        nome: name,
        status: 'bot',
      })
      .select()
      .single()

    if (insertError || !newCustomer) {
      throw new Error(`Failed to create new customer: ${insertError?.message || 'No data returned'}`)
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
