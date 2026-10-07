import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/digest/whatsapp/messages?phones=55..,55..&since=ISO&limit=N
 *
 * Auth: `Authorization: Bearer <DIGEST_API_TOKEN>` (mesmo token do digest),
 * escopo fixo em DIGEST_API_CLIENT_ID.
 *
 * Mensagens cruas (conteúdo completo + mídia) de contatos específicos, em
 * ordem crescente, para o financeiro manter uma cópia do histórico.
 * Paginação: repita com `since` = `nextSince` enquanto `hasMore`.
 * Fonte: n8n_chat_histories (type 'human' = recebida, 'ai' = enviada).
 */

type Row = {
  id: string;
  phone: string;
  type: string | null;
  content: string | null;
  ts: string;
  wamid: string | null;
  transcription: string | null;
  media_metadata: Record<string, unknown> | null;
};

const MAX_LIMIT = 2000;

export async function GET(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.DIGEST_API_TOKEN;
  const clientId = process.env.DIGEST_API_CLIENT_ID;
  if (!expected || !clientId) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phones = (searchParams.get("phones") || "")
    .split(",")
    .map((p) => p.replace(/\D+/g, ""))
    .filter(Boolean);
  if (phones.length === 0) {
    return NextResponse.json({ error: "Missing 'phones'" }, { status: 400 });
  }
  const since = new Date(searchParams.get("since") || "1970-01-01T00:00:00Z");
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid 'since'" }, { status: 400 });
  }
  const limit = Math.min(Number(searchParams.get("limit")) || 1000, MAX_LIMIT);

  // `>=` em created_at: o cliente repassa o último ts como `since`; a linha
  // da borda volta repetida, mas o financeiro faz upsert por id (nada se perde).
  const result = await query<Row>(
    `SELECT h.id::text AS id,
            h.session_id::text AS phone,
            h.message->>'type' AS type,
            h.message->>'content' AS content,
            h.created_at AS ts,
            h.wamid,
            h.transcription,
            h.media_metadata
       FROM n8n_chat_histories h
      WHERE h.client_id = $1
        AND h.session_id::text = ANY($2::text[])
        AND h.created_at >= $3
      ORDER BY h.created_at ASC, h.id ASC
      LIMIT $4`,
    [clientId, phones, since.toISOString(), limit],
  );

  const messages = result.rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    direction: r.type === "human" ? "in" : "out",
    ts: new Date(r.ts).toISOString(),
    content: r.content ?? "",
    wamid: r.wamid,
    transcription: r.transcription,
    media: r.media_metadata ?? null,
  }));

  return NextResponse.json({
    messages,
    hasMore: messages.length === limit,
    nextSince: messages.length ? messages[messages.length - 1].ts : since.toISOString(),
  });
}
