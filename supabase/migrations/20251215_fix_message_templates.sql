-- =====================================================
-- FIX: Message Templates Table
-- =====================================================
-- Description: Fix message_templates table creation and add WABA ID to clients
-- Date: 2025-12-15
-- Issue: Original migration had issues with sequence reference and missing WABA ID field
-- =====================================================

-- =====================================================
-- 1. ADD WABA ID TO CLIENTS TABLE
-- =====================================================
-- WhatsApp Business Account ID should be stored per client

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_waba_id 
  ON public.clients(whatsapp_business_account_id) 
  WHERE whatsapp_business_account_id IS NOT NULL;

COMMENT ON COLUMN public.clients.whatsapp_business_account_id IS 
  'WhatsApp Business Account ID (WABA ID) from Meta Business Manager';

-- =====================================================
-- 2. DROP AND RECREATE MESSAGE_TEMPLATES TABLE
-- =====================================================
-- Drop existing table and all its dependencies safely

DROP TABLE IF EXISTS public.message_templates CASCADE;

-- Recreate with proper configuration
CREATE TABLE public.message_templates (
  -- Primary Key (using gen_random_uuid, no sequence needed)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Meta API Integration
  meta_template_id TEXT, -- Template ID returned by Meta after creation
  waba_id TEXT NOT NULL, -- WhatsApp Business Account ID
  
  -- Template Definition
  name TEXT NOT NULL, -- Template name (lowercase, underscores only)
  category TEXT NOT NULL CHECK (category IN ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
  language TEXT NOT NULL DEFAULT 'pt_BR',
  
  -- Components (stored as JSON)
  components JSONB NOT NULL, -- Array of components: HEADER, BODY, FOOTER, BUTTONS
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')
  ),
  rejection_reason TEXT, -- Reason for rejection (if status = REJECTED)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(client_id, name, language) -- Same template can have multiple languages
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_templates_client_id 
  ON public.message_templates(client_id);

CREATE INDEX idx_templates_status 
  ON public.message_templates(status);

CREATE INDEX idx_templates_client_status 
  ON public.message_templates(client_id, status);

CREATE INDEX idx_templates_name 
  ON public.message_templates(name);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own client templates" ON public.message_templates;
DROP POLICY IF EXISTS "Client admins can create templates" ON public.message_templates;
DROP POLICY IF EXISTS "Client admins can update templates" ON public.message_templates;
DROP POLICY IF EXISTS "Client admins can delete draft templates" ON public.message_templates;

-- Policy: Users can view templates from their own client
CREATE POLICY "Users can view own client templates"
  ON public.message_templates
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Client admins can create templates
CREATE POLICY "Client admins can create templates"
  ON public.message_templates
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- Policy: Client admins can update templates
CREATE POLICY "Client admins can update templates"
  ON public.message_templates
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- Policy: Client admins can delete DRAFT templates only
CREATE POLICY "Client admins can delete draft templates"
  ON public.message_templates
  FOR DELETE
  USING (
    status = 'DRAFT' AND
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.message_templates;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ADD COMMENTS
-- =====================================================

COMMENT ON TABLE public.message_templates IS 
  'WhatsApp Message Templates - Pre-approved messages for initiating conversations outside 24h window';

COMMENT ON COLUMN public.message_templates.id IS 
  'Primary key UUID (generated automatically with gen_random_uuid)';

COMMENT ON COLUMN public.message_templates.client_id IS 
  'Foreign key to clients table - multi-tenant isolation';

COMMENT ON COLUMN public.message_templates.meta_template_id IS 
  'Template ID returned by Meta API after successful creation';

COMMENT ON COLUMN public.message_templates.waba_id IS 
  'WhatsApp Business Account ID (Meta) - can be different from client default';

COMMENT ON COLUMN public.message_templates.name IS 
  'Template name (lowercase, underscores only). Example: order_confirmation';

COMMENT ON COLUMN public.message_templates.category IS 
  'Template category: UTILITY (updates), AUTHENTICATION (OTP), MARKETING (promotions)';

COMMENT ON COLUMN public.message_templates.language IS 
  'Language code (ISO 639-1 + country). Example: pt_BR, en_US, es_ES';

COMMENT ON COLUMN public.message_templates.components IS 
  'JSON array of template components (HEADER, BODY, FOOTER, BUTTONS)';

COMMENT ON COLUMN public.message_templates.status IS 
  'Template status: DRAFT (local), PENDING (awaiting Meta), APPROVED (ready), REJECTED (denied), PAUSED (quality issues), DISABLED (Meta disabled)';

COMMENT ON COLUMN public.message_templates.rejection_reason IS 
  'Meta rejection reason (if status = REJECTED)';

COMMENT ON COLUMN public.message_templates.created_by IS 
  'User who created this template';

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO service_role;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_templates') THEN
    RAISE NOTICE '✅ Table message_templates created successfully';
  ELSE
    RAISE EXCEPTION '❌ Error: Table message_templates was not created';
  END IF;
  
  -- Check if WABA ID column was added to clients
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'whatsapp_business_account_id') THEN
    RAISE NOTICE '✅ Column whatsapp_business_account_id added to clients table';
  ELSE
    RAISE WARNING '⚠️ Warning: Column whatsapp_business_account_id not found in clients table';
  END IF;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
