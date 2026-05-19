/**
 * GET  /api/assistant/conversations — list all conversations for current tenant
 * POST /api/assistant/conversations — create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";

import {
  createServiceClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// ── GET — list conversations ─────────────────────────────────
export async function GET(request: NextRequest) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = createServiceClient() as any;
  const { data, error } = await supabaseAny
    .from("assistant_conversations")
    .select("id, title, created_at, updated_at")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ── POST — create a new conversation ────────────────────────
export async function POST(request: NextRequest) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = createServiceClient() as any;
  const { data, error } = await supabaseAny
    .from("assistant_conversations")
    .insert({ client_id: clientId, title: "Nova conversa" })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
