import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { getClientConfig } from "@/lib/config";
import { syncTemplateStatus } from "@/lib/meta";
import type { MessageTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/templates/sync
 * Sync template statuses from Meta API
 * Fetches current approval status for all PENDING templates
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    // Get all PENDING templates for this client
    const getSql = `
      SELECT 
        id,
        waba_id,
        name,
        status
      FROM public.message_templates
      WHERE client_id = $1 AND status IN ('PENDING', 'PAUSED')
      ORDER BY created_at DESC
    `;

    const getResult = await query<MessageTemplate>(getSql, [clientId]);

    if (getResult.rowCount === 0) {
      return NextResponse.json({
        message: "No templates to sync",
        synced: 0,
        templates: [],
      });
    }

    const templates = getResult.rows;

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

    // Get unique WABA IDs
    const wabaIds = Array.from(new Set(templates.map(t => t.waba_id)));
    
    const syncedTemplates: Array<{
      id: string;
      name: string;
      old_status: string;
      new_status: string;
      rejection_reason?: string;
    }> = [];

    // Sync for each WABA
    for (const wabaId of wabaIds) {
      const templatesForWaba = templates.filter(t => t.waba_id === wabaId);
      const templateNames = templatesForWaba.map(t => t.name);

      try {
        // Fetch status from Meta API
        const statusMap = await syncTemplateStatus(wabaId, templateNames, config);

        // Update database for each template
        for (const template of templatesForWaba) {
          const newStatus = statusMap[template.name];

          if (newStatus && newStatus.status !== template.status) {
            const updateSql = `
              UPDATE public.message_templates
              SET 
                status = $1,
                rejection_reason = $2,
                updated_at = NOW()
              WHERE id = $3 AND client_id = $4
            `;

            await query(updateSql, [
              newStatus.status,
              newStatus.rejection_reason || null,
              template.id,
              clientId,
            ]);

            syncedTemplates.push({
              id: template.id,
              name: template.name,
              old_status: template.status,
              new_status: newStatus.status,
              rejection_reason: newStatus.rejection_reason,
            });
          }
        }
      } catch (metaError: any) {
        console.error(`Failed to sync templates for WABA ${wabaId}:`, metaError);
        // Continue with other WABAs
      }
    }

    return NextResponse.json({
      message: "Templates synced successfully",
      synced: syncedTemplates.length,
      templates: syncedTemplates,
    });
  } catch (error) {
    console.error("Error syncing templates:", error);
    return NextResponse.json(
      { error: "Failed to sync templates" },
      { status: 500 }
    );
  }
}
