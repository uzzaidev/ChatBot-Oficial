import { CustomerRecord } from '@/lib/types'
import { createServerClient } from '@/lib/supabase'

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
      return {
        id: existingCustomer.id,
        client_id: existingCustomer.client_id,
        phone: existingCustomer.telefone,
        name: existingCustomer.nome,
        status: existingCustomer.status,
        created_at: existingCustomer.created_at,
        updated_at: existingCustomer.updated_at,
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

    return {
      id: newCustomer.id,
      client_id: newCustomer.client_id,
      phone: newCustomer.telefone,
      name: newCustomer.nome,
      status: newCustomer.status,
      created_at: newCustomer.created_at,
      updated_at: newCustomer.updated_at,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
