-- V2 Agent: adiciona coluna policy_context à tabela conversations
-- Armazena o estado do motor de políticas (PolicyState, ActiveCapability, slots, tools permitidas)

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS policy_context JSONB DEFAULT NULL;

COMMENT ON COLUMN conversations.policy_context IS
  'V2 policy engine context: state, capability, missing_slots, allowed_tools, version, last_updated_at';

CREATE INDEX IF NOT EXISTS idx_conversations_policy_state
  ON conversations ((policy_context->>'state'));
