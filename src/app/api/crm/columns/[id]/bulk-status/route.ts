import { query } from "@/lib/postgres";
import { createRouteHandlerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_CONTACT_STATUSES = [
  "bot",
  "humano",
  "transferido",
  "fluxo_inicial",
] as const;

type ContactStatus = (typeof ALLOWED_CONTACT_STATUSES)[number];

/**
 * POST /api/crm/columns/[id]/bulk-status
 * Update contact atendimento status for all cards in a CRM column.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const { id: columnId } = await params;
    const body = await request.json();
    const status = body?.status as ContactStatus | undefined;

    if (!status || !ALLOWED_CONTACT_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status inválido. Valores aceitos: bot, humano, transferido, fluxo_inicial",
        },
        { status: 400 },
      );
    }

    const columnCheck = await query<{ id: string; name: string }>(
      `SELECT id, name
       FROM crm_columns
       WHERE id = $1 AND client_id = $2 AND is_archived = false`,
      [columnId, clientId],
    );

    if (columnCheck.rows.length === 0) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    let transferredBy: string | null = null;
    if (status === "humano" || status === "transferido") {
      const supabase = await createRouteHandlerClient(request as any);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      transferredBy = user?.id || null;
    }

    const shouldMarkTransfer = status === "humano" || status === "transferido";
    const transferFieldsSql = shouldMarkTransfer
      ? "transferred_at = NOW(), transferred_by = $4,"
      : "transferred_at = NULL, transferred_by = NULL,";

    const updateParams = shouldMarkTransfer
      ? [clientId, columnId, status, transferredBy]
      : [clientId, columnId, status];

    const result = await query<{ targeted: string; updated: string }>(
      `
      WITH target_contacts AS (
        SELECT DISTINCT c.phone
        FROM crm_cards c
        WHERE c.client_id = $1
          AND c.column_id = $2
      ),
      updated_contacts AS (
        UPDATE clientes_whatsapp cw
        SET status = $3,
            ${transferFieldsSql}
            updated_at = NOW()
        FROM target_contacts tc
        WHERE cw.client_id = $1
          AND cw.telefone = tc.phone
        RETURNING cw.telefone
      )
      SELECT
        (SELECT COUNT(*)::text FROM target_contacts) AS targeted,
        (SELECT COUNT(*)::text FROM updated_contacts) AS updated
      `,
      updateParams,
    );

    const row = result.rows[0] || { targeted: "0", updated: "0" };
    const targeted = Number(row.targeted || 0);
    const updated = Number(row.updated || 0);

    return NextResponse.json({
      success: true,
      columnId,
      status,
      targeted,
      updated,
    });
  } catch (error) {
    console.error("Error bulk updating contact status by CRM column:", error);
    return NextResponse.json(
      { error: "Failed to bulk update contact status" },
      { status: 500 },
    );
  }
}
