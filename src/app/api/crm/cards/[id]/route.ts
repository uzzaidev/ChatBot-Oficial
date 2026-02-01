import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { CRMCard } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/cards/[id]
 * Fetch single card with full details
 */
export async function GET(
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

    const sqlQuery = `
      SELECT 
        c.*,
        cw.nome as contact_name,
        up.full_name as assigned_user_name
      FROM crm_cards c
      LEFT JOIN clientes_whatsapp cw ON c.phone = cw.telefone AND c.client_id = cw.client_id
      LEFT JOIN user_profiles up ON c.assigned_to = up.id
      WHERE c.id = $1 AND c.client_id = $2
    `;

    const result = await query<any>(sqlQuery, [id, clientId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const card: CRMCard = {
      id: row.id,
      client_id: row.client_id,
      column_id: row.column_id,
      phone: row.phone,
      position: row.position,
      auto_status: row.auto_status,
      auto_status_updated_at: row.auto_status_updated_at,
      assigned_to: row.assigned_to,
      assigned_at: row.assigned_at,
      estimated_value: row.estimated_value,
      currency: row.currency,
      probability: row.probability,
      expected_close_date: row.expected_close_date,
      last_message_at: row.last_message_at,
      last_message_direction: row.last_message_direction,
      last_message_preview: row.last_message_preview,
      moved_to_column_at: row.moved_to_column_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      contact: {
        name: row.contact_name,
      },
      assignedUser: row.assigned_user_name
        ? {
            name: row.assigned_user_name,
          }
        : undefined,
    };

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Error fetching CRM card:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/crm/cards/[id]
 * Update card properties
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
    const {
      assigned_to,
      estimated_value,
      probability,
      expected_close_date,
      auto_status,
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assigned_to);
      updates.push(`assigned_at = $${paramCount++}`);
      values.push(assigned_to ? "NOW()" : null);
    }

    if (estimated_value !== undefined) {
      updates.push(`estimated_value = $${paramCount++}`);
      values.push(estimated_value);
    }

    if (probability !== undefined) {
      updates.push(`probability = $${paramCount++}`);
      values.push(probability);
    }

    if (expected_close_date !== undefined) {
      updates.push(`expected_close_date = $${paramCount++}`);
      values.push(expected_close_date);
    }

    if (auto_status !== undefined) {
      updates.push(`auto_status = $${paramCount++}`);
      values.push(auto_status);
      updates.push(`auto_status_updated_at = NOW()`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Add WHERE conditions
    values.push(id, clientId);

    const result = await query<CRMCard>(
      `UPDATE crm_cards 
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramCount++} AND client_id = $${paramCount++}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card: result.rows[0] });
  } catch (error) {
    console.error("Error updating CRM card:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/crm/cards/[id]
 * Delete a card
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

    const result = await query(
      `DELETE FROM crm_cards 
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [id, clientId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting CRM card:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 },
    );
  }
}
