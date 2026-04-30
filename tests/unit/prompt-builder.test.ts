import { compileSystemPrompt } from "@/lib/prompt-builder";
import type { Agent } from "@/lib/types";
import { describe, expect, it } from "vitest";

const baseAgent = {
  name: "Atendente",
  response_tone: "professional",
  response_style: "helpful",
  language: "pt-BR",
  use_emojis: false,
  max_response_length: "medium",
  role_description: "Atende clientes no WhatsApp.",
  primary_goal: "Responder com clareza.",
  forbidden_topics: ["politica"],
  always_mention: [],
  greeting_message: null,
  fallback_message: null,
  enable_human_handoff: false,
  enable_document_search: false,
  enable_audio_response: false,
  enable_tools: true,
  enable_rag: true,
  rag_threshold: 0.7,
  rag_max_results: 3,
  primary_provider: "openai",
  openai_model: "gpt-4o",
  groq_model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  max_tokens: 2000,
  max_chat_history: 15,
  batching_delay_seconds: 10,
  message_delay_ms: 1000,
  message_split_enabled: false,
  business_hours_enabled: false,
  business_hours_timezone: "America/Sao_Paulo",
  business_hours_schedule: [],
  business_hours_off_message: null,
  compiled_system_prompt: null,
  compiled_formatter_prompt: null,
} as Agent;

describe("prompt-builder", () => {
  it("compiles structured sections without hardcoding disabled tool names", () => {
    const prompt = compileSystemPrompt({
      ...baseAgent,
      prompt_sections: {
        business_context: "A empresa vende planos de suporte.",
        response_rules: "Pergunte objetivo antes de oferecer plano.",
        boundaries: "Nao prometa desconto sem autorizacao.",
      },
    });

    expect(prompt).toContain("<identity>");
    expect(prompt).toContain("<business_context>");
    expect(prompt).toContain("A empresa vende planos de suporte.");
    expect(prompt).not.toContain("buscar_documento");
    expect(prompt).not.toContain("transferir_atendimento");
  });

  it("uses legacy role_description when structured identity is empty", () => {
    const prompt = compileSystemPrompt(baseAgent);

    expect(prompt).toContain("Atende clientes no WhatsApp.");
  });
});
