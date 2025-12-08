-- =====================================================
-- WhatsApp Message Templates Table
-- =====================================================
-- Purpose: Store WhatsApp message templates for multi-tenant system
-- Allows clients to create, submit for approval, and send pre-approved templates
-- Author: Claude AI Assistant
-- Date: 2024-12-08
-- =====================================================

-- Create message_templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  -- Primary Key
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
-- Indexes
-- =====================================================

-- Index for filtering by client
CREATE INDEX IF NOT EXISTS idx_templates_client_id 
  ON public.message_templates(client_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_templates_status 
  ON public.message_templates(status);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_templates_client_status 
  ON public.message_templates(client_id, status);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_templates_name 
  ON public.message_templates(name);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

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
-- Triggers
-- =====================================================

-- Create trigger function if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Table and Column Comments
-- =====================================================

COMMENT ON TABLE public.message_templates IS 
  'WhatsApp Message Templates - Pre-approved messages for initiating conversations outside 24h window';

COMMENT ON COLUMN public.message_templates.id IS 
  'Primary key UUID';

COMMENT ON COLUMN public.message_templates.client_id IS 
  'Foreign key to clients table - multi-tenant isolation';

COMMENT ON COLUMN public.message_templates.meta_template_id IS 
  'Template ID returned by Meta API after successful creation';

COMMENT ON COLUMN public.message_templates.waba_id IS 
  'WhatsApp Business Account ID (Meta)';

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
-- Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT USAGE ON SEQUENCE message_templates_id_seq TO authenticated;

-- =====================================================
-- End of Migration
-- =====================================================
