import { getClientIdFromSession } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const buildTaskTitle = (rootCauseType: string, message: string): string => {
  const scope =
    rootCauseType === "prompt"
      ? "Prompt"
      : rootCauseType === "flow"
        ? "Fluxo"
        : rootCauseType === "system"
          ? "Sistema"
          : "Indefinido";

  return `[${scope}] Corrigir caso de suporte: ${message.slice(0, 80)}`;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceRoleClient() as any;

    const { data: existingCase, error: caseError } = await supabase
      .from("support_cases")
      .select("*")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (caseError || !existingCase) {
      return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    }

    const task = {
      id: crypto.randomUUID(),
      type: existingCase.root_cause_type,
      title: buildTaskTitle(existingCase.root_cause_type, existingCase.user_message),
      status: "open",
      created_at: new Date().toISOString(),
    };

    const metadata = {
      ...(existingCase.metadata || {}),
      correction_task: task,
    };

    const { data, error } = await supabase
      .from("support_cases")
      .update({
        status: "in_progress",
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("client_id", clientId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, task, data });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_server_error", detail: String(error) },
      { status: 500 },
    );
  }
}
