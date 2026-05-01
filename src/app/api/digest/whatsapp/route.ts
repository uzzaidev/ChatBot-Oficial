import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/digest/whatsapp?from=ISO&to=ISO
 *
 * Auth: header `Authorization: Bearer <DIGEST_API_TOKEN>`
 * Returns conversations and messages for a given time range, scoped to the
 * `client_id` mapped to the provided token.
 *
 * Token → client_id mapping is configured via env:
 *   DIGEST_API_TOKEN      = the bearer token
 *   DIGEST_API_CLIENT_ID  = the UUID of the client to scope the query
 *
 * Designed for the financeiro daily digest cron. Response is intentionally
 * compact (no media URLs, content truncated) to keep payload small.
 */

type Row = {
  phone: string;
  content: string;
  direction: "in" | "out";
  ts: string;
  transcription: string | null;
  contact_name: string | null;
};

type ConversationOut = {
  phone: string;
  contactName: string | null;
  count: number;
  inbound: number;
  outbound: number;
  firstAt: string;
  lastAt: string;
  lastDirection: "in" | "out";
  preview: string;
  messages: { direction: "in" | "out"; ts: string; content: string }[];
};

const PREVIEW_CHARS = 180;
const MAX_MESSAGES_PER_CONTACT = 30;
const MAX_TOTAL_ROWS = 500;

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export async function GET(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.DIGEST_API_TOKEN;
  const clientId = process.env.DIGEST_API_CLIENT_ID;

  if (!expected || !clientId) {
    return NextResponse.json(
      { error: "Server not configured (DIGEST_API_TOKEN / DIGEST_API_CLIENT_ID missing)" },
      { status: 500 },
    );
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing 'from' and/or 'to' query params (ISO 8601)" },
      { status: 400 },
    );
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate <= fromDate) {
    return NextResponse.json({ error: "Invalid 'from'/'to' range" }, { status: 400 });
  }

  // Pull from the modern `messages` table joined with `clientes_whatsapp` for name.
  // Direction in `messages` is stored as 'inbound'/'outbound' or 'in'/'out' depending
  // on legacy data — normalize via CASE.
  const sql = `
    SELECT
      m.phone::text AS phone,
      m.content AS content,
      CASE
        WHEN LOWER(m.direction) IN ('in','inbound','incoming','received') THEN 'in'
        WHEN LOWER(m.direction) IN ('out','outbound','outgoing','sent') THEN 'out'
        ELSE 'out'
      END AS direction,
      m."timestamp" AS ts,
      m.transcription AS transcription,
      c.nome AS contact_name
    FROM messages m
    LEFT JOIN clientes_whatsapp c
      ON CAST(c.telefone AS TEXT) = m.phone::text
     AND c.client_id = m.client_id
    WHERE m.client_id = $1
      AND m."timestamp" >= $2
      AND m."timestamp" <  $3
      AND m.content IS NOT NULL
    ORDER BY m."timestamp" ASC
    LIMIT $4
  `;

  const result = await query<Row>(sql, [clientId, fromDate.toISOString(), toDate.toISOString(), MAX_TOTAL_ROWS]);

  const byPhone = new Map<string, ConversationOut>();
  for (const r of result.rows) {
    const phone = r.phone;
    const text = r.transcription ? `[áudio] ${r.transcription}` : r.content;
    const clean = truncate(text, PREVIEW_CHARS);
    if (!clean) continue;

    let conv = byPhone.get(phone);
    if (!conv) {
      conv = {
        phone,
        contactName: r.contact_name ?? null,
        count: 0,
        inbound: 0,
        outbound: 0,
        firstAt: r.ts,
        lastAt: r.ts,
        lastDirection: r.direction,
        preview: "",
        messages: [],
      };
      byPhone.set(phone, conv);
    }
    conv.count += 1;
    if (r.direction === "in") conv.inbound += 1;
    else conv.outbound += 1;
    conv.lastAt = r.ts;
    conv.lastDirection = r.direction;
    if (conv.messages.length < MAX_MESSAGES_PER_CONTACT) {
      conv.messages.push({ direction: r.direction, ts: r.ts, content: clean });
    }
  }

  // Build a short preview (last 1-2 messages) for each conversation.
  for (const conv of byPhone.values()) {
    const tail = conv.messages.slice(-2);
    conv.preview = tail
      .map((m) => `${m.direction === "in" ? "→" : "←"} ${m.content}`)
      .join(" | ");
  }

  const conversations = Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  const totalMessages = conversations.reduce((s, c) => s + c.count, 0);

  return NextResponse.json({
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    totals: {
      conversations: conversations.length,
      messages: totalMessages,
      truncated: result.rows.length >= MAX_TOTAL_ROWS,
    },
    conversations,
  });
}
