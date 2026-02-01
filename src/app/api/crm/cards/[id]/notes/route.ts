import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { CRMNote } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/cards/[id]/notes
 * Fetch all notes for a card
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

    // Verify card belongs to client
    const cardCheck = await query(
      `SELECT id FROM crm_cards WHERE id = $1 AND client_id = $2`,
      [id, clientId],
    );

    if (cardCheck.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Fetch notes with author info
    const sqlQuery = `
      SELECT 
        n.*,
        up.full_name as author_name
      FROM crm_notes n
      LEFT JOIN user_profiles up ON n.created_by = up.id
      WHERE n.card_id = $1
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `;

    const result = await query<any>(sqlQuery, [id]);

    const notes: CRMNote[] = result.rows.map((row) => ({
      id: row.id,
      card_id: row.card_id,
      client_id: row.client_id,
      content: row.content,
      created_by: row.created_by,
      is_pinned: row.is_pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: row.author_name
        ? {
            name: row.author_name,
          }
        : undefined,
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/crm/cards/[id]/notes
 * Create a new note
 */
export async function POST(
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
    const { content, is_pinned = false } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    // Verify card belongs to client
    const cardCheck = await query(
      `SELECT id FROM crm_cards WHERE id = $1 AND client_id = $2`,
      [id, clientId],
    );

    if (cardCheck.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Get user ID from session
    const {
      data: { user },
    } = (await (request as any).supabase?.auth.getUser()) || {
      data: { user: null },
    };

    // Insert note
    const result = await query<CRMNote>(
      `INSERT INTO crm_notes (card_id, client_id, content, created_by, is_pinned)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, clientId, content.trim(), user?.id || null, is_pinned],
    );

    // Log activity
    await query(
      `INSERT INTO crm_activity_log (client_id, card_id, activity_type, performed_by, is_automated)
       VALUES ($1, $2, 'note_add', $3, false)`,
      [clientId, id, user?.id || null],
    );

    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
