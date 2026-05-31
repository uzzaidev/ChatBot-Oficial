import { emitCrmAutomationEvent } from "@/lib/crm-automation-engine";
import { query } from "@/lib/postgres";

interface InactiveCardRow {
  card_id: string;
  client_id: string;
  last_message_at: string;
  inactive_days: number;
}

export interface InactivityCheckResult {
  scanned: number;
  emitted: number;
  skipped: number;
  errors: number;
}

/**
 * Concorrência alinhada ao pool do Postgres (max: 3 conexões).
 * Cada emissão usa withCardLock, que segura uma conexão dedicada
 * pela transação inteira — exceder o pool causaria connectionTimeout.
 */
const EMIT_CONCURRENCY = 3;

/**
 * Executa o scan de inatividade e emite eventos para o engine.
 */
export const runInactivityCheck = async (
  limit = 500,
): Promise<InactivityCheckResult> => {
  const result: InactivityCheckResult = {
    scanned: 0,
    emitted: 0,
    skipped: 0,
    errors: 0,
  };

  const cards = await query<InactiveCardRow>(
    `
      SELECT
        c.id AS card_id,
        c.client_id,
        c.last_message_at,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - c.last_message_at)) / 86400)::int AS inactive_days
      FROM crm_cards c
      WHERE c.last_message_at IS NOT NULL
        AND c.last_message_at <= NOW() - INTERVAL '1 day'
        AND EXISTS (
          SELECT 1
          FROM crm_automation_rules r
          WHERE r.client_id = c.client_id
            AND r.trigger_type = 'inactivity'
            AND r.is_active = true
        )
      ORDER BY c.last_message_at ASC
      LIMIT $1
    `,
    [limit],
  );

  const processCard = async (card: InactiveCardRow): Promise<void> => {
    result.scanned++;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const emitResult = await emitCrmAutomationEvent({
        clientId: card.client_id,
        cardId: card.card_id,
        triggerType: "inactivity",
        dedupeKey: `inactivity:${card.card_id}:${today}`,
        triggerData: {
          inactive_days: card.inactive_days,
          last_message_date: card.last_message_at,
        },
      });

      if (emitResult.executedRules > 0) {
        result.emitted++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.errors++;
      console.error("[crm-inactivity-check] failed to emit event", {
        cardId: card.card_id,
        clientId: card.client_id,
        error,
      });
    }
  };

  for (let i = 0; i < cards.rows.length; i += EMIT_CONCURRENCY) {
    const batch = cards.rows.slice(i, i + EMIT_CONCURRENCY);
    await Promise.all(batch.map(processCard));
  }

  return result;
};
