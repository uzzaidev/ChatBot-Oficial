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

-- Keep valid_plan constraint (plan column) - no trial allowed
ALTER TABLE clients DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE clients ADD CONSTRAINT valid_plan
  CHECK (plan IN ('free', 'pro', 'enterprise'));

-- Fix plan_name and plan_status defaults (were 'trial', should be 'free')
-- These columns were added in 20260311200000_platform_client_subscriptions.sql
ALTER TABLE clients ALTER COLUMN plan_name SET DEFAULT 'free';
ALTER TABLE clients ALTER COLUMN plan_status SET DEFAULT 'free';

-- Update plan_status constraint to also allow 'free'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_status_check
  CHECK (plan_status IN ('free', 'trial', 'active', 'past_due', 'canceled', 'suspended'));

-- Clean up existing rows that have 'trial' defaults
UPDATE clients SET plan_name = 'free' WHERE plan_name = 'trial';
UPDATE clients SET plan_status = 'free' WHERE plan_status = 'trial';
