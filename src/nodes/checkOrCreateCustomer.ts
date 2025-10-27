import { CustomerRecord } from '@/lib/types'
import { query } from '@/lib/postgres'

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
    
    const { phone, name } = input
    const startQuery = Date.now()
    
    // Query direto no PostgreSQL
    const result = await query<any>(
      'SELECT * FROM "Clientes WhatsApp" WHERE telefone = $1 LIMIT 1',
      [phone]
    )

    const queryDuration = Date.now() - startQuery
    console.log(`[checkOrCreateCustomer] ⏱️ Query levou ${queryDuration}ms`)

    if (result.rows.length > 0) {
      const existingCustomer = result.rows[0]
      console.log('[checkOrCreateCustomer] ✅ Cliente encontrado:', existingCustomer.telefone)
      
      return {
        id: String(existingCustomer.telefone),
        client_id: DEFAULT_CLIENT_ID,
        phone: String(existingCustomer.telefone),
        name: existingCustomer.nome,
        status: existingCustomer.status,
        created_at: existingCustomer.created_at,
        updated_at: existingCustomer.created_at,
      }
    }

    console.log('[checkOrCreateCustomer] 📝 Cliente não existe, criando novo...')
    const startInsert = Date.now()
    
    const insertResult = await query<any>(
      'INSERT INTO "Clientes WhatsApp" (telefone, nome, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [phone, name, 'bot']
    )

    const insertDuration = Date.now() - startInsert
    console.log(`[checkOrCreateCustomer] ⏱️ Insert levou ${insertDuration}ms`)

    if (insertResult.rows.length === 0) {
      throw new Error('Failed to create new customer: No data returned')
    }

    const newCustomer = insertResult.rows[0]
    console.log('[checkOrCreateCustomer] ✅ Cliente criado:', newCustomer.telefone)
    
    return {
      id: String(newCustomer.telefone),
      client_id: DEFAULT_CLIENT_ID,
      phone: String(newCustomer.telefone),
      name: newCustomer.nome,
      status: newCustomer.status,
      created_at: newCustomer.created_at,
      updated_at: newCustomer.created_at,
    }
  } catch (error) {
    console.error('[checkOrCreateCustomer] 💥 ERRO:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
