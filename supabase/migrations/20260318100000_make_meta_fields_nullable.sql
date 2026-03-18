-- Migration: Make meta fields nullable and add pending_setup status
-- 
-- Reason: During self-service registration, clients are created BEFORE they
-- connect their WhatsApp via Embedded Signup OAuth. These Meta fields are only
-- populated in the OAuth callback (/api/auth/meta/callback), so they must be
-- nullable to allow the initial client record creation.
--
-- meta_verify_token_secret_id was already made nullable in 20260217000001.

ALTER TABLE clients
  ALTER COLUMN meta_access_token_secret_id DROP NOT NULL;

ALTER TABLE clients
  ALTER COLUMN meta_phone_number_id DROP NOT NULL;

-- Add 'pending_setup' to valid_status constraint
-- New clients start as pending_setup until they complete WhatsApp Embedded Signup
ALTER TABLE clients DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE clients ADD CONSTRAINT valid_status
  CHECK (status IN ('active', 'suspended', 'trial', 'cancelled', 'pending_setup'));
