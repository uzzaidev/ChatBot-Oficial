/**
 * API Route: /api/agents/[id]/versions/[versionId]/restore
 *
 * POST - Restore an agent to a specific version
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST - Restore a version
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
): Promise<NextResponse> => {
  try {
    const { id: agentId, versionId } = await params;

    // Verify user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Verify agent belongs to user's client
    const { data: currentAgent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !currentAgent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 },
      );
    }

    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from("agent_versions")
      .select("*")
      .eq("id", versionId)
      .eq("agent_id", agentId)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Versão não encontrada" },
        { status: 404 },
      );
    }

    // Get the latest version number for the new backup
    const { data: latestVersion } = await supabase
      .from("agent_versions")
      .select("version_number")
      .eq("agent_id", agentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersionNumber = (latestVersion?.version_number ?? 0) + 1;

    // Create a backup of current state before restoring
    const currentSnapshot = {
      ...currentAgent,
      created_at: undefined,
      updated_at: undefined,
    };

    await supabase.from("agent_versions").insert({
      agent_id: agentId,
      version_number: newVersionNumber,
      snapshot: currentSnapshot,
      change_description: `Backup antes de restaurar para v${version.version_number}`,
      created_by: user.id,
    });

    // Extract the snapshot and prepare update data
    const snapshot = version.snapshot as Record<string, unknown>;

    // Fields to restore (exclude system fields)
    const updateData = {
      name: snapshot.name as string,
      slug: snapshot.slug as string,
      avatar_emoji: snapshot.avatar_emoji as string | null,
      description: snapshot.description as string | null,
      response_tone: snapshot.response_tone as string,
      response_style: snapshot.response_style as string,
      language: snapshot.language as string,
      use_emojis: snapshot.use_emojis as boolean,
      max_response_length: snapshot.max_response_length as number,
      role_description: snapshot.role_description as string | null,
      primary_goal: snapshot.primary_goal as string | null,
      forbidden_topics: snapshot.forbidden_topics as string[] | null,
      always_mention: snapshot.always_mention as string[] | null,
      greeting_message: snapshot.greeting_message as string | null,
      fallback_message: snapshot.fallback_message as string | null,
      enable_human_handoff: snapshot.enable_human_handoff as boolean,
      enable_document_search: snapshot.enable_document_search as boolean,
      enable_audio_response: snapshot.enable_audio_response as boolean,
      enable_tools: snapshot.enable_tools as boolean,
      enable_rag: snapshot.enable_rag as boolean,
      rag_threshold: snapshot.rag_threshold as number | null,
      rag_max_results: snapshot.rag_max_results as number | null,
      primary_provider: snapshot.primary_provider as string,
      openai_model: snapshot.openai_model as string | null,
      groq_model: snapshot.groq_model as string | null,
      temperature: snapshot.temperature as number,
      max_tokens: snapshot.max_tokens as number,
      max_chat_history: snapshot.max_chat_history as number,
      batching_delay_seconds: snapshot.batching_delay_seconds as number | null,
      message_delay_ms: snapshot.message_delay_ms as number | null,
      message_split_enabled: snapshot.message_split_enabled as boolean,
      compiled_system_prompt: snapshot.compiled_system_prompt as string | null,
      compiled_formatter_prompt:
        snapshot.compiled_formatter_prompt as string | null,
      updated_at: new Date().toISOString(),
    };

    // Restore the agent
    const { data: restoredAgent, error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", agentId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "[POST /api/agents/[id]/versions/[versionId]/restore] Update error:",
        updateError,
      );
      return NextResponse.json(
        { error: "Erro ao restaurar versão" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Agente restaurado para versão ${version.version_number}`,
      agent: restoredAgent,
      backupVersion: newVersionNumber,
    });
  } catch (error) {
    console.error(
      "[POST /api/agents/[id]/versions/[versionId]/restore] Unexpected error:",
      error,
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};
