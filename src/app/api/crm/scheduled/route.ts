import { createServerClient } from "@/lib/supabase-server";
import type { ScheduledMessage } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/scheduled
 * List scheduled messages for the current client
 *
 * Query params:
 * - status: filter by status (pending, sent, failed, cancelled)
 * - card_id: filter by card
 * - phone: filter by phone number
 * - from: filter by scheduled_for >= date
 * - to: filter by scheduled_for <= date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Get current user and client_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from("scheduled_messages")
      .select(
        `
        *,
        contact:clientes_whatsapp!scheduled_messages_phone_fkey(nome),
        creator:user_profiles!scheduled_messages_created_by_fkey(full_name)
      `,
      )
      .eq("client_id", profile.client_id)
      .order("scheduled_for", { ascending: true });

    // Apply filters
    const status = searchParams.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    const cardId = searchParams.get("card_id");
    if (cardId) {
      query = query.eq("card_id", cardId);
    }

    const phone = searchParams.get("phone");
    if (phone) {
      query = query.eq("phone", phone);
    }

    const from = searchParams.get("from");
    if (from) {
      query = query.gte("scheduled_for", from);
    }

    const to = searchParams.get("to");
    if (to) {
      query = query.lte("scheduled_for", to);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching scheduled messages:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to proper types
    const transformedMessages: ScheduledMessage[] = (messages || []).map(
      (msg: any) => ({
        ...msg,
        contact: msg.contact ? { name: msg.contact.nome } : undefined,
        creator: msg.creator ? { name: msg.creator.full_name } : undefined,
      }),
    );

    return NextResponse.json({ messages: transformedMessages });
  } catch (error: any) {
    console.error("Error in scheduled messages GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/crm/scheduled
 * Create a new scheduled message
 *
 * Body:
 * - phone: string (required)
 * - content: string (required for text messages)
 * - scheduled_for: ISO datetime string (required)
 * - card_id?: string (optional - link to CRM card)
 * - message_type?: 'text' | 'template' (default: 'text')
 * - template_id?: string (required for template messages)
 * - template_params?: object (for template messages)
 * - timezone?: string (default: 'America/Sao_Paulo')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get current user and client_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }
    if (!body.scheduled_for) {
      return NextResponse.json(
        { error: "scheduled_for is required" },
        { status: 400 },
      );
    }

    const messageType = body.message_type || "text";

    if (messageType === "text" && !body.content) {
      return NextResponse.json(
        { error: "Content is required for text messages" },
        { status: 400 },
      );
    }
    if (messageType === "template" && !body.template_id) {
      return NextResponse.json(
        { error: "template_id is required for template messages" },
        { status: 400 },
      );
    }

    // Validate scheduled_for is in the future
    const scheduledDate = new Date(body.scheduled_for);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "scheduled_for must be in the future" },
        { status: 400 },
      );
    }

    // Create scheduled message
    const { data: message, error } = await supabase
      .from("scheduled_messages")
      .insert({
        client_id: profile.client_id,
        phone: body.phone,
        card_id: body.card_id || null,
        message_type: messageType,
        content: body.content || null,
        template_id: body.template_id || null,
        template_params: body.template_params || null,
        scheduled_for: body.scheduled_for,
        timezone: body.timezone || "America/Sao_Paulo",
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scheduled message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Error in scheduled messages POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
