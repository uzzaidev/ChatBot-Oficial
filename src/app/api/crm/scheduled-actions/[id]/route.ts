import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Action id is required" }, { status: 400 });
    }

    const result = await query<{ id: string }>(
      `UPDATE crm_scheduled_actions
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1
         AND client_id = $2
         AND status = 'pending'
       RETURNING id`,
      [id, clientId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Scheduled action not found or cannot be cancelled" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[crm/scheduled-actions/:id] DELETE error", error);
    return NextResponse.json(
      { error: "Failed to cancel scheduled action" },
      { status: 500 },
    );
  }
}
