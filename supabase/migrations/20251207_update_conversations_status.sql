-- Migration: Update conversations status enum to support interactive flows
-- Date: 2025-12-07
-- Reason: FlowExecutor creates conversations with status 'fluxo_inicial' and
-- human handoff may set 'transferido'. The existing check constraint only
-- allowed ('bot','waiting','human'), causing inserts to fail.

-- Normalize existing values to lowercase to be safe
UPDATE conversations
SET status = LOWER(status)
WHERE status <> LOWER(status);

-- Relax/extend status constraint
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations
ADD CONSTRAINT conversations_status_check
CHECK (status IN ('bot', 'waiting', 'human', 'transferido', 'fluxo_inicial'));

COMMENT ON CONSTRAINT conversations_status_check ON conversations IS
  'Allowed statuses: bot, waiting, human, transferido, fluxo_inicial (flows)';
