-- ============================================
-- OpenAI Usage Cache Table
-- ============================================
-- Persists fetched OpenAI usage data so subsequent
-- page loads are instant and only new dates need
-- to be fetched from the OpenAI API.
-- ============================================

CREATE TABLE IF NOT EXISTS public.openai_usage_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Usage record data
  usage_date DATE NOT NULL,
  model_name TEXT NOT NULL,
  api_source TEXT NOT NULL,          -- e.g. "completions", "embeddings"
  api_source_label TEXT NOT NULL,    -- e.g. "Completions", "Embeddings"
  
  -- Metrics
  num_model_requests INTEGER DEFAULT 0,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  
  -- Costs
  estimated_cost_usd NUMERIC(12, 6) DEFAULT 0,
  real_cost_usd NUMERIC(12, 6),
  has_real_cost BOOLEAN DEFAULT false,
  
  -- Metadata
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One record per client + date + model + source endpoint
  UNIQUE(client_id, usage_date, model_name, api_source)
);

-- Index for fast queries by client + date range
CREATE INDEX idx_openai_usage_cache_client_date 
  ON public.openai_usage_cache(client_id, usage_date DESC);

-- Enable RLS
ALTER TABLE public.openai_usage_cache ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bypasses RLS anyway)
-- Users can read their own client's cached data
CREATE POLICY "Users can view own client usage cache"
  ON public.openai_usage_cache
  FOR SELECT
  USING (
    client_id IN (
      SELECT up.client_id 
      FROM public.user_profiles up 
      WHERE up.id = auth.uid()
    )
  );

-- Only service role can insert/update/delete (handled server-side)
CREATE POLICY "Service role manages usage cache"
  ON public.openai_usage_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_openai_usage_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_openai_usage_cache_updated_at
  BEFORE UPDATE ON public.openai_usage_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_openai_usage_cache_updated_at();

-- Comment
COMMENT ON TABLE public.openai_usage_cache IS 
  'Cache of OpenAI usage data fetched from their Admin API. Avoids repeated API calls.';
