import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/digest/whatsapp/contacts
 *
 * Returns the list of WhatsApp contacts (phones) that the client has interacted
 * with, ordered by recent activity. Used by the financeiro app to let the user
 * pick which contacts should be excluded from the daily digest.
 *
 * Auth: same `Authorization: Bearer <DIGEST_API_TOKEN>` + DIGEST_API_CLIENT_ID
 * mapping used by the digest endpoint.
 *
 * Query: ?days=90 (optional, default 90, max 365) — how far back to look.
 */

type Row = {
  phone: string;
  contact_name: string | null;
  total: string; // bigint as text from pg
  last_at: string;
};

type ContactOut = {
  phone: string;
  contactName: string | null;
  totalMessages: number;
  lastAt: string;
};

const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;
const MAX_RESULTS = 500;

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
  const daysParam = parseInt(searchParams.get("days") || "", 10);
  const days = Number.isFinite(daysParam) && daysParam > 0
    ? Math.min(daysParam, MAX_DAYS)
    : DEFAULT_DAYS;

  const sql = `
    SELECT
      m.phone::text AS phone,
      MAX(c.nome) AS contact_name,
      COUNT(*)::text AS total,
      MAX(m."timestamp") AS last_at
    FROM messages m
    LEFT JOIN clientes_whatsapp c
      ON CAST(c.telefone AS TEXT) = m.phone::text
     AND c.client_id = m.client_id
    WHERE m.client_id = $1
      AND m."timestamp" >= NOW() - ($2::int * INTERVAL '1 day')
    GROUP BY m.phone
    ORDER BY MAX(m."timestamp") DESC
    LIMIT $3
  `;

  const result = await query<Row>(sql, [clientId, days, MAX_RESULTS]);

  const contacts: ContactOut[] = result.rows.map((r) => ({
    phone: r.phone,
    contactName: r.contact_name ?? null,
    totalMessages: parseInt(r.total, 10) || 0,
    lastAt: r.last_at,
  }));

  return NextResponse.json({
    days,
    total: contacts.length,
    contacts,
  });
}
