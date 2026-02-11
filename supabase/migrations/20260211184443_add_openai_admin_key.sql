-- Add OpenAI Admin Key field to clients table
-- This key has permissions for billing/usage APIs (scope: api.usage.read)
-- Different from openai_api_key_secret_id (which is for chat/embeddings only)

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS openai_admin_key_secret_id UUID REFERENCES vault.secrets(id);

COMMENT ON COLUMN clients.openai_admin_key_secret_id IS 'OpenAI Admin API Key with api.usage.read scope for billing/usage analytics';
