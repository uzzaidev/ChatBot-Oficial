import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import { getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/cards/[id]/move
 * Move card to different column or position
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { column_id, position } = body

    if (!column_id) {
      return NextResponse.json(
        { error: 'column_id is required' },
        { status: 400 }
      )
    }

    // Verify card belongs to client
    const cardCheck = await query(
      `SELECT id FROM crm_cards WHERE id = $1 AND client_id = $2`,
      [params.id, clientId]
    )

    if (cardCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Use atomic move function
    await query(
      `SELECT crm_move_card($1, $2, $3)`,
      [params.id, column_id, position ?? null]
    )

    // Fetch updated card
    const result = await query(
      `SELECT * FROM crm_cards WHERE id = $1`,
      [params.id]
    )

    return NextResponse.json({ card: result.rows[0] })
  } catch (error) {
    console.error('Error moving CRM card:', error)
    return NextResponse.json(
      { error: 'Failed to move card' },
      { status: 500 }
    )
  }
}
