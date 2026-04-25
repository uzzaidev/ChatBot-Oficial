-- Agent prompt/context hardening
-- Adds structured prompt sections and explicit context budgets for active agents.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS prompt_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_input_tokens INTEGER NOT NULL DEFAULT 24000,
  ADD COLUMN IF NOT EXISTS max_history_tokens INTEGER NOT NULL DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS max_knowledge_tokens INTEGER NOT NULL DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS reasoning_effort TEXT NOT NULL DEFAULT 'low';

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_max_input_tokens_check,
  ADD CONSTRAINT agents_max_input_tokens_check
    CHECK (max_input_tokens BETWEEN 4000 AND 128000);

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_max_history_tokens_check,
  ADD CONSTRAINT agents_max_history_tokens_check
    CHECK (max_history_tokens BETWEEN 0 AND 32000);

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_max_knowledge_tokens_check,
  ADD CONSTRAINT agents_max_knowledge_tokens_check
    CHECK (max_knowledge_tokens BETWEEN 0 AND 32000);

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_reasoning_effort_check,
  ADD CONSTRAINT agents_reasoning_effort_check
    CHECK (reasoning_effort IN ('low', 'medium', 'high'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_n8n_chat_histories_client_wamid_not_null
  ON n8n_chat_histories(client_id, wamid)
  WHERE wamid IS NOT NULL;

COMMENT ON COLUMN agents.prompt_sections IS
  'Structured prompt editor fields compiled into the system prompt.';
COMMENT ON COLUMN agents.max_input_tokens IS
  'Approximate total input context budget before the model call.';
COMMENT ON COLUMN agents.max_history_tokens IS
  'Approximate history token budget inside the input context.';
COMMENT ON COLUMN agents.max_knowledge_tokens IS
  'Approximate retrieved knowledge token budget inside the input context.';
COMMENT ON COLUMN agents.reasoning_effort IS
  'Reasoning effort for OpenAI reasoning models: low, medium, high.';
