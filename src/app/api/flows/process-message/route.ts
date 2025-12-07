import { NextRequest, NextResponse } from "next/server";
import { checkInteractiveFlow } from "@/nodes/checkInteractiveFlow";

/**
 * 🔄 Flow Message Processor
 *
 * Endpoint chamado pelo n8n para processar mensagens do WhatsApp
 * e verificar se devem ser tratadas por flows interativos.
 *
 * @phase Phase 5 - Integration with n8n
 * @created 2025-12-07
 *
 * @route POST /api/flows/process-message
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clientId, phone, content, type, interactiveResponseId } = body;

        console.log("📨 [API] Processing message for flow:", {
            clientId,
            phone,
            content: content?.substring(0, 50),
            type,
            hasInteractiveId: !!interactiveResponseId,
        });

        // Validação de campos obrigatórios
        if (!clientId || !phone) {
            console.error("❌ [API] Missing required fields:", {
                clientId,
                phone,
            });
            return NextResponse.json(
                {
                    error:
                        "Missing required fields: clientId and phone are required",
                },
                { status: 400 },
            );
        }

        // Executa o flow checker
        const result = await checkInteractiveFlow({
            clientId,
            phone,
            content: content || "",
            isInteractiveReply: type === "interactive",
            interactiveResponseId,
        });

        console.log("✅ [API] Flow check result:", {
            flowExecuted: result.flowExecuted,
            flowStarted: result.flowStarted,
            shouldContinueToAI: result.shouldContinueToAI,
            flowName: result.flowName,
        });

        // Retorna resultado para o n8n decidir o que fazer
        return NextResponse.json({
            success: true,
            flowExecuted: result.flowExecuted,
            flowStarted: result.flowStarted,
            flowName: result.flowName,
            shouldContinueToAI: result.shouldContinueToAI,
        });
    } catch (error: any) {
        console.error("❌ [API] Error processing message:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Internal server error",
                shouldContinueToAI: true, // Em caso de erro, continua para IA (fail-safe)
            },
            { status: 500 },
        );
    }
}
