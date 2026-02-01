import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { CRMCard } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/cards
 * Fetch all cards with filters
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const columnId = searchParams.get("columnId");
    const search = searchParams.get("search");
    const autoStatus = searchParams.get("autoStatus");
    const assignedTo = searchParams.get("assignedTo");

    // Build dynamic query
    const conditions: string[] = ["c.client_id = $1"];
    const values: any[] = [clientId];
    let paramCount = 2;

    if (columnId) {
      conditions.push(`c.column_id = $${paramCount++}`);
      values.push(columnId);
    }

    if (autoStatus) {
      conditions.push(`c.auto_status = $${paramCount++}`);
      values.push(autoStatus);
    }

    if (assignedTo) {
      conditions.push(`c.assigned_to = $${paramCount++}`);
      values.push(assignedTo);
    }

    if (search) {
      conditions.push(`(
        cw.nome ILIKE $${paramCount} OR
        CAST(c.phone AS TEXT) ILIKE $${paramCount}
      )`);
      values.push(`%${search}%`);
      paramCount++;
    }

    // Fetch cards with joined data
    const sqlQuery = `
      SELECT 
        c.*,
        cw.nome as contact_name,
        up.full_name as assigned_user_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', ct.tag_id)
          ) FILTER (WHERE ct.tag_id IS NOT NULL),
          '[]'
        ) as tag_ids
      FROM crm_cards c
      LEFT JOIN clientes_whatsapp cw ON c.phone = cw.telefone AND c.client_id = cw.client_id
      LEFT JOIN user_profiles up ON c.assigned_to = up.id
      LEFT JOIN crm_card_tags ct ON c.id = ct.card_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY c.id, cw.nome, up.full_name
      ORDER BY c.column_id, c.position ASC
    `;

    const result = await query<any>(sqlQuery, values);

    // Transform results
    const cards: CRMCard[] = result.rows.map((row) => ({
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
      tagIds: row.tag_ids.map((t: any) => t.id).filter(Boolean),
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Error fetching CRM cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/crm/cards
 * Create a new card
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { column_id, phone } = body;

    if (!column_id || !phone) {
      return NextResponse.json(
        { error: "column_id and phone are required" },
        { status: 400 },
      );
    }

    // Get next position
    const maxPosResult = await query<{ position: number }>(
      `SELECT position FROM crm_cards 
       WHERE column_id = $1 
       ORDER BY position DESC LIMIT 1`,
      [column_id],
    );

    const nextPosition = (maxPosResult.rows[0]?.position ?? -1) + 1;

    // Insert card
    const result = await query<CRMCard>(
      `INSERT INTO crm_cards (client_id, column_id, phone, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, column_id, phone, nextPosition],
    );

    // Log activity
    await query(
      `INSERT INTO crm_activity_log (client_id, card_id, activity_type, is_automated)
       VALUES ($1, $2, 'created', false)`,
      [clientId, result.rows[0].id],
    );

    return NextResponse.json({ card: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating CRM card:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A card for this phone number already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 },
    );
  }
}
