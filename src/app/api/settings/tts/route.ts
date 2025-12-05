import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/tts
 * Retorna configuração TTS do cliente atual
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Obter usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obter client_id do usuário
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Obter configuração TTS do cliente
    const { data: client, error } = await supabase
      .from("clients")
      .select(
        "tts_enabled, tts_provider, tts_model, tts_voice, tts_speed, tts_auto_offer",
      )
      .eq("id", profile.client_id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch config" }, {
        status: 500,
      });
    }

    return NextResponse.json({
      config: {
        tts_enabled: client?.tts_enabled || false,
        tts_provider: client?.tts_provider || "openai",
        tts_model: client?.tts_model || "tts-1-hd",
        tts_voice: client?.tts_voice || "alloy",
        tts_speed: client?.tts_speed || 1.0,
        tts_auto_offer: client?.tts_auto_offer ?? true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/tts
 * Atualiza configuração TTS do cliente atual
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Obter usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obter client_id do usuário
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      tts_enabled,
      tts_provider,
      tts_model,
      tts_voice,
      tts_speed,
      tts_auto_offer,
    } = body;

    // Validações
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    if (tts_voice && !validVoices.includes(tts_voice)) {
      return NextResponse.json({ error: "Invalid voice" }, { status: 400 });
    }

    if (tts_speed && (tts_speed < 0.25 || tts_speed > 4.0)) {
      return NextResponse.json(
        { error: "Speed must be between 0.25 and 4.0" },
        { status: 400 },
      );
    }

    const validModels = ["tts-1", "tts-1-hd"];
    if (tts_model && !validModels.includes(tts_model)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    // Atualizar configuração
    const { error } = await supabase
      .from("clients")
      .update({
        tts_enabled: tts_enabled ?? false,
        tts_provider: tts_provider || "openai",
        tts_model: tts_model || "tts-1-hd",
        tts_voice: tts_voice || "alloy",
        tts_speed: tts_speed || 1.0,
        tts_auto_offer: tts_auto_offer ?? true,
      })
      .eq("id", profile.client_id);

    if (error) {
      return NextResponse.json({ error: "Failed to update config" }, {
        status: 500,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
