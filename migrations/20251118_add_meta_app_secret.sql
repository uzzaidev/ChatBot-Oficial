/**
 * SECURITY FIX (VULN-012 - CORREÇÃO): Add Meta App Secret to Vault
 *
 * Problem: Webhook signature validation was using metaVerifyToken instead of
 * the actual Meta App Secret. These are DIFFERENT values:
 * - metaVerifyToken: Used for webhook GET verification (hub.verify_token)
 * - metaAppSecret: Used for HMAC signature validation (X-Hub-Signature-256)
 *
 * Solution: Add new column to store App Secret reference in Vault
 */

-- Add column to clients table for Meta App Secret
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS meta_app_secret_secret_id UUID REFERENCES vault.secrets(id);

-- Add comment explaining the difference
COMMENT ON COLUMN public.clients.meta_app_secret_secret_id IS
'Reference to Vault secret containing Meta App Secret (used for HMAC signature validation).
DIFFERENT from meta_verify_token_secret_id (used for webhook verification).';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Meta App Secret column added to clients table';
  RAISE NOTICE 'Clients can now configure App Secret via Settings page';
  RAISE NOTICE 'App Secret will be stored encrypted in Supabase Vault';
END $$;
