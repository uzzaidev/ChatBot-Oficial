-- =====================================================
-- AI GATEWAY - SEED MODELS REGISTRY
-- =====================================================
-- Description: Populate ai_models_registry with supported models from 4 providers
-- Date: 2025-12-12
-- Phase: 1 - Database Schema
-- =====================================================
-- NOTE: Prices are as of December 2025 and should be updated periodically

-- =====================================================
-- 1. OPENAI MODELS (Already in use)
-- =====================================================
INSERT INTO ai_models_registry (
  provider,
  model_name,
  gateway_identifier,
  capabilities,
  context_window,
  max_output_tokens,
  input_price_per_million,
  output_price_per_million,
  is_active,
  description
) VALUES
-- GPT-4o (Flagship multimodal model)
(
  'openai',
  'gpt-4o',
  'openai/gpt-4o',
  '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb,
  128000,
  16384,
  2.50,
  10.00,
  true,
  'OpenAI GPT-4o - Flagship multimodal model with vision, tools, and streaming support'
),
-- GPT-4o Mini (Cost-effective variant)
(
  'openai',
  'gpt-4o-mini',
  'openai/gpt-4o-mini',
  '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb,
  128000,
  16384,
  0.150,
  0.600,
  true,
  'OpenAI GPT-4o Mini - Cost-effective multimodal model with same capabilities as GPT-4o'
)
ON CONFLICT (gateway_identifier) DO UPDATE SET
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  updated_at = NOW();

-- =====================================================
-- 2. GROQ MODELS (Already in use)
-- =====================================================
INSERT INTO ai_models_registry (
  provider,
  model_name,
  gateway_identifier,
  capabilities,
  context_window,
  max_output_tokens,
  input_price_per_million,
  output_price_per_million,
  is_active,
  description
) VALUES
-- Llama 3.3 70B (Fast inference on Groq hardware)
(
  'groq',
  'llama-3.3-70b-versatile',
  'groq/llama-3.3-70b-versatile',
  '{"text": true, "tools": true, "streaming": true}'::jsonb,
  131072,
  32768,
  0.590,
  0.790,
  true,
  'Meta Llama 3.3 70B on Groq - Ultra-fast inference with tool calling support'
)
ON CONFLICT (gateway_identifier) DO UPDATE SET
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  updated_at = NOW();

-- =====================================================
-- 3. ANTHROPIC MODELS (NEW)
-- =====================================================
INSERT INTO ai_models_registry (
  provider,
  model_name,
  gateway_identifier,
  capabilities,
  context_window,
  max_output_tokens,
  input_price_per_million,
  output_price_per_million,
  cached_input_price_per_million,
  is_active,
  description
) VALUES
-- Claude 3.5 Sonnet (Latest version with prompt caching)
(
  'anthropic',
  'claude-3-5-sonnet-20241022',
  'anthropic/claude-3-5-sonnet-20241022',
  '{"text": true, "vision": true, "tools": true, "streaming": true, "caching": true}'::jsonb,
  200000,
  8192,
  3.00,
  15.00,
  0.30, -- 90% discount on cached tokens
  true,
  'Anthropic Claude 3.5 Sonnet (Oct 2024) - Balanced performance with prompt caching'
),
-- Claude 3 Opus (Most capable, expensive)
(
  'anthropic',
  'claude-3-opus-20240229',
  'anthropic/claude-3-opus-20240229',
  '{"text": true, "vision": true, "tools": true, "streaming": true, "caching": true}'::jsonb,
  200000,
  4096,
  15.00,
  75.00,
  1.50, -- 90% discount on cached tokens
  true,
  'Anthropic Claude 3 Opus - Most capable model for complex tasks with prompt caching'
)
ON CONFLICT (gateway_identifier) DO UPDATE SET
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  cached_input_price_per_million = EXCLUDED.cached_input_price_per_million,
  updated_at = NOW();

-- =====================================================
-- 4. GOOGLE MODELS (NEW)
-- =====================================================
INSERT INTO ai_models_registry (
  provider,
  model_name,
  gateway_identifier,
  capabilities,
  context_window,
  max_output_tokens,
  input_price_per_million,
  output_price_per_million,
  is_active,
  description
) VALUES
-- Gemini 2.0 Flash (Experimental, free tier)
(
  'google',
  'gemini-2.0-flash-exp',
  'google/gemini-2.0-flash-exp',
  '{"text": true, "vision": true, "tools": true, "streaming": true}'::jsonb,
  1000000,
  8192,
  0.00,
  0.00,
  true,
  'Google Gemini 2.0 Flash (Experimental) - Free tier multimodal model with massive context window'
)
ON CONFLICT (gateway_identifier) DO UPDATE SET
  input_price_per_million = EXCLUDED.input_price_per_million,
  output_price_per_million = EXCLUDED.output_price_per_million,
  updated_at = NOW();

-- =====================================================
-- SEED DEFAULT PLAN BUDGETS
-- =====================================================
-- Create default budget configurations for standard plans

INSERT INTO plan_budgets (
  plan_name,
  budget_type,
  budget_limit,
  budget_period,
  alert_threshold_80,
  alert_threshold_90,
  alert_threshold_100,
  pause_at_limit
) VALUES
-- Free plan: 10k tokens/day
(
  'free',
  'tokens',
  10000,
  'daily',
  true,
  true,
  true,
  true -- Auto-pause when limit reached
),
-- Basic plan: 100k tokens/day or R$ 50/month
(
  'basic',
  'tokens',
  100000,
  'daily',
  true,
  true,
  true,
  false -- Warning only, no auto-pause
),
-- Pro plan: 1M tokens/day or R$ 500/month
(
  'pro',
  'tokens',
  1000000,
  'daily',
  true,
  true,
  true,
  false
),
-- Enterprise: Unlimited (very high limit)
(
  'enterprise',
  'tokens',
  100000000,
  'monthly',
  false,
  false,
  true, -- Alert only at 100%
  false
)
ON CONFLICT (plan_name) DO UPDATE SET
  budget_limit = EXCLUDED.budget_limit,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify data:

-- Check all models are seeded:
-- SELECT provider, model_name, gateway_identifier, is_active
-- FROM ai_models_registry
-- ORDER BY provider, model_name;

-- Check plan budgets:
-- SELECT plan_name, budget_type, budget_limit, budget_period
-- FROM plan_budgets
-- ORDER BY plan_name;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE ai_models_registry IS 'Registry seeded with 6 models from 4 providers: OpenAI (2), Groq (1), Anthropic (2), Google (1)';
COMMENT ON TABLE plan_budgets IS 'Seeded with 4 default plans: free, basic, pro, enterprise';

-- =====================================================
-- PRICING UPDATE NOTES
-- =====================================================
-- Prices should be updated periodically via cron job:
-- src/app/api/cron/sync-model-pricing/route.ts
--
-- Current pricing sources (as of 2025-12-12):
-- - OpenAI: https://openai.com/api/pricing/
-- - Groq: https://groq.com/pricing/
-- - Anthropic: https://www.anthropic.com/pricing
-- - Google: https://ai.google.dev/pricing
