import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ValidateSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
});

const getUserIdFromRequest = async (request: NextRequest) => {
  const supabase = await createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const clientId = await getClientIdFromSession(request);
    const userId = await getUserIdFromRequest(request);
    if (!clientId || !userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = ValidateSchema.parse(await request.json().catch(() => ({})));
    const supabase = await createRouteHandlerClient(request);

    const { data: current, error: getError } = await (supabase as any)
      .from("ground_truth")
      .select("id, validated_by, confidence")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (getError || !current) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const validatedBy = Array.isArray(current.validated_by)
      ? [...current.validated_by]
      : [];
    if (!validatedBy.includes(userId)) validatedBy.push(userId);

    const { data, error } = await (supabase as any)
      .from("ground_truth")
      .update({
        validated_by: validatedBy,
        confidence: body.confidence ?? current.confidence,
      })
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
    console.error("[POST /api/ground-truth/[id]/validate]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
