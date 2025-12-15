import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ApplyAIConfigBody = {
    clientIds: string[];
    primaryModelProvider?: "openai" | "groq" | "anthropic" | "google";
    openaiModel?: string;
    groqModel?: string;
};

async function requireAdmin(supabase: ReturnType<typeof createServerClient>) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Não autenticado" }, {
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
            response: NextResponse.json(
                { error: "Perfil de usuário não encontrado" },
                { status: 404 },
            ),
        };
    }

    if (!profile.is_active) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Conta desativada" }, {
                status: 403,
            }),
        };
    }

    if (profile.role !== "admin") {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: "Acesso admin obrigatório" },
                { status: 403 },
            ),
        };
    }

    return { ok: true as const };
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();

        const adminCheck = await requireAdmin(supabase);
        if (!adminCheck.ok) return adminCheck.response;

        const body = (await request.json()) as ApplyAIConfigBody;

        const clientIds = Array.isArray(body.clientIds) ? body.clientIds : [];
        if (clientIds.length === 0) {
            return NextResponse.json(
                { error: "clientIds é obrigatório" },
                { status: 400 },
            );
        }

        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (body.primaryModelProvider) {
            updateData.primary_model_provider = body.primaryModelProvider;
        }

        if (typeof body.openaiModel === "string") {
            updateData.openai_model = body.openaiModel;
        }

        if (typeof body.groqModel === "string") {
            updateData.groq_model = body.groqModel;
        }

        const hasUpdates = Object.keys(updateData).some((k) =>
            k !== "updated_at"
        );
        if (!hasUpdates) {
            return NextResponse.json(
                { error: "Nenhuma configuração para aplicar" },
                { status: 400 },
            );
        }

        const { data: updatedRows, error: updateError } = await supabase
            .from("clients")
            .update(updateData)
            .in("id", clientIds)
            .select("id");

        if (updateError) {
            return NextResponse.json(
                {
                    error: "Erro ao aplicar configuração",
                    details: updateError.message,
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            updated: (updatedRows || []).length,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Erro interno" },
            { status: 500 },
        );
    }
}
