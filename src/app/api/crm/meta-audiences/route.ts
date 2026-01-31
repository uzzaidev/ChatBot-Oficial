/**
 * 🎯 META CUSTOM AUDIENCES API
 *
 * Sync CRM data to Meta Custom Audiences for better ad targeting
 *
 * POST /api/crm/meta-audiences - Create or update audience
 * GET /api/crm/meta-audiences - List audiences
 *
 * Requires: ads_management permission (optional - for full sync)
 * Minimum: ads_read permission (to view audiences)
 *
 * @see https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences
 */

import { getClientConfig } from "@/lib/config";
import { createServiceRoleClient } from "@/lib/supabase";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// Types
// ============================================================================

interface CustomAudience {
  id: string;
  name: string;
  description?: string;
  subtype: string;
  approximate_count?: number;
  time_created?: string;
  time_updated?: string;
  operation_status?: {
    status: string;
    description?: string;
  };
}

interface AudienceSyncRequest {
  audience_name: string;
  description?: string;
  source: "all_cards" | "column" | "tag" | "won" | "high_value";
  column_id?: string;
  tag_id?: string;
  min_value?: number;
}

// ============================================================================
// GET - List Custom Audiences
// ============================================================================

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const clientId =
    request.nextUrl.searchParams.get("client_id") ||
    process.env.DEFAULT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  try {
    // Get Meta config
    const clientConfig = await getClientConfig(clientId);
    const { data: client } = (await supabase
      .from("clients")
      .select("meta_ad_account_id")
      .eq("id", clientId)
      .single()) as { data: { meta_ad_account_id: string | null } | null };

    const accessToken = clientConfig?.apiKeys?.metaAccessToken;
    if (!accessToken || !client?.meta_ad_account_id) {
      return NextResponse.json({
        audiences: [],
        message: "Meta Ads not configured",
        configured: false,
      });
    }

    // Fetch audiences from Meta
    const adAccountId = client.meta_ad_account_id.startsWith("act_")
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;

    const url = `${META_BASE_URL}/${adAccountId}/customaudiences`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields:
        "id,name,description,subtype,approximate_count,time_created,time_updated,operation_status",
      limit: "100",
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error("[META-AUDIENCES] API Error:", data.error);
      return NextResponse.json(
        {
          audiences: [],
          error: data.error.message,
          error_code: data.error.code,
        },
        { status: 400 },
      );
    }

    // Filter to show only audiences created by our app
    const audiences: CustomAudience[] = data.data || [];
    const crmAudiences = audiences.filter(
      (a) => a.description?.includes("[CRM-SYNC]") || a.subtype === "CUSTOM",
    );

    return NextResponse.json({
      audiences: crmAudiences,
      total: crmAudiences.length,
      configured: true,
    });
  } catch (error) {
    console.error("[META-AUDIENCES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audiences" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Create/Update Audience
// ============================================================================

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();

  try {
    const body: AudienceSyncRequest = await request.json();
    const clientId =
      body.source === "all_cards" ? process.env.DEFAULT_CLIENT_ID : undefined;

    // For now, use default client
    const targetClientId = clientId || process.env.DEFAULT_CLIENT_ID;
    if (!targetClientId) {
      return NextResponse.json(
        { error: "client_id required" },
        { status: 400 },
      );
    }

    // Get Meta config
    const clientConfig = await getClientConfig(targetClientId);
    const { data: client } = (await supabase
      .from("clients")
      .select("meta_ad_account_id")
      .eq("id", targetClientId)
      .single()) as { data: { meta_ad_account_id: string | null } | null };

    const accessToken = clientConfig?.apiKeys?.metaAccessToken;
    if (!accessToken || !client?.meta_ad_account_id) {
      return NextResponse.json(
        { error: "Meta Ads not configured" },
        { status: 400 },
      );
    }

    // Get CRM data based on source
    const crmData = await getCRMDataForAudience(supabase, targetClientId, body);

    if (crmData.length === 0) {
      return NextResponse.json(
        { error: "No data found for audience", count: 0 },
        { status: 400 },
      );
    }

    // Create or update audience
    const adAccountId = client.meta_ad_account_id.startsWith("act_")
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;

    // Check if audience already exists
    const existingAudience = await findExistingAudience(
      adAccountId,
      accessToken,
      body.audience_name,
    );

    let audienceId: string;

    if (existingAudience) {
      // Update existing audience
      audienceId = existingAudience.id;
      console.log("[META-AUDIENCES] Updating existing audience:", audienceId);
    } else {
      // Create new audience
      const createResult = await createCustomAudience(
        adAccountId,
        accessToken,
        body.audience_name,
        body.description || `[CRM-SYNC] ${body.source}`,
      );

      if (!createResult.success) {
        return NextResponse.json(
          { error: createResult.error },
          { status: 400 },
        );
      }

      audienceId = createResult.id!;
      console.log("[META-AUDIENCES] Created new audience:", audienceId);
    }

    // Add users to audience
    const addResult = await addUsersToAudience(
      audienceId,
      accessToken,
      crmData,
    );

    return NextResponse.json({
      success: true,
      audience_id: audienceId,
      audience_name: body.audience_name,
      users_added: crmData.length,
      session_id: addResult.session_id,
      message: existingAudience
        ? "Audience updated successfully"
        : "Audience created successfully",
    });
  } catch (error) {
    console.error("[META-AUDIENCES] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync audience" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getCRMDataForAudience(
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  options: AudienceSyncRequest,
): Promise<Array<{ phone?: string; email?: string }>> {
  // Using 'as any' for query builder due to type limitations
  let query = (supabase as any)
    .from("crm_cards")
    .select("phone, title, lead_sources");

  query = query.eq("client_id", clientId);

  switch (options.source) {
    case "column":
      if (options.column_id) {
        query = query.eq("column_id", options.column_id);
      }
      break;

    case "tag":
      if (options.tag_id) {
        query = query.contains("tags", [options.tag_id]);
      }
      break;

    case "won":
      // Get the "fechado" or last column
      const { data: columns } = await (supabase as any)
        .from("crm_columns")
        .select("id")
        .eq("client_id", clientId)
        .order("position", { ascending: false })
        .limit(1);

      if (columns && columns.length > 0) {
        query = query.eq("column_id", columns[0].id);
      }
      break;

    case "high_value":
      if (options.min_value) {
        query = query.gte("value", options.min_value);
      } else {
        query = query.gte("value", 1000); // Default minimum
      }
      break;

    case "all_cards":
    default:
      // No additional filter
      break;
  }

  const { data: cards, error } = await query;

  if (error || !cards) {
    console.error("[META-AUDIENCES] Error fetching cards:", error);
    return [];
  }

  // Extract phone numbers and emails
  return cards
    .map((card) => ({
      phone: card.phone,
      email: (card.lead_sources as Record<string, unknown>)?.email as
        | string
        | undefined,
    }))
    .filter((item) => item.phone || item.email);
}

async function findExistingAudience(
  adAccountId: string,
  accessToken: string,
  name: string,
): Promise<CustomAudience | null> {
  try {
    const url = `${META_BASE_URL}/${adAccountId}/customaudiences`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: "id,name",
      filtering: JSON.stringify([
        { field: "name", operator: "EQUAL", value: name },
      ]),
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return data.data[0];
    }

    return null;
  } catch (error) {
    console.error("[META-AUDIENCES] Error finding audience:", error);
    return null;
  }
}

async function createCustomAudience(
  adAccountId: string,
  accessToken: string,
  name: string,
  description: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const url = `${META_BASE_URL}/${adAccountId}/customaudiences`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        name,
        description,
        subtype: "CUSTOM",
        customer_file_source: "USER_PROVIDED_ONLY",
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function addUsersToAudience(
  audienceId: string,
  accessToken: string,
  users: Array<{ phone?: string; email?: string }>,
): Promise<{ success: boolean; session_id?: string }> {
  try {
    const url = `${META_BASE_URL}/${audienceId}/users`;

    // Hash user data (Meta requires SHA256 hashing)
    const schema = ["PHONE", "EMAIL"];
    const data: string[][] = [];

    for (const user of users) {
      const row: string[] = [];

      // Phone (normalized and hashed)
      if (user.phone) {
        const normalizedPhone = user.phone.replace(/\D/g, "");
        row.push(hashData(normalizedPhone));
      } else {
        row.push("");
      }

      // Email (lowercase and hashed)
      if (user.email) {
        row.push(hashData(user.email.toLowerCase().trim()));
      } else {
        row.push("");
      }

      // Only add if at least one value
      if (row.some((v) => v !== "")) {
        data.push(row);
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        payload: {
          schema,
          data,
        },
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error("[META-AUDIENCES] Error adding users:", result.error);
      return { success: false };
    }

    return { success: true, session_id: result.session_id };
  } catch (error) {
    console.error("[META-AUDIENCES] Error:", error);
    return { success: false };
  }
}

function hashData(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
