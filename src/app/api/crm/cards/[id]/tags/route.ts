import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/cards/[id]/tags
 * Add tag to card
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
    const { tag_id } = body;

    if (!tag_id) {
      return NextResponse.json(
        { error: "tag_id is required" },
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

    // Add tag
    await query(
      `INSERT INTO crm_card_tags (card_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, tag_id) DO NOTHING`,
      [id, tag_id],
    );

    // Log activity
    await query(
      `INSERT INTO crm_activity_log (client_id, card_id, activity_type, new_value, is_automated)
       VALUES ($1, $2, 'tag_add', $3, false)`,
      [clientId, id, JSON.stringify({ tag_id })],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding tag to card:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/cards/[id]/tags
 * Remove tag from card
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

    const searchParams = request.nextUrl.searchParams;
    const tag_id = searchParams.get("tag_id");

    if (!tag_id) {
      return NextResponse.json(
        { error: "tag_id is required" },
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

    // Remove tag
    await query(
      `DELETE FROM crm_card_tags 
       WHERE card_id = $1 AND tag_id = $2`,
      [id, tag_id],
    );

    // Log activity
    await query(
      `INSERT INTO crm_activity_log (client_id, card_id, activity_type, old_value, is_automated)
       VALUES ($1, $2, 'tag_remove', $3, false)`,
      [clientId, id, JSON.stringify({ tag_id })],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing tag from card:", error);
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 },
    );
  }
}
