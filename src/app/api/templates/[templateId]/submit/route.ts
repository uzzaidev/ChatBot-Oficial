import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { getClientConfig } from "@/lib/config";
import { createMetaTemplate } from "@/lib/meta";
import type { MessageTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    templateId: string;
  };
}

/**
 * POST /api/templates/[templateId]/submit
 * Submit a DRAFT template to Meta for approval
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = params;

    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Get template from database
    const getSql = `
      SELECT 
        id,
        client_id,
        waba_id,
        name,
        category,
        language,
        components,
        status
      FROM public.message_templates
      WHERE id = $1 AND client_id = $2
    `;

    const getResult = await query<MessageTemplate>(getSql, [templateId, clientId]);

    if (getResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const template = getResult.rows[0];

    // Validate status is DRAFT
    if (template.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Cannot submit template with status: ${template.status}. Only DRAFT templates can be submitted.` },
        { status: 400 }
      );
    }

    // Get client configuration (for Meta API credentials)
    const config = await getClientConfig(clientId);

    if (!config) {
      return NextResponse.json(
        { error: "Client configuration not found" },
        { status: 500 }
      );
    }

    // Validate Meta credentials
    if (!config.apiKeys.metaAccessToken) {
      return NextResponse.json(
        { error: "Meta Access Token not configured for this client" },
        { status: 400 }
      );
    }

    try {
      // Submit template to Meta API
      const metaResponse = await createMetaTemplate(
        {
          name: template.name,
          category: template.category,
          language: template.language,
          components: template.components,
        },
        template.waba_id,
        config
      );

      // Update template in database with Meta template ID and status
      const updateSql = `
        UPDATE public.message_templates
        SET 
          meta_template_id = $1,
          status = $2,
          updated_at = NOW()
        WHERE id = $3 AND client_id = $4
        RETURNING 
          id,
          client_id,
          created_by,
          meta_template_id,
          waba_id,
          name,
          category,
          language,
          components,
          status,
          rejection_reason,
          created_at,
          updated_at
      `;

      const updateResult = await query<MessageTemplate>(updateSql, [
        metaResponse.id,
        metaResponse.status, // Usually 'PENDING'
        templateId,
        clientId,
      ]);

      if (updateResult.rowCount === 0) {
        return NextResponse.json(
          { error: "Failed to update template status" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Template submitted successfully to Meta for approval",
        template: updateResult.rows[0],
        meta: {
          template_id: metaResponse.id,
          status: metaResponse.status,
        },
      });
    } catch (metaError: any) {
      console.error("Meta API error:", metaError);

      // Return detailed error from Meta
      return NextResponse.json(
        {
          error: "Failed to submit template to Meta",
          details: metaError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error submitting template:", error);
    return NextResponse.json(
      { error: "Failed to submit template" },
      { status: 500 }
    );
  }
}
