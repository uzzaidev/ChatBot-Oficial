/**
 * AI Gateway Models API Route
 *
 * GET /api/ai-gateway/models - List available AI models
 * POST /api/ai-gateway/models - Add new model
 * PUT /api/ai-gateway/models - Update model
 * DELETE /api/ai-gateway/models - Delete model
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function requireAdmin(supabase: ReturnType<typeof createServerClient>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const capability = searchParams.get("capability");

    const supabase = createServerClient();

    let query = supabase
      .from("ai_models_registry")
      .select("*")
      .eq("is_active", true)
      .order("provider")
      .order("model_name");

    // Filter by capability if specified
    if (capability === "vision") {
      query = query.contains("capabilities", { vision: true });
    } else if (capability === "tools") {
      query = query.contains("capabilities", { tools: true });
    }

    const { data: models, error } = await query;

    if (error) throw error;

    // Transform to match frontend expectations
    const transformedModels = (models || []).map((model: any) => ({
      id: model.id,
      provider: model.provider,
      modelName: model.model_name,
      displayName: model.gateway_identifier,
      gatewayIdentifier: model.gateway_identifier,
      costPer1kInputTokens: parseFloat(model.input_price_per_million) / 1000,
      costPer1kOutputTokens: parseFloat(model.output_price_per_million) / 1000,
      maxContextWindow: model.context_window,
      maxOutputTokens: model.max_output_tokens,
      supportsVision: model.capabilities?.vision === true,
      supportsTools: model.capabilities?.tools === true,
      supportsStreaming: model.capabilities?.streaming === true,
      supportsCaching: model.capabilities?.caching === true,
      enabled: model.is_active,
      verified: true, // All seeded models are verified
      description: model.description,
    }));

    return NextResponse.json({ models: transformedModels });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider,
      modelName,
      gatewayIdentifier,
      capabilities,
      contextWindow,
      maxOutputTokens,
      inputPricePerMillion,
      outputPricePerMillion,
      cachedInputPricePerMillion,
      isActive,
      description,
    } = body;

    // Validate required fields
    if (!provider || !modelName || !gatewayIdentifier) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: provider, modelName, gatewayIdentifier",
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const adminCheck = await requireAdmin(supabase);
    if (!adminCheck.ok) return adminCheck.response;

    // Insert new model
    const { data, error } = await supabase
      .from("ai_models_registry")
      .insert({
        provider,
        model_name: modelName,
        gateway_identifier: gatewayIdentifier,
        capabilities: capabilities || { text: true, streaming: true },
        context_window: contextWindow || 4096,
        max_output_tokens: maxOutputTokens || 2048,
        input_price_per_million: inputPricePerMillion || 0,
        output_price_per_million: outputPricePerMillion || 0,
        cached_input_price_per_million: cachedInputPricePerMillion,
        is_active: isActive !== false,
        description: description || "",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, model: data });
  } catch (error: any) {
    console.error("Error creating model:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create model" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const adminCheck = await requireAdmin(supabase);
    if (!adminCheck.ok) return adminCheck.response;

    // Build update object
    const updateData: any = {};

    if (updates.capabilities !== undefined) {
      updateData.capabilities = updates.capabilities;
    }
    if (updates.contextWindow !== undefined) {
      updateData.context_window = updates.contextWindow;
    }
    if (updates.maxOutputTokens !== undefined) {
      updateData.max_output_tokens = updates.maxOutputTokens;
    }
    if (updates.inputPricePerMillion !== undefined) {
      updateData.input_price_per_million = updates.inputPricePerMillion;
    }
    if (updates.outputPricePerMillion !== undefined) {
      updateData.output_price_per_million = updates.outputPricePerMillion;
    }
    if (updates.cachedInputPricePerMillion !== undefined) {
      updateData.cached_input_price_per_million =
        updates.cachedInputPricePerMillion;
    }
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    updateData.updated_at = new Date().toISOString();

    // Update model
    const { data, error } = await supabase
      .from("ai_models_registry")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, model: data });
  } catch (error: any) {
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update model" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const adminCheck = await requireAdmin(supabase);
    if (!adminCheck.ok) return adminCheck.response;

    // Soft delete - just disable the model
    const { error } = await supabase
      .from("ai_models_registry")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete model" },
      { status: 500 },
    );
  }
}
