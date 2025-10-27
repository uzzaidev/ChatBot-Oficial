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
    console.log('[checkOrCreateCustomer] 🔍 INICIANDO UPSERT')
    console.log('[checkOrCreateCustomer] 📱 Phone:', input.phone)
    console.log('[checkOrCreateCustomer] 👤 Name:', input.name)
    console.log('[checkOrCreateCustomer] ⏱️  Timestamp:', new Date().toISOString())

    const { phone, name } = input

    // OTIMIZAÇÃO: Usa UPSERT (INSERT ... ON CONFLICT) para eliminar a query SELECT
    // Isso reduz de 2 queries (SELECT + INSERT) para 1 query sempre
    // IMPORTANTE: maxRetries=3 (aumentado para maior resiliência)
    console.log('[checkOrCreateCustomer] 🔄 Executando query com maxRetries=3...')

    const result = await query<any>(
      `INSERT INTO "Clientes WhatsApp" (telefone, nome, status, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telefone)
       DO UPDATE SET nome = COALESCE(EXCLUDED.nome, "Clientes WhatsApp".nome)
       RETURNING *`,
      [phone, name, 'bot'],
      3 // AUMENTADO: 3 retries para maior resiliência
    )

    const duration = Date.now() - startTime
    console.log(`[checkOrCreateCustomer] ✅ UPSERT SUCESSO em ${duration}ms`)
    console.log(`[checkOrCreateCustomer] 📊 Rows returned: ${result.rows.length}`)

    if (result.rows.length === 0) {
      throw new Error('Failed to upsert customer: No data returned')
    }

    const customer = result.rows[0]
    console.log(`[checkOrCreateCustomer] ✅ Customer data:`, {
      telefone: customer.telefone,
      nome: customer.nome,
      status: customer.status
    })

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
    console.error(`[checkOrCreateCustomer] 💥💥💥 ERRO CRÍTICO after ${duration}ms 💥💥💥`)
    console.error(`[checkOrCreateCustomer] Error type:`, error instanceof Error ? error.constructor.name : typeof error)
    console.error(`[checkOrCreateCustomer] Error message:`, error instanceof Error ? error.message : String(error))
    console.error(`[checkOrCreateCustomer] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    console.error(`[checkOrCreateCustomer] Input data:`, { phone: input.phone, name: input.name })

    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to check or create customer: ${errorMessage}`)
  }
}
