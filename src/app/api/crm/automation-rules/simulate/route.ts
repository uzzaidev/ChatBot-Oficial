import { simulateCrmAutomationEvent } from "@/lib/crm-automation-engine";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const normalizePhone = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
};

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const triggerType =
      typeof body.triggerType === "string" && body.triggerType.trim().length > 0
        ? body.triggerType.trim()
        : "keyword_detected";

    const triggerData =
      body.triggerData && typeof body.triggerData === "object"
        ? { ...(body.triggerData as Record<string, unknown>) }
        : {};

    if (typeof body.message === "string" && body.message.trim().length > 0) {
      triggerData.message_text = body.message.trim();
      triggerData.message_text_lower = body.message.trim().toLowerCase();
    }

    let cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";

    if (!cardId) {
      const phone = normalizePhone(body.phone);
      if (phone) {
        const cardResult = await query<{ id: string }>(
          `SELECT id FROM crm_cards WHERE client_id = $1 AND phone = $2 LIMIT 1`,
          [clientId, phone],
        );
        cardId = cardResult.rows[0]?.id ?? "";
      }
    }

    if (!cardId) {
      return NextResponse.json(
        { error: "cardId ou phone valido e obrigatorio para simulacao" },
        { status: 400 },
      );
    }

    const result = await simulateCrmAutomationEvent({
      clientId,
      cardId,
      triggerType,
      triggerData,
    });

    return NextResponse.json({
      dry_run: true,
      card_id: cardId,
      trigger_type: triggerType,
      rules_matched: result.matchedRules,
      rules_skipped: result.skippedRules,
    });
  } catch (error) {
    console.error("[crm/automation-rules/simulate] error", error);
    return NextResponse.json(
      { error: "Failed to simulate automation rules" },
      { status: 500 },
    );
  }
}
