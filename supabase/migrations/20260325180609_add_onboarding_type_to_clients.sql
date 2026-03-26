-- Add onboarding_type column to clients table
-- Tracks how the WhatsApp number was connected:
-- 'cloud_api' = standard Cloud API migration (number leaves WhatsApp Business App)
-- 'coexistence' = coexistence mode (number works on both WhatsApp Business App + Cloud API)
-- ts
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS onboarding_type TEXT DEFAULT 'cloud_api'
CHECK (onboarding_type IN ('cloud_api', 'coexistence'));

COMMENT ON COLUMN public.clients.onboarding_type
IS 'How the WhatsApp number was onboarded: cloud_api (standard) or coexistence (WA Business App + Cloud API)';
