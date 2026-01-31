import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { sendConversionEventOnCardMove } from "@/nodes/sendConversionEvent";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/cards/[id]/move
 * Move card to different column or position
 * Also triggers Meta Conversions API event if moving to conversion-mapped column
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { column_id, position } = body;

    if (!column_id) {
      return NextResponse.json(
        { error: "column_id is required" },
        { status: 400 },
      );
    }

    // Verify card belongs to client and get card data for conversion event
    const cardCheck = await query(
      `SELECT c.id, c.phone, c.estimated_value, col.slug as current_column_slug
       FROM crm_cards c
       LEFT JOIN crm_columns col ON col.id = c.column_id
       WHERE c.id = $1 AND c.client_id = $2`,
      [id, clientId],
    );

    if (cardCheck.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const card = cardCheck.rows[0];

    // Get the new column slug for conversion event mapping
    const newColumnResult = await query(
      `SELECT slug FROM crm_columns WHERE id = $1 AND client_id = $2`,
      [column_id, clientId],
    );

    const newColumnSlug = newColumnResult.rows[0]?.slug;

    // Use atomic move function
    await query(`SELECT crm_move_card($1, $2, $3)`, [
      id,
      column_id,
      position ?? null,
    ]);

    // Fetch updated card
    const result = await query(`SELECT * FROM crm_cards WHERE id = $1`, [id]);

    // 🎯 Send Meta Conversion Event if applicable (async, don't wait)
    if (newColumnSlug && card.phone) {
      sendConversionEventOnCardMove(
        clientId,
        id,
        newColumnSlug,
        card.phone,
        card.estimated_value,
      ).catch((err) => {
        // Log but don't fail the move operation
        console.error("[CAPI] Error sending conversion event:", err);
      });
    }

    return NextResponse.json({ card: result.rows[0] });
  } catch (error) {
    console.error("Error moving CRM card:", error);
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
  }
}
