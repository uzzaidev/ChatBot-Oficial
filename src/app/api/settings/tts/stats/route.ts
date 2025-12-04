import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/tts/stats
 * Retorna estatísticas de uso TTS do cliente atual
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

    const clientId = profile.client_id;

    // Calcular início do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total de áudios enviados este mês
    const { count: audiosThisMonth } = await supabase
      .from("tts_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("event_type", "generated")
      .gte("created_at", startOfMonth.toISOString());

    // 2. Total de áudios do cache
    const { count: cacheHits } = await supabase
      .from("tts_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("event_type", "cached")
      .gte("created_at", startOfMonth.toISOString());

    const totalRequests = (audiosThisMonth || 0) + (cacheHits || 0);
    const cacheHitRate = totalRequests > 0
      ? Math.round((cacheHits || 0) / totalRequests * 100)
      : 0;

    // 3. Custo estimado (OpenAI TTS: $15 por 1M caracteres)
    const { data: usageLogs } = await supabase
      .from("tts_usage_logs")
      .select("text_length, event_type")
      .eq("client_id", clientId)
      .gte("created_at", startOfMonth.toISOString());

    let totalChars = 0;
    let cachedChars = 0;

    usageLogs?.forEach((log) => {
      if (log.event_type === "generated") {
        totalChars += log.text_length;
      } else if (log.event_type === "cached") {
        cachedChars += log.text_length;
      }
    });

    // Custo: $15 por 1M caracteres
    const estimatedCost = (totalChars / 1000000) * 15;
    const cacheSavings = (cachedChars / 1000000) * 15;

    return NextResponse.json({
      stats: {
        audiosThisMonth: audiosThisMonth || 0,
        cacheHitRate,
        estimatedCost: Number(estimatedCost.toFixed(2)),
        cacheSavings: Number(cacheSavings.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("[TTS Stats] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
