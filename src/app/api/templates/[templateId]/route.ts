import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { MessageTemplate, UpdateTemplateRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    templateId: string;
  }>;
}

/**
 * GET /api/templates/[templateId]
 * Get a single template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const sql = `
      SELECT 
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
      FROM public.message_templates
      WHERE id = $1 AND client_id = $2
    `;

    const result = await query<MessageTemplate>(sql, [templateId, clientId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[templateId]
 * Update a template (only DRAFT templates can be edited)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check if template exists and is DRAFT
    const checkSql = `
      SELECT status 
      FROM public.message_templates
      WHERE id = $1 AND client_id = $2
    `;

    const checkResult = await query<{ status: string }>(checkSql, [
      templateId,
      clientId,
    ]);

    if (checkResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const currentStatus = checkResult.rows[0].status;

    if (currentStatus !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT templates can be edited. Create a new version instead." },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateTemplateRequest = await request.json();
    const { components, status, rejection_reason } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [templateId, clientId];
    let paramIndex = 3;

    if (components) {
      // Validate components
      if (!Array.isArray(components) || components.length === 0) {
        return NextResponse.json(
          { error: "Components must be a non-empty array" },
          { status: 400 }
        );
      }

      const hasBody = components.some(c => c.type === "BODY");
      if (!hasBody) {
        return NextResponse.json(
          { error: "Template must include a BODY component" },
          { status: 400 }
        );
      }

      updates.push(`components = $${paramIndex}`);
      values.push(JSON.stringify(components));
      paramIndex++;
    }

    if (status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex}`);
      values.push(rejection_reason);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updateSql = `
      UPDATE public.message_templates
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND client_id = $2
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

    const result = await query<MessageTemplate>(updateSql, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Template updated successfully",
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[templateId]
 * Delete a template (only DRAFT templates can be deleted)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if template exists and is DRAFT
    const checkSql = `
      SELECT status 
      FROM public.message_templates
      WHERE id = $1 AND client_id = $2
    `;

    const checkResult = await query<{ status: string }>(checkSql, [
      templateId,
      clientId,
    ]);

    if (checkResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const currentStatus = checkResult.rows[0].status;

    if (currentStatus !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT templates can be deleted" },
        { status: 403 }
      );
    }

    // Delete template
    const deleteSql = `
      DELETE FROM public.message_templates
      WHERE id = $1 AND client_id = $2
    `;

    const result = await query(deleteSql, [templateId, clientId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
