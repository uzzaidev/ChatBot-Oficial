-- Split the single "enable_tools" master switch into per-tool toggles, and
-- make the RAG delivery mode (on-demand tool vs always-injected) an explicit
-- setting instead of an implicit side effect of enable_tools.
--
-- Context: enable_tools used to gate ALL tools at once (transferir_atendimento,
-- buscar_conhecimento, buscar_documento, enviar_resposta_em_audio,
-- registrar_dado_cadastral, calendar tools) AND flip RAG into "always inject
-- into every prompt" mode when it was off. Product decision: tools should be
-- individually toggleable in the agent editor's Advanced tab instead of one
-- catch-all switch. enable_tools itself is left in place (unused going
-- forward) rather than dropped, to avoid a destructive column removal.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS enable_contact_registration BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_calendar_tools BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rag_mode TEXT NOT NULL DEFAULT 'on_demand'
    CHECK (rag_mode IN ('on_demand', 'always_inject'));

COMMENT ON COLUMN public.agents.enable_contact_registration IS
  'Gates the registrar_dado_cadastral tool. Previously always-on whenever enable_tools was true.';
COMMENT ON COLUMN public.agents.enable_calendar_tools IS
  'Manual gate for calendar tools (verificar/criar/alterar/cancelar_evento_agenda), on top of the existing calendar-connection check.';
COMMENT ON COLUMN public.agents.rag_mode IS
  'on_demand: RAG exposed as the buscar_conhecimento tool, called only when the model decides to. always_inject: RAG context fetched and injected into every message regardless of tool calls. Replaces the old implicit behavior tied to enable_tools.';

-- Preserve exact prior behavior for agents that had function calling fully
-- OFF: previously enable_tools=false suppressed every tool regardless of the
-- individual enable_human_handoff/enable_document_search/enable_audio_response
-- flags, and forced RAG into always-inject mode. Without this backfill those
-- agents would silently start exposing tools they never had once enable_tools
-- stops being the gate.
UPDATE public.agents
SET
  enable_human_handoff = false,
  enable_document_search = false,
  enable_audio_response = false,
  enable_contact_registration = false,
  enable_calendar_tools = false,
  rag_mode = 'always_inject'
WHERE enable_tools = false;

-- =====================================================
-- Bring the version-history snapshot trigger up to date so future edits
-- capture the new fields (and so changing them creates a version like every
-- other tool/RAG setting already does).
-- =====================================================

CREATE OR REPLACE FUNCTION save_agent_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
  snapshot_data JSONB;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM agent_versions
  WHERE agent_id = OLD.id;

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
    'enable_contact_registration', OLD.enable_contact_registration,
    'enable_calendar_tools', OLD.enable_calendar_tools,
    'enable_rag', OLD.enable_rag,
    'rag_mode', OLD.rag_mode,
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
    OLD.enable_human_handoff IS DISTINCT FROM NEW.enable_human_handoff OR
    OLD.enable_document_search IS DISTINCT FROM NEW.enable_document_search OR
    OLD.enable_audio_response IS DISTINCT FROM NEW.enable_audio_response OR
    OLD.enable_contact_registration IS DISTINCT FROM NEW.enable_contact_registration OR
    OLD.enable_calendar_tools IS DISTINCT FROM NEW.enable_calendar_tools OR
    OLD.enable_rag IS DISTINCT FROM NEW.enable_rag OR
    OLD.rag_mode IS DISTINCT FROM NEW.rag_mode OR
    OLD.compiled_system_prompt IS DISTINCT FROM NEW.compiled_system_prompt
  ) THEN
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
