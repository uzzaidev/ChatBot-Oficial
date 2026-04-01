/**
 * Billing lifecycle operations: grace periods, suspension, WhatsApp disconnect.
 *
 * Extracted from /api/auth/meta/disconnect logic into a reusable server-side module.
 */

import { createServiceClient } from "@/lib/supabase-server";
import { deleteSecret, getSecret } from "@/lib/vault";

const LOG_PREFIX = "[billing-lifecycle]";

const getSupabase = () => createServiceClient() as any;

// ---------------------------------------------------------------------------
// Grace period
// ---------------------------------------------------------------------------

/**
 * Start a grace period for a client after a payment failure.
 * Sets `grace_period_ends_at` on the `clients` table and updates plan_status.
 */
export const startGracePeriod = async (
  clientId: string,
  graceDays = 7,
): Promise<void> => {
  const supabase = getSupabase();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + graceDays);

  await supabase
    .from("clients")
    .update({
      plan_status: "past_due",
      grace_period_ends_at: endsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  console.info(
    `${LOG_PREFIX} Grace period started for client ${clientId}, ends at ${endsAt.toISOString()}`,
  );
};

/**
 * Clear the grace period (e.g. when payment succeeds).
 */
export const clearGracePeriod = async (clientId: string): Promise<void> => {
  const supabase = getSupabase();
  await supabase
    .from("clients")
    .update({
      grace_period_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
};

// ---------------------------------------------------------------------------
// Suspend client
// ---------------------------------------------------------------------------

/**
 * Mark a client as suspended. This does NOT disconnect WhatsApp.
 */
export const suspendClient = async (clientId: string): Promise<void> => {
  const supabase = getSupabase();
  await supabase
    .from("clients")
    .update({
      plan_status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  console.info(`${LOG_PREFIX} Client ${clientId} suspended`);
};

// ---------------------------------------------------------------------------
// Disconnect WhatsApp
// ---------------------------------------------------------------------------

/**
 * Deregister the client's phone from Meta Cloud API, delete Vault secrets,
 * and clear all Meta/WhatsApp fields on the client row.
 *
 * This is the "nuclear" action — the client loses their WhatsApp link.
 * Best-effort: individual failures are logged but do not throw.
 */
export const disconnectClientWhatsApp = async (
  clientId: string,
): Promise<{
  deregistered: boolean;
  secretsDeleted: number;
  fieldsCleared: boolean;
}> => {
  const supabase = getSupabase();

  // 1. Fetch current client data
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "meta_access_token_secret_id, meta_verify_token_secret_id, meta_phone_number_id, meta_waba_id, meta_display_phone",
    )
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    console.error(
      `${LOG_PREFIX} Client ${clientId} not found for disconnect`,
      clientError,
    );
    return { deregistered: false, secretsDeleted: 0, fieldsCleared: false };
  }

  let deregistered = false;
  let secretsDeleted = 0;

  // 2. Deregister phone from Cloud API (best-effort)
  if (client.meta_phone_number_id && client.meta_access_token_secret_id) {
    try {
      const accessToken = await getSecret(client.meta_access_token_secret_id);
      if (accessToken) {
        const deregRes = await fetch(
          `https://graph.facebook.com/v22.0/${client.meta_phone_number_id}/deregister`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ messaging_product: "whatsapp" }),
          },
        );

        if (deregRes.ok) {
          deregistered = true;
          console.info(
            `${LOG_PREFIX} Phone deregistered: ${client.meta_phone_number_id}`,
          );
        } else {
          const err = await deregRes.json().catch(() => ({}));
          console.warn(
            `${LOG_PREFIX} Phone deregister failed (non-blocking):`,
            err,
          );
        }
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Deregister error (non-blocking):`, err);
    }
  }

  // 3. Delete Vault secrets
  if (client.meta_access_token_secret_id) {
    const ok = await deleteSecret(client.meta_access_token_secret_id).catch(
      () => false,
    );
    if (ok) secretsDeleted++;
  }
  if (client.meta_verify_token_secret_id) {
    const ok = await deleteSecret(client.meta_verify_token_secret_id).catch(
      () => false,
    );
    if (ok) secretsDeleted++;
  }

  // 4. Clear all Meta/WhatsApp fields
  const { error: updateError } = await supabase
    .from("clients")
    .update({
      meta_waba_id: null,
      meta_phone_number_id: null,
      meta_display_phone: null,
      meta_access_token_secret_id: null,
      meta_verify_token_secret_id: null,
      meta_user_id: null,
      webhook_routing_mode: null,
      auto_provisioned: false,
      provisioned_at: null,
      onboarding_type: null,
      provisioning_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  const fieldsCleared = !updateError;
  if (updateError) {
    console.error(
      `${LOG_PREFIX} Failed to clear fields for ${clientId}:`,
      updateError,
    );
  }

  console.info(`${LOG_PREFIX} Disconnect complete for ${clientId}:`, {
    deregistered,
    secretsDeleted,
    fieldsCleared,
  });

  return { deregistered, secretsDeleted, fieldsCleared };
};

// ---------------------------------------------------------------------------
// Full lifecycle: suspend + disconnect
// ---------------------------------------------------------------------------

/**
 * Suspend client AND disconnect WhatsApp. Used after grace period expires.
 */
export const enforceNonPayment = async (clientId: string): Promise<void> => {
  await suspendClient(clientId);
  await disconnectClientWhatsApp(clientId);
  console.info(`${LOG_PREFIX} Non-payment enforced for client ${clientId}`);
};
