import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateText } from "ai";
import { getSharedGatewayConfig } from "@/lib/ai-gateway/config";
import {
    getGatewayProvider,
    isValidProvider,
    type SupportedProvider,
} from "@/lib/ai-gateway/providers";

export const dynamic = "force-dynamic";

async function requireAdmin(supabase: ReturnType<typeof createServerClient>) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            }),
        };
    }

    const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "User profile not found" }, {
                status: 404,
            }),
        };
    }

    if (!profile.is_active) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Account disabled" }, {
                status: 403,
            }),
        };
    }

    if (profile.role !== "admin") {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Admin access required" }, {
                status: 403,
            }),
        };
    }

    return { ok: true as const };
}

const normalizeTestError = (rawMessage: string) => {
    const msg = (rawMessage || "").trim();

    if (!msg) {
        return "Erro desconhecido ao testar o modelo.";
    }

    const lower = msg.toLowerCase();

    if (
        lower.includes("api key") || lower.includes("unauthorized") ||
        lower.includes("invalid api key")
    ) {
        return "API key inválida ou não autorizada para este provider.";
    }

    if (
        lower.includes("does not exist") || lower.includes("not found") ||
        lower.includes("model") && lower.includes("access")
    ) {
        return "Modelo inexistente ou sem acesso (nome errado ou key sem permissão).";
    }

    if (lower.includes("rate limit") || lower.includes("too many requests")) {
        return "Rate limit atingido (muitas requisições).";
    }

    if (lower.includes("timeout") || lower.includes("timed out")) {
        return "Timeout ao chamar o provider.";
    }

    return msg;
};

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();

        const adminCheck = await requireAdmin(supabase);
        if (!adminCheck.ok) return adminCheck.response;

        const body = await request.json().catch(() => ({}));
        const { id, gatewayIdentifier, provider, modelName } = body ?? {};

        // Resolve target model/provider
        let resolvedGatewayIdentifier: string | null =
            typeof gatewayIdentifier === "string"
                ? gatewayIdentifier.trim()
                : null;

        if (!resolvedGatewayIdentifier && typeof id === "string" && id.trim()) {
            const { data: row, error } = await supabase
                .from("ai_models_registry")
                .select("gateway_identifier, is_active")
                .eq("id", id.trim())
                .maybeSingle();

            if (error) {
                return NextResponse.json({
                    error: "Erro ao buscar modelo no registry",
                }, { status: 500 });
            }

            if (!row) {
                return NextResponse.json({ error: "Modelo não encontrado" }, {
                    status: 404,
                });
            }

            if (row.is_active !== true) {
                return NextResponse.json({ error: "Modelo está inativo" }, {
                    status: 400,
                });
            }

            resolvedGatewayIdentifier =
                String(row.gateway_identifier || "").trim() || null;
        }

        if (!resolvedGatewayIdentifier) {
            const p = typeof provider === "string" ? provider.trim() : "";
            const m = typeof modelName === "string" ? modelName.trim() : "";
            if (p && m) resolvedGatewayIdentifier = `${p}/${m}`;
        }

        if (!resolvedGatewayIdentifier) {
            return NextResponse.json(
                {
                    error:
                        "Informe id ou gatewayIdentifier (provider/model) para testar.",
                },
                { status: 400 },
            );
        }

        const [p, ...rest] = resolvedGatewayIdentifier.split("/");
        const model = rest.join("/");

        if (!p || !model) {
            return NextResponse.json(
                {
                    error:
                        "gatewayIdentifier inválido. Use o formato provider/model.",
                },
                { status: 400 },
            );
        }

        if (!isValidProvider(p)) {
            return NextResponse.json(
                { error: `Provider não suportado: ${p}` },
                { status: 400 },
            );
        }

        const sharedConfig = await getSharedGatewayConfig();
        if (!sharedConfig) {
            return NextResponse.json(
                {
                    error:
                        "AI Gateway não configurado (shared_gateway_config ausente).",
                },
                { status: 400 },
            );
        }

        const providerKey = sharedConfig.providerKeys[p];
        if (!providerKey) {
            return NextResponse.json(
                {
                    error:
                        `API do provider ${p} não configurada no Setup (Vault).`,
                },
                { status: 400 },
            );
        }

        const providerInstance = getGatewayProvider(
            p as SupportedProvider,
            providerKey,
        );

        const startTime = Date.now();

        try {
            const result = await generateText({
                model: providerInstance(model),
                messages: [
                    {
                        role: "user",
                        content: 'Responda apenas com "OK".',
                    },
                ],
            });

            const latencyMs = Date.now() - startTime;

            return NextResponse.json({
                ok: true,
                provider: p,
                model,
                latencyMs,
                outputPreview: String(result.text || "").slice(0, 50),
                info:
                    'Observação: o teste não envia "temperature" (compatível com modelos de reasoning).',
                requestId: (result as any)?.requestId,
                finishReason: (result as any)?.finishReason,
                usage: (result as any)?.usage,
            });
        } catch (err: any) {
            const latencyMs = Date.now() - startTime;
            const rawMessage = err?.message || String(err);
            const message = normalizeTestError(rawMessage);

            return NextResponse.json(
                {
                    ok: false,
                    provider: p,
                    model,
                    latencyMs,
                    error: message,
                    details: rawMessage,
                },
                { status: 400 },
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Erro interno do servidor" },
            { status: 500 },
        );
    }
}
