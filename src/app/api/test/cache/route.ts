/**
 * 🧪 CACHE TEST ENDPOINT - PROMPT CACHING
 *
 * Tests Vercel AI Gateway PROMPT CACHE by sending 3 requests with:
 * - SAME system prompt + RAG context (~800 tokens)
 * - DIFFERENT user questions
 *
 * Expected behavior:
 * - Request 1: cachedInputTokens = 0 (first time, no cache)
 * - Request 2: cachedInputTokens > 0 (system+context CACHED!)
 * - Request 3: cachedInputTokens > 0 (system+context CACHED!)
 *
 * This tests PROMPT CACHING (economiza tokens), not response caching.
 */

import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGatewayInstance } from "@/lib/ai-gateway/providers";
import { getSharedGatewayConfig } from "@/lib/ai-gateway/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("\n🧪 ========== CACHE TEST START ==========\n");

    // Get gateway config
    const gatewayConfig = await getSharedGatewayConfig();

    if (!gatewayConfig?.gatewayApiKey) {
      return NextResponse.json(
        { error: "Gateway API key not configured" },
        { status: 500 }
      );
    }

    const gateway = createGatewayInstance(gatewayConfig.gatewayApiKey);

    // Test configuration - COMPLEX PROMPT for cache testing
    const testModel = "openai/gpt-4o-mini";

    // Long system prompt (~500 tokens) - will be CACHED in requests 2 & 3
    const longSystemPrompt = `Você é um assistente especializado em atendimento ao cliente de uma empresa de tecnologia.

DIRETRIZES DE ATENDIMENTO:
- Sempre seja educado e profissional
- Use linguagem clara e acessível
- Confirme entendimento das solicitações
- Ofereça soluções práticas e detalhadas
- Se não souber algo, seja honesto e ofereça alternativas

CONHECIMENTO DA EMPRESA:
Nossa empresa oferece os seguintes serviços:
1. Suporte Técnico - Disponível 24/7 para resolver problemas técnicos
2. Consultoria - Análise e recomendações para otimização de sistemas
3. Treinamento - Capacitação de equipes em tecnologias modernas
4. Desenvolvimento - Criação de soluções customizadas

HORÁRIOS DE ATENDIMENTO:
- Suporte Técnico: 24 horas por dia, 7 dias por semana
- Consultoria: Segunda a Sexta, 9h às 18h
- Treinamento: Agendamento prévio necessário
- Desenvolvimento: Sob demanda

POLÍTICA DE PREÇOS:
- Suporte Técnico: R$ 150/hora
- Consultoria: R$ 300/hora
- Treinamento: R$ 500/dia
- Desenvolvimento: Sob orçamento

CONTATOS:
- Email: suporte@empresa.com
- Telefone: (11) 9999-9999
- WhatsApp: (11) 9999-9999

Lembre-se de sempre coletar informações relevantes antes de sugerir soluções.`;

    // RAG context (~300 tokens) - will also be CACHED
    const ragContext = `

INFORMAÇÕES ADICIONAIS DO CONHECIMENTO BASE:

FAQ - Perguntas Frequentes:
Q: Como funciona o suporte técnico?
A: Nosso suporte funciona 24/7. Você pode abrir um chamado por email, telefone ou WhatsApp e será atendido em até 30 minutos.

Q: Qual a diferença entre consultoria e suporte?
A: Suporte é para resolver problemas imediatos. Consultoria é para análise estratégica e planejamento de melhorias.

Q: Vocês atendem empresas de qualquer tamanho?
A: Sim! Atendemos desde pequenas startups até grandes corporações.

CASOS DE SUCESSO:
- Empresa A: Redução de 70% no tempo de resposta
- Empresa B: Economia de R$ 50mil/mês em infraestrutura
- Empresa C: Aumento de 40% na produtividade da equipe`;

    // Different user questions for each request (but system/context stays SAME)
    const userQuestions = [
      "Qual o horário de funcionamento do suporte técnico?",
      "Quanto custa uma consultoria?",
      "Como faço para contratar treinamento?"
    ];

    const results = [];

    // Run 3 requests with DIFFERENT questions but SAME system+context
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- Request ${i}/3 ---`);
      console.log(`Question: "${userQuestions[i - 1]}"`);

      const startTime = Date.now();

      const testMessages = [
        {
          role: "system" as const,
          content: longSystemPrompt + ragContext, // ~800 tokens - should be CACHED in req 2 & 3
        },
        {
          role: "user" as const,
          content: userQuestions[i - 1], // Different question each time
        },
      ];

      const result = await generateText({
        model: gateway(testModel),
        messages: testMessages,
        temperature: 0, // 🔥 CRITICAL for cache
        experimental_telemetry: { isEnabled: true },
      });

      const latencyMs = Date.now() - startTime;
      const headers = result.response?.headers || {};
      const usage = result.usage;

      const cacheStatus = headers["x-vercel-cache"] || "UNKNOWN";

      console.log(`Request ${i} Results:`, {
        cacheStatus,
        latencyMs,
        inputTokens: usage?.inputTokens || 0,
        cachedInputTokens: usage?.cachedInputTokens || 0, // 🎯 KEY METRIC!
        outputTokens: usage?.outputTokens || 0,
        cachePercentage: usage?.inputTokens
          ? Math.round((usage.cachedInputTokens || 0) / (usage.inputTokens + (usage.cachedInputTokens || 0)) * 100)
          : 0,
      });

      results.push({
        request: i,
        question: userQuestions[i - 1],
        cacheStatus,
        latencyMs,
        text: result.text,
        usage: {
          inputTokens: usage?.inputTokens || 0,
          outputTokens: usage?.outputTokens || 0,
          totalTokens: usage?.totalTokens || 0,
          cachedInputTokens: usage?.cachedInputTokens || 0, // 🎯 STORE THIS!
          reasoningTokens: usage?.reasoningTokens || 0,
        },
        allHeaders: Object.keys(headers),
        cacheHeaders: {
          "x-vercel-cache": headers["x-vercel-cache"],
          "x-vercel-ai-cache-status": headers["x-vercel-ai-cache-status"],
          "x-vercel-ai-provider": headers["x-vercel-ai-provider"],
          "x-vercel-ai-model": headers["x-vercel-ai-model"],
        },
      });

      // Delay between requests
      if (i < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
      }
    }

    console.log("\n🧪 ========== CACHE TEST END ==========\n");

    // Analysis - Focus on PROMPT CACHE (cachedInputTokens)
    const analysis = {
      expectedBehavior: {
        request1: "No cache (first time) - cachedInputTokens = 0",
        request2: "Prompt cached - cachedInputTokens > 0",
        request3: "Prompt cached - cachedInputTokens > 0",
      },
      actualBehavior: {
        request1: {
          inputTokens: results[0].usage.inputTokens,
          cachedInputTokens: results[0].usage.cachedInputTokens,
        },
        request2: {
          inputTokens: results[1].usage.inputTokens,
          cachedInputTokens: results[1].usage.cachedInputTokens,
        },
        request3: {
          inputTokens: results[2].usage.inputTokens,
          cachedInputTokens: results[2].usage.cachedInputTokens,
        },
      },
      cacheWorking:
        results[1].usage.cachedInputTokens > 0 &&
        results[2].usage.cachedInputTokens > 0,
      cacheStats: {
        totalCachedTokens: results.reduce((sum, r) => sum + r.usage.cachedInputTokens, 0),
        avgCacheRate: Math.round(
          results.reduce((sum, r) => {
            const total = r.usage.inputTokens + r.usage.cachedInputTokens;
            return sum + (total > 0 ? (r.usage.cachedInputTokens / total) * 100 : 0);
          }, 0) / results.length
        ),
        tokensSaved: results[1].usage.cachedInputTokens + results[2].usage.cachedInputTokens,
      },
      latencyComparison: {
        firstRequest: results[0].latencyMs,
        cachedRequests: [results[1].latencyMs, results[2].latencyMs],
      },
    };

    return NextResponse.json({
      success: true,
      testConfig: {
        model: testModel,
        temperature: 0,
        messageCount: 2, // system + user
        systemTokensApprox: 800, // Long prompt + RAG context
      },
      results,
      analysis,
    });
  } catch (error: any) {
    console.error("[Cache Test] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
