/**
 * API Route: /api/agents/[id]/qa/reports/[reportId]
 *
 * Deletes a saved QA report (tenant-scoped).
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; reportId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, reportId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("agent_qa_reports")
      .delete()
      .eq("id", reportId)
      .eq("agent_id", id)
      .eq("client_id", profile.client_id);

    if (error) {
      console.error("[DELETE qa/reports] Error:", error);
      return NextResponse.json(
        { error: "Failed to delete QA report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE qa/reports] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
