import { createServerClient } from "@/lib/supabase-server";
import type { CRMActivityLog } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/crm/cards/[id]/activities
 * Get activity log for a card
 *
 * Query params:
 * - limit: max number of activities (default 50)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Parse pagination
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify card belongs to client
    const { data: card, error: cardError } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Fetch activities
    const {
      data: activities,
      error,
      count,
    } = await supabase
      .from("crm_activity_log")
      .select(
        `
        *,
        actor:user_profiles!crm_activity_log_performed_by_fkey(full_name)
      `,
        { count: "exact" },
      )
      .eq("card_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching activities:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to proper types
    const transformedActivities: CRMActivityLog[] = (activities || []).map(
      (activity: any) => ({
        ...activity,
        actor: activity.actor ? { name: activity.actor.full_name } : undefined,
      }),
    );

    return NextResponse.json({
      activities: transformedActivities,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error in activities GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/crm/cards/[id]/activities
 * Create a manual activity log entry
 *
 * Body:
 * - activity_type: string (required)
 * - description: string (optional)
 * - old_value: object (optional)
 * - new_value: object (optional)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.activity_type) {
      return NextResponse.json(
        { error: "activity_type is required" },
        { status: 400 },
      );
    }

    // Verify card belongs to client
    const { data: card, error: cardError } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Create activity
    const { data: activity, error } = await supabase
      .from("crm_activity_log")
      .insert({
        client_id: profile.client_id,
        card_id: id,
        activity_type: body.activity_type,
        description: body.description || null,
        old_value: body.old_value || null,
        new_value: body.new_value || null,
        performed_by: user.id,
        is_automated: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error: any) {
    console.error("Error in activities POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
