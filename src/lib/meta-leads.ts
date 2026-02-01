/**
 * 🎯 META LEAD ADS INTEGRATION
 *
 * Functions for fetching and processing Lead Ads data from Meta
 *
 * @see https://developers.facebook.com/docs/marketing-api/guides/lead-ads
 */

import { createServiceRoleClient } from "@/lib/supabase";

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// Types
// ============================================================================

export interface LeadFormField {
  name: string;
  values: string[];
}

export interface LeadData {
  id: string;
  created_time: string;
  field_data: LeadFormField[];
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  is_organic?: boolean;
}

export interface ParsedLead {
  leadgen_id: string;
  phone?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  country?: string;
  company_name?: string;
  job_title?: string;
  custom_fields: Record<string, string>;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  created_at: string;
}

// ============================================================================
// Lead Retrieval
// ============================================================================

/**
 * Fetch lead details from Meta Lead Ads API
 *
 * Requires: leads_retrieval permission
 *
 * @param leadgenId - The leadgen_id from the webhook
 * @param accessToken - Meta access token
 * @returns Lead data with form fields
 */
export async function fetchLeadDetails(
  leadgenId: string,
  accessToken: string,
): Promise<LeadData | null> {
  try {
    const url = `${META_BASE_URL}/${leadgenId}`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields:
        "id,created_time,field_data,ad_id,adset_id,campaign_id,form_id,is_organic",
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error("[META-LEADS] API Error:", data.error);
      return null;
    }

    return data as LeadData;
  } catch (error) {
    console.error("[META-LEADS] Error fetching lead:", error);
    return null;
  }
}

/**
 * Parse lead data into a structured format
 */
export function parseLeadData(leadData: LeadData): ParsedLead {
  const customFields: Record<string, string> = {};
  let phone: string | undefined;
  let email: string | undefined;
  let fullName: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;
  let companyName: string | undefined;
  let jobTitle: string | undefined;

  // Parse field_data array
  for (const field of leadData.field_data || []) {
    const value = field.values?.[0] || "";
    const fieldName = field.name.toLowerCase();

    // Map common field names
    switch (fieldName) {
      case "phone_number":
      case "phone":
      case "telefone":
      case "celular":
        phone = normalizePhone(value);
        break;
      case "email":
      case "e-mail":
        email = value;
        break;
      case "full_name":
      case "nome_completo":
      case "nome":
        fullName = value;
        break;
      case "first_name":
      case "primeiro_nome":
        firstName = value;
        break;
      case "last_name":
      case "sobrenome":
      case "ultimo_nome":
        lastName = value;
        break;
      case "city":
      case "cidade":
        city = value;
        break;
      case "state":
      case "estado":
        state = value;
        break;
      case "country":
      case "pais":
        country = value;
        break;
      case "company_name":
      case "empresa":
      case "company":
        companyName = value;
        break;
      case "job_title":
      case "cargo":
        jobTitle = value;
        break;
      default:
        // Store as custom field
        customFields[field.name] = value;
    }
  }

  // Build full name from parts if not provided
  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(" ");
  }

  return {
    leadgen_id: leadData.id,
    phone,
    email,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    city,
    state,
    country,
    company_name: companyName,
    job_title: jobTitle,
    custom_fields: customFields,
    ad_id: leadData.ad_id,
    adset_id: leadData.adset_id,
    campaign_id: leadData.campaign_id,
    form_id: leadData.form_id,
    created_at: leadData.created_time,
  };
}

/**
 * Normalize phone number to international format
 */
function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, "");

  // Add Brazil country code if not present
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = "55" + cleaned;
  }

  return cleaned;
}

// ============================================================================
// CRM Integration
// ============================================================================

/**
 * Create a CRM card from a Lead Ad submission
 */
export async function createCardFromLead(
  clientId: string,
  parsedLead: ParsedLead,
): Promise<{ success: boolean; cardId?: string; error?: string }> {
  const supabase = createServiceRoleClient();

  try {
    // Get the first column (novo)
    // Using 'as any' for type flexibility with Supabase query results
    const { data: columns } = (await (supabase as any)
      .from("crm_columns")
      .select("id")
      .eq("client_id", clientId)
      .order("position", { ascending: true })
      .limit(1)) as { data: { id: string }[] | null };

    if (!columns || columns.length === 0) {
      return { success: false, error: "No CRM columns found" };
    }

    const firstColumnId = columns[0].id;

    // Check if card already exists for this phone
    if (parsedLead.phone) {
      const { data: existingCard } = (await (supabase as any)
        .from("crm_cards")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", parsedLead.phone)
        .limit(1)) as { data: { id: string }[] | null };

      if (existingCard && existingCard.length > 0) {
        console.log(
          "[META-LEADS] Card already exists for phone:",
          parsedLead.phone,
        );
        return { success: true, cardId: existingCard[0].id };
      }
    }

    // Create the card
    const { data: card, error } = (await (supabase as any)
      .from("crm_cards")
      .insert({
        client_id: clientId,
        column_id: firstColumnId,
        phone: parsedLead.phone || `lead_${parsedLead.leadgen_id}`,
        title: parsedLead.full_name || parsedLead.email || "Lead Ads",
        description: buildCardDescription(parsedLead),
        lead_sources: {
          type: "lead_ads",
          leadgen_id: parsedLead.leadgen_id,
          form_id: parsedLead.form_id,
          ad_id: parsedLead.ad_id,
          campaign_id: parsedLead.campaign_id,
          email: parsedLead.email,
        },
        custom_fields: {
          ...parsedLead.custom_fields,
          company_name: parsedLead.company_name,
          job_title: parsedLead.job_title,
          city: parsedLead.city,
          state: parsedLead.state,
          country: parsedLead.country,
        },
        position: 0,
      })
      .select("id")
      .single()) as { data: { id: string } | null; error: any };

    if (error || !card) {
      console.error("[META-LEADS] Error creating card:", error);
      return { success: false, error: error?.message || "Card not created" };
    }

    console.log("[META-LEADS] ✅ Card created:", card.id);

    // Log lead source
    await (supabase as any).from("lead_sources").insert({
      client_id: clientId,
      card_id: card.id,
      source_type: "lead_ads",
      source_data: {
        leadgen_id: parsedLead.leadgen_id,
        form_id: parsedLead.form_id,
        ad_id: parsedLead.ad_id,
        adset_id: parsedLead.adset_id,
        campaign_id: parsedLead.campaign_id,
      },
    });

    return { success: true, cardId: card.id };
  } catch (error) {
    console.error("[META-LEADS] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build card description from lead data
 */
function buildCardDescription(lead: ParsedLead): string {
  const parts: string[] = [];

  if (lead.email) parts.push(`📧 ${lead.email}`);
  if (lead.company_name) parts.push(`🏢 ${lead.company_name}`);
  if (lead.job_title) parts.push(`💼 ${lead.job_title}`);
  if (lead.city || lead.state) {
    parts.push(`📍 ${[lead.city, lead.state].filter(Boolean).join(", ")}`);
  }

  // Add custom fields
  for (const [key, value] of Object.entries(lead.custom_fields)) {
    if (value) {
      parts.push(`${key}: ${value}`);
    }
  }

  return parts.join("\n") || "Lead from Facebook Lead Ads";
}

// ============================================================================
// Form Retrieval
// ============================================================================

/**
 * Get all lead forms for a page
 */
export async function getLeadForms(
  pageId: string,
  accessToken: string,
): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    leads_count?: number;
  }>
> {
  try {
    const url = `${META_BASE_URL}/${pageId}/leadgen_forms`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: "id,name,status,leads_count",
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error("[META-LEADS] Error fetching forms:", data.error);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("[META-LEADS] Error:", error);
    return [];
  }
}

/**
 * Get leads from a specific form
 */
export async function getFormLeads(
  formId: string,
  accessToken: string,
  limit = 50,
): Promise<LeadData[]> {
  try {
    const url = `${META_BASE_URL}/${formId}/leads`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields:
        "id,created_time,field_data,ad_id,adset_id,campaign_id,form_id,is_organic",
      limit: limit.toString(),
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error("[META-LEADS] Error fetching form leads:", data.error);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("[META-LEADS] Error:", error);
    return [];
  }
}
