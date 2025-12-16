-- =====================================================
-- PHASE 4: ADMIN DASHBOARD - ROLE-BASED ACCESS CONTROL
-- =====================================================
-- Description: Add role, permissions, and is_active columns to user_profiles
--              Update RLS policies for role-based access control
--              Create helper functions for permission checks
-- Date: 2025-10-30
-- =====================================================

-- 1. Add new columns to user_profiles
-- =====================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'client_admin', 'user')),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_client_role ON public.user_profiles(client_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active);

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.role IS 'User role: admin (super admin), client_admin (client administrator), user (regular user)';
COMMENT ON COLUMN public.user_profiles.permissions IS 'Custom permissions JSON object for fine-grained access control';
COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether the user account is active (can be deactivated instead of deleted)';
COMMENT ON COLUMN public.user_profiles.phone IS 'User phone number (optional)';


-- 2. Create helper functions for role checks
-- =====================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = required_role
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is admin or client_admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'client_admin')
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get current user's client_id
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;


-- 3. Update RLS policies for user_profiles
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Client admins can view team members" ON public.user_profiles;

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Users can update own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()) -- Cannot change own role
);

-- Policy: Client admins can view all users in their client
CREATE POLICY "Client admins can view team members"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
);

-- Policy: Client admins can create new users in their client
CREATE POLICY "Client admins can create users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_current_user_client_id()
  AND user_is_admin()
  AND role != 'admin' -- Cannot create super admins
);

-- Policy: Client admins can update users in their client (except admins)
CREATE POLICY "Client admins can update team members"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
  AND id != auth.uid() -- Cannot update self through this policy
)
WITH CHECK (
  client_id = get_current_user_client_id()
  AND role != 'admin' -- Cannot promote to super admin
);

-- Policy: Client admins can deactivate users (soft delete)
CREATE POLICY "Client admins can deactivate users"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
  AND id != auth.uid() -- Cannot deactivate self
);

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (user_has_role('admin'))
WITH CHECK (user_has_role('admin'));


-- 4. Create user_invites table (adapted for client_id instead of tenant_id)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client_admin', 'user')),
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for user_invites
CREATE INDEX IF NOT EXISTS idx_user_invites_client_id ON public.user_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);

-- Trigger for updated_at
CREATE TRIGGER update_user_invites_updated_at
BEFORE UPDATE ON public.user_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for user_invites
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Client admins can create invites in their client
CREATE POLICY "Client admins can create invites"
ON public.user_invites
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_current_user_client_id()
  AND user_is_admin()
);

-- Client admins can view invites from their client
CREATE POLICY "Client admins can view invites"
ON public.user_invites
FOR SELECT
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
);

-- Client admins can update/revoke invites in their client
CREATE POLICY "Client admins can update invites"
ON public.user_invites
FOR UPDATE
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
);

-- Client admins can delete invites
CREATE POLICY "Client admins can delete invites"
ON public.user_invites
FOR DELETE
TO authenticated
USING (
  client_id = get_current_user_client_id()
  AND user_is_admin()
);

-- Anyone can view their own invite (for accepting)
CREATE POLICY "Users can view own invite by email"
ON public.user_invites
FOR SELECT
TO anon, authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));


-- 5. Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.user_invites IS 'Stores email invitations for new users to join a client workspace';
COMMENT ON COLUMN public.user_invites.invite_token IS 'Unique token used in invitation link (UUID or secure random string)';
COMMENT ON COLUMN public.user_invites.status IS 'Invitation status: pending, accepted, expired, or revoked';
COMMENT ON COLUMN public.user_invites.expires_at IS 'Invitation expiration date (default 7 days from creation)';


-- 6. Create function to auto-expire invites
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_expire_invites()
RETURNS void AS $$
BEGIN
  UPDATE public.user_invites
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a cron job to run this daily
-- This requires pg_cron extension (run manually if not available)
-- SELECT cron.schedule('auto-expire-invites', '0 0 * * *', 'SELECT public.auto_expire_invites()');


-- 7. Migration complete message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Phase 4 Admin Dashboard Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  ✓ Added role, permissions, is_active, phone to user_profiles';
  RAISE NOTICE '  ✓ Created helper functions: get_current_user_role(), user_has_role(), user_is_admin()';
  RAISE NOTICE '  ✓ Updated RLS policies for role-based access control';
  RAISE NOTICE '  ✓ Created user_invites table with client_id isolation';
  RAISE NOTICE '  ✓ Created auto_expire_invites() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create first admin user: UPDATE user_profiles SET role = ''client_admin'' WHERE email = ''admin@example.com''';
  RAISE NOTICE '  2. Create API routes: /api/admin/users';
  RAISE NOTICE '  3. Create admin frontend pages: /app/admin/*';
  RAISE NOTICE '  4. Update middleware for role protection';
  RAISE NOTICE '========================================';
END $$;
