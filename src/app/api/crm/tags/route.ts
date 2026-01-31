import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import { getClientIdFromSession } from '@/lib/supabase-server'
import type { CRMTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/tags
 * Fetch all tags for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

    const result = await query<CRMTag>(
      `SELECT * FROM crm_tags 
       WHERE client_id = $1
       ORDER BY name ASC`,
      [clientId]
    )

    return NextResponse.json({ tags: result.rows })
  } catch (error) {
    console.error('Error fetching CRM tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/tags
 * Create a new tag
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
    const { name, color = 'blue', description = null } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Insert tag
    const result = await query<CRMTag>(
      `INSERT INTO crm_tags (client_id, name, color, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, name, color, description]
    )

    return NextResponse.json({ tag: result.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating CRM tag:', error)

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
