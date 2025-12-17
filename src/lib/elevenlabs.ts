// src/lib/elevenlabs.ts
import fetch from "node-fetch";

export interface ElevenLabsTTSOptions {
    text: string;
    voice: string;
    speed?: number;
    model?: string;
    language?: string;
    apiKey: string;
}

export async function elevenLabsTTS(
    {
        text,
        voice,
        speed = 1.0,
        model = "eleven_monolingual_v1",
        language,
        apiKey,
    }: ElevenLabsTTSOptions,
): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
    const payload: any = {
        text,
        model_id: model,
        voice_settings: {
            stability: 0.5, // default, can be parameterized
            similarity_boost: 0.5, // default, can be parameterized
            style: 0.0, // default, can be parameterized
            use_speaker_boost: true,
            speed: speed,
        },
    };
    if (language) {
        payload.language_id = language;
    }
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(
            `ElevenLabs TTS failed: ${res.status} ${await res.text()}`,
        );
    }
    return Buffer.from(await res.arrayBuffer());
}

export async function fetchElevenLabsVoices(apiKey: string): Promise<any[]> {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) throw new Error("Failed to fetch ElevenLabs voices");
    const data = await res.json();
    return data.voices || [];
}
