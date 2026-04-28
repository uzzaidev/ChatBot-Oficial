import { callDirectAI } from "@/lib/direct-ai-client";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import type { CoreMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/test-model
 *
 * Testa se um modelo de IA está configurado corretamente usando credenciais Vault
 *
 * Body:
 * {
 *   provider: 'openai' | 'groq',
 *   model: string
 * }
 *
 * Retorna:
 * {
 *   success: true,
 *   message: string,
 *   latency_ms: number,
 *   response: string
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { provider, model } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { error: "provider e model são obrigatórios" },
        { status: 400 },
      );
    }

    if (provider !== "openai" && provider !== "groq") {
      return NextResponse.json(
        { error: 'provider deve ser "openai" ou "groq"' },
        { status: 400 },
      );
    }

    const supabase = await createRouteHandlerClient(request as any);

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar client_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const clientId = profile.client_id;

    // Mensagem de teste simples
    const testMessages: CoreMessage[] = [
      {
        role: "system",
        content: "Você é um assistente de teste. Responda de forma concisa.",
      },
      {
        role: "user",
        content: 'Responda apenas: "Teste OK"',
      },
    ];

    try {
      // Test using direct Vault credentials
      const response = await callDirectAI({
        clientId,
        clientConfig: {
          id: clientId,
          name: "test-model",
          primaryModelProvider: provider,
          openaiModel: provider === "openai" ? model : undefined,
          groqModel: provider === "groq" ? model : undefined,
        },
        messages: testMessages,
        settings: {
          temperature: 0.5,
          maxTokens: 50,
        },
        skipUsageLogging: true, // Don't log test calls
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      return NextResponse.json({
        success: true,
        message: `✅ Modelo ${provider.toUpperCase()} funcionando corretamente!`,
        latency_ms: latency,
        response: response.text,
        model,
        provider,
        usage: {
          prompt_tokens: response.usage.promptTokens,
          completion_tokens: response.usage.completionTokens,
          total_tokens: response.usage.totalTokens,
        },
      });
    } catch (error: any) {
      const errorMessage: string = error?.message || "Unknown error";
      const errorCode: string | undefined =
        error?.code || error?.error?.code || error?.cause?.code;
      const errorStatus: number | undefined =
        error?.status || error?.statusCode || error?.response?.status;
      const errorType: string | undefined =
        error?.type || error?.error?.type || error?.cause?.type;
      const lower = errorMessage.toLowerCase();

      const baseDetails = {
        raw_error: errorMessage,
        error_code: errorCode,
        error_status: errorStatus,
        error_type: errorType,
        provider,
        model,
      };

      // Credenciais Vault ausentes
      if (
        lower.includes("vault") ||
        lower.includes("credentials not found") ||
        lower.includes("api key not configured") ||
        lower.includes("no api key")
      ) {
        return NextResponse.json({
          success: false,
          category: "credentials_missing",
          error: "Credenciais não configuradas",
          message: `Nenhuma API Key do ${provider.toUpperCase()} foi encontrada no Vault. Configure em /dashboard/settings.`,
          details: baseDetails,
        });
      }

      // API Key inválida
      if (
        lower.includes("invalid_api_key") ||
        lower.includes("incorrect api key") ||
        lower.includes("invalid api key") ||
        errorStatus === 401
      ) {
        return NextResponse.json({
          success: false,
          category: "invalid_api_key",
          error: "API Key inválida",
          message: `A API Key do ${provider.toUpperCase()} está incorreta ou foi revogada.`,
          details: baseDetails,
        });
      }

      // Modelo não encontrado / não disponível
      if (
        lower.includes("model_not_found") ||
        lower.includes("does not exist") ||
        (lower.includes("the model") && lower.includes("not found")) ||
        lower.includes("decommissioned")
      ) {
        return NextResponse.json({
          success: false,
          category: "model_not_found",
          error: "Modelo não encontrado",
          message: `O modelo "${model}" não existe, foi descontinuado ou não está disponível para esta conta ${provider.toUpperCase()}.`,
          details: baseDetails,
        });
      }

      // Sem acesso ao modelo (tier/plano)
      if (
        lower.includes("does not have access") ||
        lower.includes("not authorized") ||
        lower.includes("access denied") ||
        errorStatus === 403
      ) {
        return NextResponse.json({
          success: false,
          category: "access_denied",
          error: "Sem acesso ao modelo",
          message: `Esta conta ${provider.toUpperCase()} não tem permissão para usar "${model}". Pode requerer um tier ou aprovação específica.`,
          details: baseDetails,
        });
      }

      // Parâmetro incompatível com o modelo (ex: reasoning_effort, temperature, max_tokens)
      if (
        lower.includes("unsupported parameter") ||
        lower.includes("unrecognized parameter") ||
        lower.includes("not supported") ||
        lower.includes("invalid parameter") ||
        lower.includes("unknown parameter") ||
        lower.includes("doesn't support") ||
        lower.includes("does not support")
      ) {
        // Tentar extrair nome do parâmetro problemático
        const paramMatch =
          errorMessage.match(/parameter[:\s'"]+([a-z_]+)/i) ||
          errorMessage.match(
            /'([a-z_]+)'\s+(?:is\s+)?(?:not\s+supported|unsupported)/i,
          );
        const param = paramMatch?.[1];

        return NextResponse.json({
          success: false,
          category: "incompatible_parameter",
          error: "Parâmetro incompatível",
          message: param
            ? `O parâmetro "${param}" não é suportado por "${model}". Ajuste a configuração do agente.`
            : `Algum parâmetro enviado não é suportado por "${model}". Veja os detalhes abaixo.`,
          details: baseDetails,
        });
      }

      // Reasoning effort específico
      if (
        lower.includes("reasoning_effort") ||
        lower.includes("reasoning effort")
      ) {
        return NextResponse.json({
          success: false,
          category: "incompatible_reasoning_effort",
          error: "Reasoning effort inválido",
          message: `O nível de "reasoning_effort" configurado não é aceito por "${model}". Modelos não-reasoning não aceitam esse parâmetro; modelos reasoning aceitam apenas certos níveis.`,
          details: baseDetails,
        });
      }

      // Context length / token limit
      if (
        lower.includes("context_length_exceeded") ||
        lower.includes("maximum context length") ||
        lower.includes("context window") ||
        lower.includes("too many tokens")
      ) {
        return NextResponse.json({
          success: false,
          category: "context_length",
          error: "Contexto excedido",
          message: `O modelo "${model}" não suporta o tamanho de contexto enviado.`,
          details: baseDetails,
        });
      }

      // Reasoning budget exhausted (do nosso próprio guard)
      if (
        lower.includes("reasoning budget") ||
        lower.includes("orçamento de raciocínio") ||
        lower.includes("orçamento de reasoning")
      ) {
        return NextResponse.json({
          success: false,
          category: "reasoning_exhausted",
          error: "Orçamento de reasoning esgotado",
          message: `O modelo gastou todos os tokens no raciocínio interno e não retornou texto visível. Aumente max_tokens ou reduza reasoning_effort.`,
          details: baseDetails,
        });
      }

      // Quota / billing
      if (
        lower.includes("insufficient_quota") ||
        lower.includes("quota") ||
        lower.includes("billing") ||
        lower.includes("payment")
      ) {
        return NextResponse.json({
          success: false,
          category: "quota_exceeded",
          error: "Quota / billing",
          message: `Conta ${provider.toUpperCase()} sem créditos ou com problema de billing.`,
          details: baseDetails,
        });
      }

      // Rate limit
      if (
        lower.includes("rate_limit") ||
        lower.includes("rate limit") ||
        errorStatus === 429
      ) {
        return NextResponse.json({
          success: false,
          category: "rate_limit",
          error: "Rate limit",
          message:
            "Muitas requisições. Aguarde alguns segundos e tente novamente.",
          details: baseDetails,
        });
      }

      // Erro de rede / timeout
      if (
        lower.includes("econnrefused") ||
        lower.includes("etimedout") ||
        lower.includes("network") ||
        lower.includes("fetch failed") ||
        lower.includes("timeout")
      ) {
        return NextResponse.json({
          success: false,
          category: "network",
          error: "Erro de rede",
          message: `Não foi possível conectar à API do ${provider.toUpperCase()}. Verifique conectividade ou status do provider.`,
          details: baseDetails,
        });
      }

      // Erro genérico do provider (5xx)
      if (errorStatus && errorStatus >= 500) {
        return NextResponse.json({
          success: false,
          category: "provider_error",
          error: `Erro do provider (HTTP ${errorStatus})`,
          message: `O ${provider.toUpperCase()} retornou um erro interno. Tente novamente em alguns instantes.`,
          details: baseDetails,
        });
      }

      // Fallback: retornar a mensagem real do provider
      return NextResponse.json({
        success: false,
        category: "unknown",
        error: "Erro ao testar modelo",
        message: errorMessage,
        details: baseDetails,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
