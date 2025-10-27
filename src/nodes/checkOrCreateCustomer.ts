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
  const startTime = Date.now()
  
  try {
    console.log('[checkOrCreateCustomer] 🔍 UPSERT para cliente:', input.phone)
    
    const { phone, name } = input
    
    // OTIMIZAÇÃO: Usa UPSERT (INSERT ... ON CONFLICT) para eliminar a query SELECT
    // Isso reduz de 2 queries (SELECT + INSERT) para 1 query sempre
    const result = await query<any>(
      `INSERT INTO "Clientes WhatsApp" (telefone, nome, status, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telefone) 
       DO UPDATE SET nome = COALESCE(EXCLUDED.nome, "Clientes WhatsApp".nome)
       RETURNING *`,
      [phone, name, 'bot']
    )

    const duration = Date.now() - startTime
    console.log(`[checkOrCreateCustomer] ✅ UPSERT completed in ${duration}ms`)

    if (result.rows.length === 0) {
      throw new Error('Failed to upsert customer: No data returned')
    }

    const customer = result.rows[0]
    
    return {
      id: String(customer.telefone),
      client_id: DEFAULT_CLIENT_ID,
      phone: String(customer.telefone),
      name: customer.nome,
      status: customer.status,
      created_at: customer.created_at,
      updated_at: customer.created_at,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[checkOrCreateCustomer] 💥 ERRO after ${duration}ms:`, error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
