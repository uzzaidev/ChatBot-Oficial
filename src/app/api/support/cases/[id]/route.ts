import { getClientIdFromSession } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  status: z
    .enum(["new", "triaged", "in_progress", "resolved", "dismissed"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  root_cause_type: z.enum(["prompt", "flow", "system", "unknown"]).optional(),
  recommended_action: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = UpdateSchema.parse(await request.json());

    const supabase = createServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("support_cases")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("client_id", clientId)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "internal_server_error", detail: String(error) },
      { status: 500 },
    );
  }
}
