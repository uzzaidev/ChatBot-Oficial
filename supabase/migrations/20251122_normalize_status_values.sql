-- Migration: Normalize status values to lowercase
-- Created: 2025-11-22
-- Description: Fixes case sensitivity bug by normalizing all status values to lowercase
--
-- Issue: handleHumanHandoff was writing 'Transferido' (capital T) but checkHumanHandoffStatus
--        was checking for 'transferido' (lowercase), causing bot to not skip when in human mode

-- Update all existing status values to lowercase
UPDATE clientes_whatsapp
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Add check constraint to enforce lowercase status values
ALTER TABLE clientes_whatsapp
DROP CONSTRAINT IF EXISTS clientes_whatsapp_status_check;

ALTER TABLE clientes_whatsapp
ADD CONSTRAINT clientes_whatsapp_status_lowercase_check
CHECK (status = LOWER(status));

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT clientes_whatsapp_status_lowercase_check ON clientes_whatsapp
IS 'Ensures all status values are stored in lowercase to avoid case-sensitivity bugs';

-- Verify the migration
DO $$
DECLARE
  uppercase_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO uppercase_count
  FROM clientes_whatsapp
  WHERE status != LOWER(status);
  
  IF uppercase_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % records with uppercase status', uppercase_count;
  END IF;
  
  RAISE NOTICE '✅ Migration successful: All status values normalized to lowercase';
  RAISE NOTICE '✅ Constraint added: status must be lowercase';
END $$;
