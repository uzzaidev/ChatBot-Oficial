import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { getClientConfig } from "@/lib/config";
import { sendTemplateMessage } from "@/lib/meta";
import type { MessageTemplate, SendTemplateRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    templateId: string;
  }>;
}

/**
 * POST /api/templates/[templateId]/send
 * Send an APPROVED template message to a WhatsApp user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;

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

    // Parse request body
    const body: SendTemplateRequest = await request.json();
    const { phone, parameters } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone format (basic check)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Must be 10-15 digits without + or spaces." },
        { status: 400 }
      );
    }

    // Get template from database
    const getSql = `
      SELECT 
        id,
        client_id,
        name,
        language,
        status,
        components
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

    // Validate status is APPROVED
    if (template.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Cannot send template with status: ${template.status}. Only APPROVED templates can be sent.` },
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
    if (!config.apiKeys.metaAccessToken || !config.apiKeys.metaPhoneNumberId) {
      return NextResponse.json(
        { error: "Meta credentials not configured for this client" },
        { status: 400 }
      );
    }

    try {
      // Send template message via Meta API
      const result = await sendTemplateMessage(
        phone,
        template.name,
        template.language,
        parameters,
        config
      );

      // Log the message in the database (optional - for tracking)
      try {
        const logSql = `
          INSERT INTO public.messages (
            client_id,
            phone,
            content,
            type,
            direction,
            status,
            timestamp,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        `;

        const metadata = {
          template_id: template.id,
          template_name: template.name,
          template_components: template.components, // Include template structure for display
          whatsapp_message_id: result.messageId,
          parameters,
        };

        await query(logSql, [
          clientId,
          phone,
          `Template: ${template.name}`,
          "text",
          "outgoing",
          "sent",
          JSON.stringify(metadata),
        ]);
      } catch (logError) {
        // Log error but don't fail the request
        console.error("Failed to log template message:", logError);
      }

      return NextResponse.json({
        message: "Template message sent successfully",
        messageId: result.messageId,
        template: {
          id: template.id,
          name: template.name,
        },
      });
    } catch (metaError: any) {
      console.error("Meta API error:", metaError);

      // Return detailed error from Meta
      return NextResponse.json(
        {
          error: "Failed to send template message",
          details: metaError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending template message:", error);
    return NextResponse.json(
      { error: "Failed to send template message" },
      { status: 500 }
    );
  }
}
