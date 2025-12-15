/**
 * AI Gateway Cache API Route
 *
 * GET /api/ai-gateway/cache - List cache entries
 * DELETE /api/ai-gateway/cache - Invalidate cache entries
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Configuration constants
const CACHE_DEFAULT_TTL_SECONDS = 3600; // 1 hour
const ESTIMATED_COST_PER_TOKEN_BRL = 0.0002; // Fallback average cost
// TODO: Fetch actual pricing from ai_models_registry table dynamically

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, is_active, client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, {
        status: 404,
      });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get("clientId");

    const isAdmin = profile.role === "admin";
    const effectiveClientId = isAdmin
      ? (requestedClientId?.trim() || null)
      : profile.client_id;

    // Fetch recent cached requests from usage logs
    // These represent actual cached AI responses
    let query = supabase
      .from("gateway_usage_logs")
      .select("*")
      .eq("was_cached", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (effectiveClientId) {
      query = query.eq("client_id", effectiveClientId);
    }

    const { data: cachedRequests, error } = await query;

    if (error) throw error;

    // Group by model/prompt pattern to simulate cache entries
    const cacheMap = new Map<string, {
      count: number;
      tokensSaved: number;
      lastAccessedAt: string;
      modelName: string;
      provider: string;
    }>();

    cachedRequests?.forEach((log) => {
      // Use model + provider as cache key (simplified)
      const cacheKey = `${log.provider}/${log.model_name}`;

      if (cacheMap.has(cacheKey)) {
        const existing = cacheMap.get(cacheKey)!;
        existing.count += 1;
        existing.tokensSaved += log.cached_tokens || 0;
        if (new Date(log.created_at) > new Date(existing.lastAccessedAt)) {
          existing.lastAccessedAt = log.created_at;
        }
      } else {
        cacheMap.set(cacheKey, {
          count: 1,
          tokensSaved: log.cached_tokens || 0,
          lastAccessedAt: log.created_at,
          modelName: log.model_name,
          provider: log.provider,
        });
      }
    });

    // Transform to entries format
    const entries = Array.from(cacheMap.entries()).map(([cacheKey, data]) => {
      // Estimate savings (dynamic pricing would be better)
      // TODO: Fetch actual pricing from ai_models_registry instead of using fixed rate
      const savingsBRL = data.tokensSaved * ESTIMATED_COST_PER_TOKEN_BRL;

      // Assume default TTL for cached entries
      const ttlSeconds = CACHE_DEFAULT_TTL_SECONDS;

      return {
        cacheKey,
        promptPreview:
          `${data.provider} - ${data.modelName} (cached responses)`,
        hitCount: data.count,
        tokensSaved: data.tokensSaved,
        savingsBRL,
        lastAccessedAt: data.lastAccessedAt,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        ttlSeconds,
      };
    });

    // Sort by hit count descending
    entries.sort((a, b) => b.hitCount - a.hitCount);

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error("Error fetching cache entries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch cache" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { cacheKey } = body;

    if (!cacheKey) {
      return NextResponse.json(
        { error: "cacheKey is required" },
        { status: 400 },
      );
    }

    // Cache invalidation is not supported - caching is handled by Vercel AI SDK
    // which doesn't provide direct cache invalidation APIs in the current implementation
    return NextResponse.json({
      error: "Cache invalidation not implemented",
      message:
        "Cache is managed by Vercel AI SDK and does not support direct invalidation. Cache entries expire automatically based on TTL.",
      suggestion:
        "Wait for automatic cache expiration or implement custom cache storage with Redis/Memcached for invalidation support.",
    }, { status: 501 });
  } catch (error: any) {
    console.error("Error invalidating cache:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invalidate cache" },
      { status: 500 },
    );
  }
}
