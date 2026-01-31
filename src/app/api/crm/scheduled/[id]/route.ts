import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/crm/scheduled/[id]
 * Get a single scheduled message
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const { data: message, error } = await supabase
      .from("scheduled_messages")
      .select(
        `
        *,
        contact:clientes_whatsapp!scheduled_messages_phone_fkey(nome),
        creator:user_profiles!scheduled_messages_created_by_fkey(full_name)
      `,
      )
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Scheduled message not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching scheduled message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        ...message,
        contact: message.contact ? { name: message.contact.nome } : undefined,
        creator: message.creator
          ? { name: message.creator.full_name }
          : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error in scheduled message GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/crm/scheduled/[id]
 * Update a scheduled message (only if status is 'pending')
 *
 * Body:
 * - content?: string
 * - scheduled_for?: ISO datetime string
 * - template_params?: object
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check message exists and is pending
    const { data: existing, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("status")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Scheduled message not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Can only update pending messages" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.content !== undefined) {
      updates.content = body.content;
    }
    if (body.scheduled_for !== undefined) {
      const scheduledDate = new Date(body.scheduled_for);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: "scheduled_for must be in the future" },
          { status: 400 },
        );
      }
      updates.scheduled_for = body.scheduled_for;
    }
    if (body.template_params !== undefined) {
      updates.template_params = body.template_params;
    }

    const { data: message, error } = await supabase
      .from("scheduled_messages")
      .update(updates)
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating scheduled message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Error in scheduled message PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/crm/scheduled/[id]
 * Cancel/delete a scheduled message (only if status is 'pending')
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check message exists and is pending
    const { data: existing, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("status")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Scheduled message not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending messages" },
        { status: 400 },
      );
    }

    // Update status to cancelled instead of deleting
    const { error } = await supabase
      .from("scheduled_messages")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("client_id", profile.client_id);

    if (error) {
      console.error("Error cancelling scheduled message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in scheduled message DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
