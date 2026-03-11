-- ============================================================================
-- Migration: Add Calendar OAuth Integration to clients table
-- Description: Adds Google Calendar and Microsoft Calendar OAuth support
--              Tokens stored in Vault (referenced by UUID)
-- Date: 2026-03-10
-- ============================================================================

-- Google Calendar OAuth
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_calendar_user_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_calendar_token_secret_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_calendar_refresh_token_secret_id UUID;

-- Microsoft Calendar OAuth
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS microsoft_calendar_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS microsoft_calendar_user_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS microsoft_calendar_token_secret_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS microsoft_calendar_refresh_token_secret_id UUID;

-- Comments for documentation
COMMENT ON COLUMN public.clients.google_calendar_enabled IS 'Whether Google Calendar OAuth is connected for this client';
COMMENT ON COLUMN public.clients.google_calendar_user_email IS 'Email of the Google account connected (e.g. user@gmail.com)';
COMMENT ON COLUMN public.clients.google_calendar_token_secret_id IS 'Vault secret UUID for Google Calendar access token';
COMMENT ON COLUMN public.clients.google_calendar_refresh_token_secret_id IS 'Vault secret UUID for Google Calendar refresh token';
COMMENT ON COLUMN public.clients.microsoft_calendar_enabled IS 'Whether Microsoft Calendar OAuth is connected for this client';
COMMENT ON COLUMN public.clients.microsoft_calendar_user_email IS 'Email of the Microsoft account connected (e.g. user@outlook.com)';
COMMENT ON COLUMN public.clients.microsoft_calendar_token_secret_id IS 'Vault secret UUID for Microsoft Calendar access token';
COMMENT ON COLUMN public.clients.microsoft_calendar_refresh_token_secret_id IS 'Vault secret UUID for Microsoft Calendar refresh token';
