// src/app/api/test/tts-voices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchElevenLabsVoices } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";

/**
 * GET /api/test/tts-voices?provider=elevenlabs
 * Lista vozes disponíveis do provider
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") || "openai";

  if (provider === "elevenlabs") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY in environment" }, { status: 500 });
    }
    try {
      const voices = await fetchElevenLabsVoices(apiKey);
      return NextResponse.json({ voices });
    } catch (e) {
      return NextResponse.json({ error: "Failed to fetch ElevenLabs voices" }, { status: 500 });
    }
  }
  // OpenAI: vozes fixas
  return NextResponse.json({
    voices: [
      { id: 'alloy', name: 'Alloy', description: 'Neutro e versátil' },
      { id: 'echo', name: 'Echo', description: 'Masculino e claro' },
      { id: 'fable', name: 'Fable', description: 'Feminino e suave' },
      { id: 'onyx', name: 'Onyx', description: 'Grave e profundo' },
      { id: 'nova', name: 'Nova', description: 'Feminino e energético' },
      { id: 'shimmer', name: 'Shimmer', description: 'Suave e caloroso' }
    ]
  });
}
