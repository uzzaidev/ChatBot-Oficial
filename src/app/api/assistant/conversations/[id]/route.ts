/**
 * GET    /api/assistant/conversations/[id] — load messages for a conversation
 * PATCH  /api/assistant/conversations/[id] — rename conversation
 * DELETE /api/assistant/conversations/[id] — delete conversation + messages (cascade)
 */

import { NextRequest, NextResponse } from "next/server";

import {
  createServiceClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// ── GET — load messages ──────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = createServiceClient() as any;

  // Verify ownership
  const { data: conv } = await supabaseAny
    .from("assistant_conversations")
    .select("id, title")
    .eq("id", id)
    .eq("client_id", clientId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabaseAny
    .from("assistant_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}

// ── PATCH — rename conversation ──────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json(
      { error: "Título não pode ser vazio." },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = createServiceClient() as any;
  const { data, error } = await supabaseAny
    .from("assistant_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", clientId)
    .select("id, title, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ conversation: data });
}

// ── DELETE — delete conversation ─────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = createServiceClient() as any;
  const { error } = await supabaseAny
    .from("assistant_conversations")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
