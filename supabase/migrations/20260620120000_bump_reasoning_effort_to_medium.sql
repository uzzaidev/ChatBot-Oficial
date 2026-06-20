-- Bump default reasoning_effort from 'low' to 'medium' for all agents.
--
-- Why: with reasoning_effort='low' the gpt-5.x reasoning models do little work
-- in the internal reasoning channel and tend to "think out loud" in the message
-- channel, leaking English chain-of-thought to the customer on WhatsApp.
-- 'medium' gives a real reasoning budget and removes that leak at the source.
-- See src/nodes/formatResponse.ts (defensive stripLeakedReasoning) and
-- src/lib/config.ts (runtime default also raised to 'medium').

-- 1) New agents default to 'medium'
ALTER TABLE agents
  ALTER COLUMN reasoning_effort SET DEFAULT 'medium';

-- 2) Existing agents still on the old default are bumped. 'high' is preserved
--    (tenant set it intentionally); only 'low'/NULL move to 'medium'.
UPDATE agents
  SET reasoning_effort = 'medium'
  WHERE reasoning_effort = 'low' OR reasoning_effort IS NULL;

COMMENT ON COLUMN agents.reasoning_effort IS
  'Reasoning budget for gpt-5.x/o-series models. Default medium: low causes '
  'chain-of-thought to leak into the visible response channel.';
