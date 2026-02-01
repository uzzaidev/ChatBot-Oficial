import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import { getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/columns/reorder
 * Reorder columns
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { columnOrders } = body

    if (!Array.isArray(columnOrders)) {
      return NextResponse.json(
        { error: 'columnOrders must be an array of {id, position}' },
        { status: 400 }
      )
    }

    // Update positions atomically in a transaction
    await query('BEGIN', [])

    try {
      for (const { id, position } of columnOrders) {
        await query(
          `UPDATE crm_columns 
           SET position = $1, updated_at = NOW()
           WHERE id = $2 AND client_id = $3`,
          [position, id, clientId]
        )
      }

      await query('COMMIT', [])
    } catch (error) {
      await query('ROLLBACK', [])
      throw error
    }

    // Fetch updated columns
    const result = await query(
      `SELECT * FROM crm_columns 
       WHERE client_id = $1 AND is_archived = false
       ORDER BY position ASC`,
      [clientId]
    )

    return NextResponse.json({ columns: result.rows })
  } catch (error) {
    console.error('Error reordering CRM columns:', error)
    return NextResponse.json(
      { error: 'Failed to reorder columns' },
      { status: 500 }
    )
  }
}
