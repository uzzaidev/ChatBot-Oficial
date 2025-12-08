import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { MessageTemplate, CreateTemplateRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/templates
 * List all templates for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build query
    let sql = `
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
      WHERE client_id = $1
    `;

    const params: any[] = [clientId];

    // Filter by status if provided
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query<MessageTemplate>(sql, params);

    return NextResponse.json({
      templates: result.rows,
      count: result.rowCount || 0,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template (DRAFT status)
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

    // Parse request body
    const body: CreateTemplateRequest = await request.json();
    const { name, category, language, waba_id, components } = body;

    // Validate required fields
    if (!name || !category || !language || !waba_id || !components) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, language, waba_id, components" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["UTILITY", "AUTHENTICATION", "MARKETING"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate name format (lowercase, underscores only)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: "Template name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Validate components structure
    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: "Components must be a non-empty array" },
        { status: 400 }
      );
    }

    // Check if BODY component exists (required)
    const hasBody = components.some(c => c.type === "BODY");
    if (!hasBody) {
      return NextResponse.json(
        { error: "Template must include a BODY component" },
        { status: 400 }
      );
    }

    // Get user ID from session for created_by
    // For now, we'll use null - implement auth.uid() in production
    const userId = null;

    // Insert template
    const sql = `
      INSERT INTO public.message_templates (
        client_id,
        created_by,
        waba_id,
        name,
        category,
        language,
        components,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
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

    const params = [
      clientId,
      userId,
      waba_id,
      name,
      category,
      language,
      JSON.stringify(components),
    ];

    const result = await query<MessageTemplate>(sql, params);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Template created successfully",
        template: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating template:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A template with this name and language already exists for your account" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
