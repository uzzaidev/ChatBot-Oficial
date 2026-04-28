-- Expand reasoning_effort constraint to include new OpenAI reasoning options
-- Adds support for: none, minimal, xhigh (in addition to existing low, medium, high)

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_reasoning_effort_check,
  ADD CONSTRAINT agents_reasoning_effort_check
    CHECK (reasoning_effort IN ('none', 'minimal', 'low', 'medium', 'high', 'xhigh'));

COMMENT ON COLUMN agents.reasoning_effort IS
  'Reasoning effort for OpenAI reasoning models: none, minimal, low, medium, high, xhigh.';
