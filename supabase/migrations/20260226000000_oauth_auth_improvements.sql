-- Make client_id nullable for OAuth pending users (no client yet)
ALTER TABLE public.user_profiles
  ALTER COLUMN client_id DROP NOT NULL;

-- Add new columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email'
    CHECK (auth_provider IN ('email', 'google', 'github', 'azure', 'invite')),
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'
    CHECK (approval_status IN ('approved', 'pending', 'rejected'));

-- Update existing users: already confirmed and approved
UPDATE public.user_profiles
SET email_verified = true, approval_status = 'approved'
WHERE auth_provider = 'email';

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_provider
  ON public.user_profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_user_profiles_approval_status
  ON public.user_profiles(approval_status);
