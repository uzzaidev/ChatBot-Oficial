import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { CRMColumn } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/crm/columns/[id]
 * Update a column
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, color, icon } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      values.push(icon);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Add WHERE conditions
    values.push(id, clientId);

    const result = await query<CRMColumn>(
      `UPDATE crm_columns 
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramCount++} AND client_id = $${paramCount++}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    return NextResponse.json({ column: result.rows[0] });
  } catch (error) {
    console.error("Error updating CRM column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/crm/columns/[id]
 * Delete (archive) a column
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Check if column has cards
    const cardsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM crm_cards 
       WHERE column_id = $1 AND client_id = $2`,
      [id, clientId],
    );

    const cardCount = parseInt(cardsResult.rows[0]?.count || "0");

    if (cardCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete column with ${cardCount} cards. Move cards first.`,
        },
        { status: 400 },
      );
    }

    // Archive column (soft delete)
    const result = await query<CRMColumn>(
      `UPDATE crm_columns 
       SET is_archived = true, updated_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING *`,
      [id, clientId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting CRM column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 },
    );
  }
}
