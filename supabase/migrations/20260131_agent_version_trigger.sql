-- Migration: Add automatic version tracking for agents
-- Date: 2026-01-31
-- Description: Creates trigger to automatically save agent versions on update

-- =====================================================
-- FUNCTION: Auto-save agent version before update
-- =====================================================

CREATE OR REPLACE FUNCTION save_agent_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
  snapshot_data JSONB;
BEGIN
  -- Get the latest version number for this agent
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM agent_versions
  WHERE agent_id = OLD.id;

  -- Create snapshot of the OLD state (before update)
  snapshot_data := jsonb_build_object(
    'id', OLD.id,
    'client_id', OLD.client_id,
    'name', OLD.name,
    'slug', OLD.slug,
    'avatar_emoji', OLD.avatar_emoji,
    'description', OLD.description,
    'is_active', OLD.is_active,
    'is_archived', OLD.is_archived,
    'response_tone', OLD.response_tone,
    'response_style', OLD.response_style,
    'language', OLD.language,
    'use_emojis', OLD.use_emojis,
    'max_response_length', OLD.max_response_length,
    'role_description', OLD.role_description,
    'primary_goal', OLD.primary_goal,
    'forbidden_topics', OLD.forbidden_topics,
    'always_mention', OLD.always_mention,
    'greeting_message', OLD.greeting_message,
    'fallback_message', OLD.fallback_message,
    'enable_human_handoff', OLD.enable_human_handoff,
    'enable_document_search', OLD.enable_document_search,
    'enable_audio_response', OLD.enable_audio_response,
    'enable_tools', OLD.enable_tools,
    'enable_rag', OLD.enable_rag,
    'rag_threshold', OLD.rag_threshold,
    'rag_max_results', OLD.rag_max_results,
    'primary_provider', OLD.primary_provider,
    'openai_model', OLD.openai_model,
    'groq_model', OLD.groq_model,
    'temperature', OLD.temperature,
    'max_tokens', OLD.max_tokens,
    'max_chat_history', OLD.max_chat_history,
    'batching_delay_seconds', OLD.batching_delay_seconds,
    'message_delay_ms', OLD.message_delay_ms,
    'message_split_enabled', OLD.message_split_enabled,
    'compiled_system_prompt', OLD.compiled_system_prompt,
    'compiled_formatter_prompt', OLD.compiled_formatter_prompt
  );

  -- Only save version if there are meaningful changes
  -- (not just is_active or updated_at changes)
  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.response_tone IS DISTINCT FROM NEW.response_tone OR
    OLD.response_style IS DISTINCT FROM NEW.response_style OR
    OLD.role_description IS DISTINCT FROM NEW.role_description OR
    OLD.primary_goal IS DISTINCT FROM NEW.primary_goal OR
    OLD.greeting_message IS DISTINCT FROM NEW.greeting_message OR
    OLD.fallback_message IS DISTINCT FROM NEW.fallback_message OR
    OLD.temperature IS DISTINCT FROM NEW.temperature OR
    OLD.max_tokens IS DISTINCT FROM NEW.max_tokens OR
    OLD.primary_provider IS DISTINCT FROM NEW.primary_provider OR
    OLD.openai_model IS DISTINCT FROM NEW.openai_model OR
    OLD.groq_model IS DISTINCT FROM NEW.groq_model OR
    OLD.enable_tools IS DISTINCT FROM NEW.enable_tools OR
    OLD.enable_rag IS DISTINCT FROM NEW.enable_rag OR
    OLD.compiled_system_prompt IS DISTINCT FROM NEW.compiled_system_prompt
  ) THEN
    -- Insert the version
    INSERT INTO agent_versions (
      agent_id,
      version_number,
      snapshot,
      change_description,
      created_at
    ) VALUES (
      OLD.id,
      latest_version + 1,
      snapshot_data,
      'Auto-save antes de atualização',
      NOW()
    );
    
    -- Keep only the last 20 versions per agent (cleanup old versions)
    DELETE FROM agent_versions
    WHERE agent_id = OLD.id
    AND id NOT IN (
      SELECT id FROM agent_versions
      WHERE agent_id = OLD.id
      ORDER BY version_number DESC
      LIMIT 20
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-save on agent update
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_save_agent_version ON agents;

-- Create trigger
CREATE TRIGGER trigger_save_agent_version
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION save_agent_version_on_update();

-- =====================================================
-- LOG MIGRATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Agent version auto-save trigger created';
END $$;
