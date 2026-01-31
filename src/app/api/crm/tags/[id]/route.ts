import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import { getClientIdFromSession } from '@/lib/supabase-server'
import type { CRMTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/crm/tags/[id]
 * Update a tag
 */
export async function PATCH(
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
    const { name, color, description } = body

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount++}`)
      values.push(color)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add WHERE conditions
    values.push(params.id, clientId)

    const result = await query<CRMTag>(
      `UPDATE crm_tags 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount++} AND client_id = $${paramCount++}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tag: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating CRM tag:', error)

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/tags/[id]
 * Delete a tag
 */
export async function DELETE(
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

    // Check if tag is system tag
    const tagCheck = await query<{ is_system: boolean }>(
      `SELECT is_system FROM crm_tags 
       WHERE id = $1 AND client_id = $2`,
      [params.id, clientId]
    )

    if (tagCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    if (tagCheck.rows[0].is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system tags' },
        { status: 400 }
      )
    }

    // Delete tag (cascade will remove card_tags)
    await query(
      `DELETE FROM crm_tags 
       WHERE id = $1 AND client_id = $2`,
      [params.id, clientId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting CRM tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
