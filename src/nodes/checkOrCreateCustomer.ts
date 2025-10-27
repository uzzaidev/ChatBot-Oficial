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
    console.log('[checkOrCreateCustomer] 🔍 Consultando cliente...', { phone: input.phone })
    
    const supabase = createServerClient()
    const { phone, name } = input

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

    // @ts-ignore - Clientes WhatsApp table structure
    if (existingCustomer) {
      // @ts-ignore
      console.log('[checkOrCreateCustomer] ✅ Cliente encontrado:', existingCustomer.telefone)
      // @ts-ignore
      const telefoneStr = String(existingCustomer.telefone)
      return {
        id: telefoneStr,
        client_id: DEFAULT_CLIENT_ID,
        phone: telefoneStr,
        // @ts-ignore
        name: existingCustomer.nome,
        // @ts-ignore
        status: existingCustomer.status,
        // @ts-ignore
        created_at: existingCustomer.created_at,
        // @ts-ignore
        updated_at: existingCustomer.created_at,
      }
    }

    console.log('[checkOrCreateCustomer] 📝 Cliente não existe, criando novo...')
    const startInsert = Date.now()
    
    // @ts-ignore - Clientes WhatsApp table structure
    const { data: newCustomer, error: insertError} = await supabase
      .from('Clientes WhatsApp')
      // @ts-ignore
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

    // @ts-ignore
    console.log('[checkOrCreateCustomer] ✅ Cliente criado:', newCustomer.telefone)
    // @ts-ignore
    const telefoneStr = String(newCustomer.telefone)
    return {
      id: telefoneStr,
      client_id: DEFAULT_CLIENT_ID,
      phone: telefoneStr,
      // @ts-ignore
      name: newCustomer.nome,
      // @ts-ignore
      status: newCustomer.status,
      // @ts-ignore
      created_at: newCustomer.created_at,
      // @ts-ignore
      updated_at: newCustomer.created_at,
    }
  } catch (error) {
    console.error('[checkOrCreateCustomer] 💥 ERRO:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
