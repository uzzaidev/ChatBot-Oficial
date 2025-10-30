--
-- PostgreSQL database dump
--

\restrict RcVpj46A8eexg1SyR8wSBqPafdtcaHL3tH9bEhRXV2gpjXTatz7s1rauJWvjfwN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

-- Started on 2025-10-30 17:52:14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 37 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 37
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 564 (class 1255 OID 28459)
-- Name: auto_expire_invites(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_expire_invites() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.user_invites
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;


ALTER FUNCTION public.auto_expire_invites() OWNER TO postgres;

--
-- TOC entry 651 (class 1255 OID 27225)
-- Name: backfill_operation_type(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.backfill_operation_type() RETURNS TABLE(updated_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 1. Whisper → transcription
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "transcription"}'::JSONB
  WHERE source = 'whisper'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. Groq → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'groq'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 3. OpenAI text-embedding → embedding
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "embedding"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'text-embedding%'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 4. OpenAI gpt-4o sem conversation_id → vision ou pdf_summary
  -- (Não podemos diferenciar automaticamente, deixar como 'unknown')
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "unknown"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 5. OpenAI gpt-4o com conversation_id → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NOT NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;


ALTER FUNCTION public.backfill_operation_type() OWNER TO postgres;

--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 651
-- Name: FUNCTION backfill_operation_type(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.backfill_operation_type() IS 'Atualiza logs existentes com operation_type baseado em heurísticas (whisper=transcription, groq=chat, etc)';


--
-- TOC entry 456 (class 1255 OID 25644)
-- Name: clientes_whatsapp_view_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.clientes_whatsapp_view_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO clientes_whatsapp (telefone, nome, status, created_at)
  VALUES (NEW.telefone, NEW.nome, NEW.status, COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (telefone)
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, clientes_whatsapp.nome),
    status = COALESCE(EXCLUDED.status, clientes_whatsapp.status);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.clientes_whatsapp_view_insert() OWNER TO postgres;

--
-- TOC entry 437 (class 1255 OID 25646)
-- Name: clientes_whatsapp_view_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.clientes_whatsapp_view_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET
    telefone = NEW.telefone,
    nome = NEW.nome,
    status = NEW.status,
    created_at = NEW.created_at
  WHERE telefone = OLD.telefone;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.clientes_whatsapp_view_update() OWNER TO postgres;

--
-- TOC entry 462 (class 1255 OID 26014)
-- Name: create_client_secret(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Criar secret usando a função nativa do Supabase Vault
  SELECT vault.create_secret(secret_value, secret_name, secret_description) INTO secret_id;

  RETURN secret_id;
END;
$$;


ALTER FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text) OWNER TO postgres;

--
-- TOC entry 424 (class 1255 OID 26038)
-- Name: get_client_secret(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_client_secret(secret_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;


ALTER FUNCTION public.get_client_secret(secret_id uuid) OWNER TO postgres;

--
-- TOC entry 647 (class 1255 OID 24327)
-- Name: get_conversation_summary(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(conversation_id uuid, phone text, name text, status text, last_message text, last_update timestamp with time zone, message_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.phone,
    c.name,
    c.status,
    c.last_message,
    c.last_update,
    COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.client_id = p_client_id
  GROUP BY c.id, c.phone, c.name, c.status, c.last_message, c.last_update
  ORDER BY c.last_update DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer) OWNER TO postgres;

--
-- TOC entry 512 (class 1255 OID 28415)
-- Name: get_current_user_client_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_client_id() RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION public.get_current_user_client_id() OWNER TO postgres;

--
-- TOC entry 435 (class 1255 OID 28413)
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION public.get_current_user_role() OWNER TO postgres;

--
-- TOC entry 662 (class 1255 OID 27005)
-- Name: get_daily_usage(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(date date, source text, total_tokens bigint, total_cost numeric, request_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ul.created_at) as date,
    ul.source,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(ul.created_at), ul.source
  ORDER BY date DESC, source;
END;
$$;


ALTER FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer) OWNER TO postgres;

--
-- TOC entry 441 (class 1255 OID 27056)
-- Name: get_model_pricing(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text) RETURNS TABLE(prompt_price numeric, completion_price numeric, unit text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.prompt_price,
    pc.completion_price,
    pc.unit
  FROM pricing_config pc
  WHERE pc.client_id = p_client_id
    AND pc.provider = p_provider
    AND pc.model = p_model
  LIMIT 1;
END;
$$;


ALTER FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text) OWNER TO postgres;

--
-- TOC entry 689 (class 1255 OID 27007)
-- Name: get_monthly_summary(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_month integer DEFAULT (EXTRACT(month FROM now()))::integer) RETURNS TABLE(source text, model text, total_tokens bigint, prompt_tokens bigint, completion_tokens bigint, total_cost numeric, request_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.prompt_tokens)::BIGINT as prompt_tokens,
    SUM(ul.completion_tokens)::BIGINT as completion_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND EXTRACT(YEAR FROM ul.created_at) = p_year
    AND EXTRACT(MONTH FROM ul.created_at) = p_month
  GROUP BY ul.source, ul.model
  ORDER BY total_tokens DESC;
END;
$$;


ALTER FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer, p_month integer) OWNER TO postgres;

--
-- TOC entry 412 (class 1255 OID 27006)
-- Name: get_usage_by_conversation(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20) RETURNS TABLE(phone text, conversation_name text, total_tokens bigint, total_cost numeric, request_count bigint, openai_tokens bigint, groq_tokens bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.phone,
    COALESCE(cw.nome, 'Sem nome') as conversation_name,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count,
    SUM(CASE WHEN ul.source = 'openai' THEN ul.total_tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN ul.source = 'groq' THEN ul.total_tokens ELSE 0 END)::BIGINT as groq_tokens
  FROM usage_logs ul
  LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone::TEXT AND cw.client_id = p_client_id
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.phone, cw.nome
  ORDER BY total_tokens DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer, p_limit integer) OWNER TO postgres;

--
-- TOC entry 452 (class 1255 OID 27224)
-- Name: get_usage_by_operation_type(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(source text, model text, operation_type text, total_tokens bigint, total_cost numeric, request_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    COALESCE(ul.metadata->>'operation_type', 'unknown') as operation_type,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.source, ul.model, ul.metadata->>'operation_type'
  ORDER BY total_cost DESC;
END;
$$;


ALTER FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer) OWNER TO postgres;

--
-- TOC entry 4391 (class 0 OID 0)
-- Dependencies: 452
-- Name: FUNCTION get_usage_by_operation_type(p_client_id uuid, p_days integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer) IS 'Retorna uso de APIs agrupado por tipo de operação (transcription, vision, pdf_summary, chat, embedding)';


--
-- TOC entry 518 (class 1255 OID 24328)
-- Name: get_usage_summary(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(source text, total_tokens bigint, total_messages bigint, total_cost numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    SUM(ul.tokens_used) as total_tokens,
    SUM(ul.messages_sent) as total_messages,
    SUM(ul.cost_usd) as total_cost
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY ul.source;
END;
$$;


ALTER FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) OWNER TO postgres;

--
-- TOC entry 459 (class 1255 OID 26409)
-- Name: get_user_client_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_client_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION public.get_user_client_id() OWNER TO postgres;

--
-- TOC entry 4394 (class 0 OID 0)
-- Dependencies: 459
-- Name: FUNCTION get_user_client_id(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_user_client_id() IS 'Retorna client_id do usuário autenticado (usado em RLS)';


--
-- TOC entry 634 (class 1255 OID 19078)
-- Name: get_user_tenant_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_tenant_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_tenant_id INTEGER;
  user_email TEXT;
BEGIN
  -- Extrair email do JWT do Supabase
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar tenant_id do usuário
  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE email = user_email
    AND is_active = true
  LIMIT 1;
  
  RETURN user_tenant_id;
END;
$$;


ALTER FUNCTION public.get_user_tenant_id() OWNER TO postgres;

--
-- TOC entry 532 (class 1255 OID 27008)
-- Name: get_weekly_evolution(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer DEFAULT 12) RETURNS TABLE(week_start date, week_number integer, total_tokens bigint, openai_tokens bigint, groq_tokens bigint, total_cost numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT 
      DATE_TRUNC('week', ul.created_at)::DATE as week_start,
      EXTRACT(WEEK FROM ul.created_at)::INTEGER as week_number,
      ul.source,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.cost_usd) as cost
    FROM usage_logs ul
    WHERE ul.client_id = p_client_id
      AND ul.created_at >= DATE_TRUNC('week', NOW()) - ((p_weeks - 1) || ' weeks')::INTERVAL
    GROUP BY DATE_TRUNC('week', ul.created_at), EXTRACT(WEEK FROM ul.created_at), ul.source
  )
  SELECT
    w.week_start,
    w.week_number,
    SUM(w.tokens)::BIGINT as total_tokens,
    SUM(CASE WHEN w.source = 'openai' THEN w.tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN w.source = 'groq' THEN w.tokens ELSE 0 END)::BIGINT as groq_tokens,
    SUM(w.cost)::NUMERIC as total_cost
  FROM weeks w
  GROUP BY w.week_start, w.week_number
  ORDER BY w.week_start ASC;
END;
$$;


ALTER FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer) OWNER TO postgres;

--
-- TOC entry 682 (class 1255 OID 26405)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, client_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.raw_user_meta_data->>'client_id')::UUID,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 682
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente user_profile quando novo usuário se registra';


--
-- TOC entry 449 (class 1255 OID 21722)
-- Name: match_documents(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- TOC entry 480 (class 1255 OID 26280)
-- Name: match_documents(public.vector, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (filter_client_id IS NULL OR documents.client_id = filter_client_id)
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid) OWNER TO postgres;

--
-- TOC entry 466 (class 1255 OID 26062)
-- Name: update_client_secret(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Usar função nativa do Vault (mantém name e description existentes como NULL)
  PERFORM vault.update_secret(secret_id, new_secret_value, NULL, NULL);

  RETURN TRUE;
END;
$$;


ALTER FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text) OWNER TO postgres;

--
-- TOC entry 649 (class 1255 OID 27058)
-- Name: update_pricing_config_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_pricing_config_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_pricing_config_timestamp() OWNER TO postgres;

--
-- TOC entry 524 (class 1255 OID 17814)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 405 (class 1259 OID 27030)
-- Name: pricing_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricing_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    prompt_price numeric(10,8) DEFAULT 0 NOT NULL,
    completion_price numeric(10,8) DEFAULT 0 NOT NULL,
    unit text DEFAULT 'per_1k_tokens'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pricing_config OWNER TO postgres;

--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE pricing_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pricing_config IS 'Configurable pricing for AI providers per client';


--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 405
-- Name: COLUMN pricing_config.prompt_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_config.prompt_price IS 'Price per 1K prompt tokens (or per minute for audio)';


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 405
-- Name: COLUMN pricing_config.completion_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_config.completion_price IS 'Price per 1K completion tokens';


--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 405
-- Name: COLUMN pricing_config.unit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_config.unit IS 'Pricing unit: per_1k_tokens or per_minute';


--
-- TOC entry 565 (class 1255 OID 27057)
-- Name: upsert_pricing_config(uuid, text, text, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text DEFAULT 'per_1k_tokens'::text) RETURNS public.pricing_config
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_config pricing_config;
BEGIN
  INSERT INTO pricing_config (
    client_id,
    provider,
    model,
    prompt_price,
    completion_price,
    unit,
    updated_at
  ) VALUES (
    p_client_id,
    p_provider,
    p_model,
    p_prompt_price,
    p_completion_price,
    p_unit,
    NOW()
  )
  ON CONFLICT (client_id, provider, model)
  DO UPDATE SET
    prompt_price = p_prompt_price,
    completion_price = p_completion_price,
    unit = p_unit,
    updated_at = NOW()
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$$;


ALTER FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text) OWNER TO postgres;

--
-- TOC entry 423 (class 1255 OID 19079)
-- Name: user_has_role(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_has_role(required_role text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = required_role
    AND is_active = true
  );
$$;


ALTER FUNCTION public.user_has_role(required_role text) OWNER TO postgres;

--
-- TOC entry 434 (class 1255 OID 28414)
-- Name: user_is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'client_admin')
    AND is_active = true
  );
$$;


ALTER FUNCTION public.user_is_admin() OWNER TO postgres;

--
-- TOC entry 384 (class 1259 OID 21377)
-- Name: clientes_whatsapp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes_whatsapp (
    telefone numeric NOT NULL,
    nome text,
    status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid NOT NULL
);


ALTER TABLE public.clientes_whatsapp OWNER TO postgres;

--
-- TOC entry 398 (class 1259 OID 25640)
-- Name: Clientes WhatsApp; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Clientes WhatsApp" WITH (security_invoker='on') AS
 SELECT telefone,
    nome,
    status,
    created_at
   FROM public.clientes_whatsapp;


ALTER VIEW public."Clientes WhatsApp" OWNER TO postgres;

--
-- TOC entry 397 (class 1259 OID 25612)
-- Name: Clientes WhatsApp_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Clientes WhatsApp_backup" (
    telefone numeric,
    nome text,
    status text,
    created_at timestamp with time zone
);


ALTER TABLE public."Clientes WhatsApp_backup" OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 26184)
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    meta_access_token_secret_id uuid NOT NULL,
    meta_verify_token_secret_id uuid NOT NULL,
    meta_phone_number_id text NOT NULL,
    meta_display_phone text,
    openai_api_key_secret_id uuid,
    openai_model text DEFAULT 'gpt-4o'::text,
    groq_api_key_secret_id uuid,
    groq_model text DEFAULT 'llama-3.3-70b-versatile'::text,
    system_prompt text NOT NULL,
    formatter_prompt text,
    settings jsonb DEFAULT '{"enable_rag": true, "max_tokens": 2000, "temperature": 0.7, "enable_tools": true, "max_chat_history": 15, "enable_human_handoff": true, "message_split_enabled": true, "batching_delay_seconds": 10}'::jsonb,
    notification_email text,
    notification_webhook_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    primary_model_provider text DEFAULT 'groq'::text NOT NULL,
    CONSTRAINT clients_primary_model_provider_check CHECK ((primary_model_provider = ANY (ARRAY['openai'::text, 'groq'::text]))),
    CONSTRAINT valid_plan CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text]))),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'trial'::text, 'cancelled'::text])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 400
-- Name: COLUMN clients.primary_model_provider; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.primary_model_provider IS 'AI provider usado para conversação principal. openai=GPT-4o (caro, inteligente), groq=Llama (rápido, econômico)';


--
-- TOC entry 401 (class 1259 OID 26206)
-- Name: client_secrets_decrypted; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.client_secrets_decrypted AS
 SELECT id AS client_id,
    name,
    slug,
    status,
    public.get_client_secret(meta_access_token_secret_id) AS meta_access_token,
    public.get_client_secret(meta_verify_token_secret_id) AS meta_verify_token,
    meta_phone_number_id,
        CASE
            WHEN (openai_api_key_secret_id IS NOT NULL) THEN public.get_client_secret(openai_api_key_secret_id)
            ELSE NULL::text
        END AS openai_api_key,
        CASE
            WHEN (groq_api_key_secret_id IS NOT NULL) THEN public.get_client_secret(groq_api_key_secret_id)
            ELSE NULL::text
        END AS groq_api_key,
    system_prompt,
    formatter_prompt,
    settings,
    notification_email
   FROM public.clients c
  WHERE (status = 'active'::text);


ALTER VIEW public.client_secrets_decrypted OWNER TO postgres;

--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 401
-- Name: VIEW client_secrets_decrypted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.client_secrets_decrypted IS 'View with decrypted secrets - USE ONLY WITH SERVICE ROLE';


--
-- TOC entry 394 (class 1259 OID 24249)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    phone text NOT NULL,
    name text,
    status text DEFAULT 'bot'::text,
    assigned_to text,
    last_message text,
    last_update timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversations_status_check CHECK ((status = ANY (ARRAY['bot'::text, 'waiting'::text, 'human'::text])))
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 21714)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    client_id uuid NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 385 (class 1259 OID 21713)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 385
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 393 (class 1259 OID 24191)
-- Name: execution_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.execution_logs (
    id bigint NOT NULL,
    execution_id uuid NOT NULL,
    node_name text NOT NULL,
    input_data jsonb,
    output_data jsonb,
    error jsonb,
    status text NOT NULL,
    duration_ms integer,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT execution_logs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'error'::text])))
);


ALTER TABLE public.execution_logs OWNER TO postgres;

--
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE execution_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.execution_logs IS 'Logs detalhados de execução de nodes para debug visual';


--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.execution_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.execution_id IS 'UUID que agrupa todos os logs de uma execução completa';


--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.node_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.node_name IS 'Nome do node executado (ex: parseMessage, _START, _END)';


--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.input_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.input_data IS 'Snapshot dos dados de entrada do node';


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.output_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.output_data IS 'Snapshot dos dados de saída do node';


--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.duration_ms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.duration_ms IS 'Tempo de execução do node em milissegundos';


--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN execution_logs.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.execution_logs.metadata IS 'Contexto adicional: client_id, user_phone, message_type, etc';


--
-- TOC entry 392 (class 1259 OID 24190)
-- Name: execution_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.execution_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execution_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 392
-- Name: execution_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.execution_logs_id_seq OWNED BY public.execution_logs.id;


--
-- TOC entry 395 (class 1259 OID 24268)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    conversation_id uuid,
    phone text NOT NULL,
    name text,
    content text NOT NULL,
    type text DEFAULT 'text'::text,
    direction text NOT NULL,
    status text DEFAULT 'sent'::text,
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb,
    CONSTRAINT messages_direction_check CHECK ((direction = ANY (ARRAY['incoming'::text, 'outgoing'::text]))),
    CONSTRAINT messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'queued'::text]))),
    CONSTRAINT messages_type_check CHECK ((type = ANY (ARRAY['text'::text, 'audio'::text, 'image'::text, 'document'::text, 'video'::text])))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 388 (class 1259 OID 22852)
-- Name: n8n_chat_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.n8n_chat_histories (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    message jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc -3'::text),
    client_id uuid NOT NULL
);


ALTER TABLE public.n8n_chat_histories OWNER TO postgres;

--
-- TOC entry 387 (class 1259 OID 22851)
-- Name: n8n_chat_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.n8n_chat_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.n8n_chat_histories_id_seq OWNER TO postgres;

--
-- TOC entry 4436 (class 0 OID 0)
-- Dependencies: 387
-- Name: n8n_chat_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.n8n_chat_histories_id_seq OWNED BY public.n8n_chat_histories.id;


--
-- TOC entry 404 (class 1259 OID 26972)
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    conversation_id uuid,
    phone text NOT NULL,
    source text NOT NULL,
    model text,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    cost_usd numeric(10,6) DEFAULT 0,
    messages_sent integer DEFAULT 0,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT usage_logs_source_check CHECK ((source = ANY (ARRAY['openai'::text, 'groq'::text, 'whisper'::text, 'meta'::text])))
);


ALTER TABLE public.usage_logs OWNER TO postgres;

--
-- TOC entry 407 (class 1259 OID 28423)
-- Name: user_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    invited_by_user_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    invite_token text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_invites_role_check CHECK ((role = ANY (ARRAY['client_admin'::text, 'user'::text]))),
    CONSTRAINT user_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text])))
);


ALTER TABLE public.user_invites OWNER TO postgres;

--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE user_invites; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_invites IS 'Stores email invitations for new users to join a client workspace';


--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN user_invites.invite_token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_invites.invite_token IS 'Unique token used in invitation link (UUID or secure random string)';


--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN user_invites.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_invites.status IS 'Invitation status: pending, accepted, expired, or revoked';


--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN user_invites.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_invites.expires_at IS 'Invitation expiration date (default 7 days from creation)';


--
-- TOC entry 402 (class 1259 OID 26382)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    phone text,
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'client_admin'::text, 'user'::text])))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários - link entre auth.users e clients';


--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.id IS 'UUID do usuário (auth.users.id)';


--
-- TOC entry 4446 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.client_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.client_id IS 'Cliente ao qual o usuário pertence';


--
-- TOC entry 4447 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.email IS 'Email do usuário (duplicado de auth.users para conveniência)';


--
-- TOC entry 4448 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.role IS 'User role: admin (super admin), client_admin (client administrator), user (regular user)';


--
-- TOC entry 4449 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.permissions IS 'Custom permissions JSON object for fine-grained access control';


--
-- TOC entry 4450 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether the user account is active (can be deactivated instead of deleted)';


--
-- TOC entry 4451 (class 0 OID 0)
-- Dependencies: 402
-- Name: COLUMN user_profiles.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.phone IS 'User phone number (optional)';


--
-- TOC entry 4025 (class 2604 OID 21717)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 4028 (class 2604 OID 24194)
-- Name: execution_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execution_logs ALTER COLUMN id SET DEFAULT nextval('public.execution_logs_id_seq'::regclass);


--
-- TOC entry 4026 (class 2604 OID 22855)
-- Name: n8n_chat_histories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_chat_histories ALTER COLUMN id SET DEFAULT nextval('public.n8n_chat_histories_id_seq'::regclass);


--
-- TOC entry 4084 (class 2606 OID 21384)
-- Name: clientes_whatsapp clientes_whatsapp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_whatsapp
    ADD CONSTRAINT clientes_whatsapp_pkey PRIMARY KEY (telefone);


--
-- TOC entry 4086 (class 2606 OID 24374)
-- Name: clientes_whatsapp clientes_whatsapp_telefone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_whatsapp
    ADD CONSTRAINT clientes_whatsapp_telefone_key UNIQUE (telefone);


--
-- TOC entry 4122 (class 2606 OID 26200)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4124 (class 2606 OID 26202)
-- Name: clients clients_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_slug_key UNIQUE (slug);


--
-- TOC entry 4107 (class 2606 OID 24262)
-- Name: conversations conversations_client_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_client_id_phone_key UNIQUE (client_id, phone);


--
-- TOC entry 4109 (class 2606 OID 24260)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4091 (class 2606 OID 21721)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4100 (class 2606 OID 24201)
-- Name: execution_logs execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execution_logs
    ADD CONSTRAINT execution_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4120 (class 2606 OID 24281)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4098 (class 2606 OID 22859)
-- Name: n8n_chat_histories n8n_chat_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_chat_histories
    ADD CONSTRAINT n8n_chat_histories_pkey PRIMARY KEY (id);


--
-- TOC entry 4150 (class 2606 OID 27044)
-- Name: pricing_config pricing_config_client_id_provider_model_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_config
    ADD CONSTRAINT pricing_config_client_id_provider_model_key UNIQUE (client_id, provider, model);


--
-- TOC entry 4152 (class 2606 OID 27042)
-- Name: pricing_config pricing_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_config
    ADD CONSTRAINT pricing_config_pkey PRIMARY KEY (id);


--
-- TOC entry 4146 (class 2606 OID 26986)
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 28438)
-- Name: user_invites user_invites_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_invite_token_key UNIQUE (invite_token);


--
-- TOC entry 4160 (class 2606 OID 28436)
-- Name: user_invites user_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_pkey PRIMARY KEY (id);


--
-- TOC entry 4135 (class 2606 OID 26392)
-- Name: user_profiles user_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_email_key UNIQUE (email);


--
-- TOC entry 4137 (class 2606 OID 26390)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4093 (class 1259 OID 26255)
-- Name: idx_chat_histories_client_session_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_histories_client_session_created ON public.n8n_chat_histories USING btree (client_id, session_id, created_at DESC);


--
-- TOC entry 4094 (class 1259 OID 24369)
-- Name: idx_chat_histories_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_histories_created_at ON public.n8n_chat_histories USING btree (created_at DESC);


--
-- TOC entry 4095 (class 1259 OID 24370)
-- Name: idx_chat_histories_session_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_histories_session_created ON public.n8n_chat_histories USING btree (session_id, created_at DESC);


--
-- TOC entry 4096 (class 1259 OID 24368)
-- Name: idx_chat_histories_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_histories_session_id ON public.n8n_chat_histories USING btree (session_id);


--
-- TOC entry 4087 (class 1259 OID 24372)
-- Name: idx_clientes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_status ON public.clientes_whatsapp USING btree (status);


--
-- TOC entry 4088 (class 1259 OID 24371)
-- Name: idx_clientes_telefone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_telefone ON public.clientes_whatsapp USING btree (telefone);


--
-- TOC entry 4089 (class 1259 OID 26254)
-- Name: idx_clientes_whatsapp_client_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_whatsapp_client_phone ON public.clientes_whatsapp USING btree (client_id, telefone);


--
-- TOC entry 4125 (class 1259 OID 26940)
-- Name: idx_clients_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_provider ON public.clients USING btree (primary_model_provider);


--
-- TOC entry 4126 (class 1259 OID 26203)
-- Name: idx_clients_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_clients_slug ON public.clients USING btree (slug);


--
-- TOC entry 4127 (class 1259 OID 26204)
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status) WHERE (status = 'active'::text);


--
-- TOC entry 4110 (class 1259 OID 24310)
-- Name: idx_conversations_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id);


--
-- TOC entry 4111 (class 1259 OID 24312)
-- Name: idx_conversations_last_update; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_last_update ON public.conversations USING btree (last_update DESC);


--
-- TOC entry 4112 (class 1259 OID 24313)
-- Name: idx_conversations_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_phone ON public.conversations USING btree (phone);


--
-- TOC entry 4113 (class 1259 OID 24311)
-- Name: idx_conversations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status);


--
-- TOC entry 4092 (class 1259 OID 26256)
-- Name: idx_documents_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_client ON public.documents USING btree (client_id);


--
-- TOC entry 4101 (class 1259 OID 24206)
-- Name: idx_execution_logs_exec_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_execution_logs_exec_time ON public.execution_logs USING btree (execution_id, "timestamp");


--
-- TOC entry 4102 (class 1259 OID 24202)
-- Name: idx_execution_logs_execution_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_execution_logs_execution_id ON public.execution_logs USING btree (execution_id);


--
-- TOC entry 4103 (class 1259 OID 24204)
-- Name: idx_execution_logs_node_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_execution_logs_node_name ON public.execution_logs USING btree (node_name);


--
-- TOC entry 4104 (class 1259 OID 24205)
-- Name: idx_execution_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_execution_logs_status ON public.execution_logs USING btree (status);


--
-- TOC entry 4105 (class 1259 OID 24203)
-- Name: idx_execution_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_execution_logs_timestamp ON public.execution_logs USING btree ("timestamp" DESC);


--
-- TOC entry 4114 (class 1259 OID 24314)
-- Name: idx_messages_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_client_id ON public.messages USING btree (client_id);


--
-- TOC entry 4115 (class 1259 OID 24315)
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- TOC entry 4116 (class 1259 OID 24318)
-- Name: idx_messages_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_direction ON public.messages USING btree (direction);


--
-- TOC entry 4117 (class 1259 OID 24316)
-- Name: idx_messages_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_phone ON public.messages USING btree (phone);


--
-- TOC entry 4118 (class 1259 OID 24317)
-- Name: idx_messages_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_timestamp ON public.messages USING btree ("timestamp" DESC);


--
-- TOC entry 4147 (class 1259 OID 27050)
-- Name: idx_pricing_config_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_config_client ON public.pricing_config USING btree (client_id);


--
-- TOC entry 4148 (class 1259 OID 27051)
-- Name: idx_pricing_config_provider_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_config_provider_model ON public.pricing_config USING btree (provider, model);


--
-- TOC entry 4138 (class 1259 OID 27003)
-- Name: idx_usage_logs_client_date_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_client_date_source ON public.usage_logs USING btree (client_id, created_at DESC, source);


--
-- TOC entry 4139 (class 1259 OID 26997)
-- Name: idx_usage_logs_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_client_id ON public.usage_logs USING btree (client_id);


--
-- TOC entry 4140 (class 1259 OID 26998)
-- Name: idx_usage_logs_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_conversation_id ON public.usage_logs USING btree (conversation_id);


--
-- TOC entry 4141 (class 1259 OID 27000)
-- Name: idx_usage_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_created_at ON public.usage_logs USING btree (created_at DESC);


--
-- TOC entry 4142 (class 1259 OID 27002)
-- Name: idx_usage_logs_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_model ON public.usage_logs USING btree (model);


--
-- TOC entry 4143 (class 1259 OID 26999)
-- Name: idx_usage_logs_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_phone ON public.usage_logs USING btree (phone);


--
-- TOC entry 4144 (class 1259 OID 27001)
-- Name: idx_usage_logs_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_logs_source ON public.usage_logs USING btree (source);


--
-- TOC entry 4153 (class 1259 OID 28449)
-- Name: idx_user_invites_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_invites_client_id ON public.user_invites USING btree (client_id);


--
-- TOC entry 4154 (class 1259 OID 28450)
-- Name: idx_user_invites_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_invites_email ON public.user_invites USING btree (email);


--
-- TOC entry 4155 (class 1259 OID 28452)
-- Name: idx_user_invites_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_invites_status ON public.user_invites USING btree (status);


--
-- TOC entry 4156 (class 1259 OID 28451)
-- Name: idx_user_invites_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_invites_token ON public.user_invites USING btree (invite_token);


--
-- TOC entry 4128 (class 1259 OID 28412)
-- Name: idx_user_profiles_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_active ON public.user_profiles USING btree (is_active);


--
-- TOC entry 4129 (class 1259 OID 26611)
-- Name: idx_user_profiles_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_client ON public.user_profiles USING btree (client_id);


--
-- TOC entry 4130 (class 1259 OID 26403)
-- Name: idx_user_profiles_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_client_id ON public.user_profiles USING btree (client_id);


--
-- TOC entry 4131 (class 1259 OID 28411)
-- Name: idx_user_profiles_client_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_client_role ON public.user_profiles USING btree (client_id, role);


--
-- TOC entry 4132 (class 1259 OID 26404)
-- Name: idx_user_profiles_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);


--
-- TOC entry 4133 (class 1259 OID 28410)
-- Name: idx_user_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);


--
-- TOC entry 4172 (class 2620 OID 25645)
-- Name: Clientes WhatsApp clientes_whatsapp_view_insert_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER clientes_whatsapp_view_insert_trigger INSTEAD OF INSERT ON public."Clientes WhatsApp" FOR EACH ROW EXECUTE FUNCTION public.clientes_whatsapp_view_insert();


--
-- TOC entry 4173 (class 2620 OID 25647)
-- Name: Clientes WhatsApp clientes_whatsapp_view_update_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER clientes_whatsapp_view_update_trigger INSTEAD OF UPDATE ON public."Clientes WhatsApp" FOR EACH ROW EXECUTE FUNCTION public.clientes_whatsapp_view_update();


--
-- TOC entry 4176 (class 2620 OID 27059)
-- Name: pricing_config pricing_config_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pricing_config_updated_at BEFORE UPDATE ON public.pricing_config FOR EACH ROW EXECUTE FUNCTION public.update_pricing_config_timestamp();


--
-- TOC entry 4174 (class 2620 OID 26205)
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4177 (class 2620 OID 28453)
-- Name: user_invites update_user_invites_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_invites_updated_at BEFORE UPDATE ON public.user_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4175 (class 2620 OID 26632)
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4163 (class 2606 OID 26328)
-- Name: n8n_chat_histories fk_chat_histories_client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.n8n_chat_histories
    ADD CONSTRAINT fk_chat_histories_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4161 (class 2606 OID 26323)
-- Name: clientes_whatsapp fk_clientes_whatsapp_client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_whatsapp
    ADD CONSTRAINT fk_clientes_whatsapp_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4162 (class 2606 OID 26333)
-- Name: documents fk_documents_client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4164 (class 2606 OID 24287)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 4169 (class 2606 OID 27045)
-- Name: pricing_config pricing_config_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_config
    ADD CONSTRAINT pricing_config_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4167 (class 2606 OID 26987)
-- Name: usage_logs usage_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4168 (class 2606 OID 26992)
-- Name: usage_logs usage_logs_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- TOC entry 4170 (class 2606 OID 28439)
-- Name: user_invites user_invites_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4171 (class 2606 OID 28444)
-- Name: user_invites user_invites_invited_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4165 (class 2606 OID 26398)
-- Name: user_profiles user_profiles_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4166 (class 2606 OID 26393)
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4346 (class 3256 OID 28454)
-- Name: user_invites Client admins can create invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can create invites" ON public.user_invites FOR INSERT TO authenticated WITH CHECK (((client_id = public.get_current_user_client_id()) AND public.user_is_admin()));


--
-- TOC entry 4359 (class 3256 OID 28419)
-- Name: user_profiles Client admins can create users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can create users" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (((client_id = public.get_current_user_client_id()) AND public.user_is_admin() AND (role <> 'admin'::text)));


--
-- TOC entry 4361 (class 3256 OID 28421)
-- Name: user_profiles Client admins can deactivate users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can deactivate users" ON public.user_profiles FOR UPDATE TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin() AND (id <> auth.uid())));


--
-- TOC entry 4353 (class 3256 OID 28457)
-- Name: user_invites Client admins can delete invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can delete invites" ON public.user_invites FOR DELETE TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin()));


--
-- TOC entry 4352 (class 3256 OID 28456)
-- Name: user_invites Client admins can update invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can update invites" ON public.user_invites FOR UPDATE TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin()));


--
-- TOC entry 4360 (class 3256 OID 28420)
-- Name: user_profiles Client admins can update team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can update team members" ON public.user_profiles FOR UPDATE TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin() AND (id <> auth.uid()))) WITH CHECK (((client_id = public.get_current_user_client_id()) AND (role <> 'admin'::text)));


--
-- TOC entry 4351 (class 3256 OID 28455)
-- Name: user_invites Client admins can view invites; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can view invites" ON public.user_invites FOR SELECT TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin()));


--
-- TOC entry 4358 (class 3256 OID 28418)
-- Name: user_profiles Client admins can view team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Client admins can view team members" ON public.user_profiles FOR SELECT TO authenticated USING (((client_id = public.get_current_user_client_id()) AND public.user_is_admin()));


--
-- TOC entry 4336 (class 0 OID 25612)
-- Dependencies: 397
-- Name: Clientes WhatsApp_backup; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."Clientes WhatsApp_backup" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4345 (class 3256 OID 24208)
-- Name: execution_logs Enable insert for service role only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for service role only" ON public.execution_logs FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4350 (class 3256 OID 26529)
-- Name: clients Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.clients FOR SELECT USING (true);


--
-- TOC entry 4344 (class 3256 OID 24207)
-- Name: execution_logs Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.execution_logs FOR SELECT USING (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- TOC entry 4347 (class 3256 OID 24323)
-- Name: conversations Service role can access all conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can access all conversations" ON public.conversations USING ((auth.role() = 'service_role'::text));


--
-- TOC entry 4348 (class 3256 OID 24324)
-- Name: messages Service role can access all messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can access all messages" ON public.messages USING ((auth.role() = 'service_role'::text));


--
-- TOC entry 4340 (class 3256 OID 27004)
-- Name: usage_logs Service role can access all usage logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can access all usage logs" ON public.usage_logs USING ((auth.role() = 'service_role'::text));


--
-- TOC entry 4362 (class 3256 OID 28422)
-- Name: user_profiles Super admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins have full access" ON public.user_profiles TO authenticated USING (public.user_has_role('admin'::text)) WITH CHECK (public.user_has_role('admin'::text));


--
-- TOC entry 4356 (class 3256 OID 27135)
-- Name: pricing_config Users can delete own client pricing config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own client pricing config" ON public.pricing_config FOR DELETE USING ((client_id IN ( SELECT user_profiles.client_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- TOC entry 4354 (class 3256 OID 27133)
-- Name: pricing_config Users can insert own client pricing config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own client pricing config" ON public.pricing_config FOR INSERT WITH CHECK ((client_id IN ( SELECT user_profiles.client_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- TOC entry 4355 (class 3256 OID 27134)
-- Name: pricing_config Users can update own client pricing config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own client pricing config" ON public.pricing_config FOR UPDATE USING ((client_id IN ( SELECT user_profiles.client_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- TOC entry 4357 (class 3256 OID 28417)
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (role = ( SELECT user_profiles_1.role
   FROM public.user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid())))));


--
-- TOC entry 4349 (class 3256 OID 27132)
-- Name: pricing_config Users can view own client pricing config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own client pricing config" ON public.pricing_config FOR SELECT USING ((client_id IN ( SELECT user_profiles.client_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- TOC entry 4363 (class 3256 OID 28458)
-- Name: user_invites Users can view own invite by email; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own invite by email" ON public.user_invites FOR SELECT TO authenticated, anon USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text));


--
-- TOC entry 4341 (class 3256 OID 28416)
-- Name: user_profiles Users can view own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- TOC entry 4330 (class 0 OID 21377)
-- Dependencies: 384
-- Name: clientes_whatsapp; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clientes_whatsapp ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4334 (class 0 OID 24249)
-- Dependencies: 394
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4331 (class 0 OID 21714)
-- Dependencies: 386
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4333 (class 0 OID 24191)
-- Dependencies: 393
-- Name: execution_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4335 (class 0 OID 24268)
-- Dependencies: 395
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4342 (class 3256 OID 21746)
-- Name: clientes_whatsapp n8n; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY n8n ON public.clientes_whatsapp USING (true);


--
-- TOC entry 4343 (class 3256 OID 21747)
-- Name: documents n8n; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY n8n ON public.documents USING (true);


--
-- TOC entry 4332 (class 0 OID 22852)
-- Dependencies: 388
-- Name: n8n_chat_histories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4338 (class 0 OID 27030)
-- Dependencies: 405
-- Name: pricing_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4337 (class 0 OID 26972)
-- Dependencies: 404
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4339 (class 0 OID 28423)
-- Dependencies: 407
-- Name: user_invites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 37
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION auto_expire_invites(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_expire_invites() TO anon;
GRANT ALL ON FUNCTION public.auto_expire_invites() TO authenticated;
GRANT ALL ON FUNCTION public.auto_expire_invites() TO service_role;


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 651
-- Name: FUNCTION backfill_operation_type(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.backfill_operation_type() TO anon;
GRANT ALL ON FUNCTION public.backfill_operation_type() TO authenticated;
GRANT ALL ON FUNCTION public.backfill_operation_type() TO service_role;


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 456
-- Name: FUNCTION clientes_whatsapp_view_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.clientes_whatsapp_view_insert() TO anon;
GRANT ALL ON FUNCTION public.clientes_whatsapp_view_insert() TO authenticated;
GRANT ALL ON FUNCTION public.clientes_whatsapp_view_insert() TO service_role;


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION clientes_whatsapp_view_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.clientes_whatsapp_view_update() TO anon;
GRANT ALL ON FUNCTION public.clientes_whatsapp_view_update() TO authenticated;
GRANT ALL ON FUNCTION public.clientes_whatsapp_view_update() TO service_role;


--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 462
-- Name: FUNCTION create_client_secret(secret_value text, secret_name text, secret_description text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text) TO anon;
GRANT ALL ON FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text) TO authenticated;
GRANT ALL ON FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text) TO service_role;


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 424
-- Name: FUNCTION get_client_secret(secret_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_client_secret(secret_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_client_secret(secret_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_client_secret(secret_id uuid) TO service_role;


--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 647
-- Name: FUNCTION get_conversation_summary(p_client_id uuid, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer) TO service_role;


--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 512
-- Name: FUNCTION get_current_user_client_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_user_client_id() TO anon;
GRANT ALL ON FUNCTION public.get_current_user_client_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_client_id() TO service_role;


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 435
-- Name: FUNCTION get_current_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_user_role() TO anon;
GRANT ALL ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_role() TO service_role;


--
-- TOC entry 4387 (class 0 OID 0)
-- Dependencies: 662
-- Name: FUNCTION get_daily_usage(p_client_id uuid, p_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer) TO anon;
GRANT ALL ON FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer) TO service_role;


--
-- TOC entry 4388 (class 0 OID 0)
-- Dependencies: 441
-- Name: FUNCTION get_model_pricing(p_client_id uuid, p_provider text, p_model text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text) TO anon;
GRANT ALL ON FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text) TO authenticated;
GRANT ALL ON FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text) TO service_role;


--
-- TOC entry 4389 (class 0 OID 0)
-- Dependencies: 689
-- Name: FUNCTION get_monthly_summary(p_client_id uuid, p_year integer, p_month integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer, p_month integer) TO anon;
GRANT ALL ON FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer, p_month integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer, p_month integer) TO service_role;


--
-- TOC entry 4390 (class 0 OID 0)
-- Dependencies: 412
-- Name: FUNCTION get_usage_by_conversation(p_client_id uuid, p_days integer, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer, p_limit integer) TO service_role;


--
-- TOC entry 4392 (class 0 OID 0)
-- Dependencies: 452
-- Name: FUNCTION get_usage_by_operation_type(p_client_id uuid, p_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer) TO anon;
GRANT ALL ON FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer) TO service_role;


--
-- TOC entry 4393 (class 0 OID 0)
-- Dependencies: 518
-- Name: FUNCTION get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) TO service_role;


--
-- TOC entry 4395 (class 0 OID 0)
-- Dependencies: 459
-- Name: FUNCTION get_user_client_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_client_id() TO anon;
GRANT ALL ON FUNCTION public.get_user_client_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_client_id() TO service_role;


--
-- TOC entry 4396 (class 0 OID 0)
-- Dependencies: 634
-- Name: FUNCTION get_user_tenant_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_tenant_id() TO anon;
GRANT ALL ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_tenant_id() TO service_role;


--
-- TOC entry 4397 (class 0 OID 0)
-- Dependencies: 532
-- Name: FUNCTION get_weekly_evolution(p_client_id uuid, p_weeks integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer) TO anon;
GRANT ALL ON FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer) TO service_role;


--
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 682
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 449
-- Name: FUNCTION match_documents(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 480
-- Name: FUNCTION match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid) TO anon;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.match_documents(query_embedding public.vector, match_count integer, filter_client_id uuid) TO service_role;


--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION update_client_secret(secret_id uuid, new_secret_value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text) TO anon;
GRANT ALL ON FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text) TO authenticated;
GRANT ALL ON FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text) TO service_role;


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 649
-- Name: FUNCTION update_pricing_config_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_pricing_config_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_pricing_config_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_pricing_config_timestamp() TO service_role;


--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 524
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE pricing_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pricing_config TO anon;
GRANT ALL ON TABLE public.pricing_config TO authenticated;
GRANT ALL ON TABLE public.pricing_config TO service_role;


--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 565
-- Name: FUNCTION upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text) TO anon;
GRANT ALL ON FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text) TO authenticated;
GRANT ALL ON FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text) TO service_role;


--
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 423
-- Name: FUNCTION user_has_role(required_role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_has_role(required_role text) TO anon;
GRANT ALL ON FUNCTION public.user_has_role(required_role text) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_role(required_role text) TO service_role;


--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 434
-- Name: FUNCTION user_is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_is_admin() TO anon;
GRANT ALL ON FUNCTION public.user_is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.user_is_admin() TO service_role;


--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE clientes_whatsapp; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clientes_whatsapp TO anon;
GRANT ALL ON TABLE public.clientes_whatsapp TO authenticated;
GRANT ALL ON TABLE public.clientes_whatsapp TO service_role;


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE "Clientes WhatsApp"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public."Clientes WhatsApp" TO anon;
GRANT ALL ON TABLE public."Clientes WhatsApp" TO authenticated;
GRANT ALL ON TABLE public."Clientes WhatsApp" TO service_role;


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE "Clientes WhatsApp_backup"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public."Clientes WhatsApp_backup" TO anon;
GRANT ALL ON TABLE public."Clientes WhatsApp_backup" TO authenticated;
GRANT ALL ON TABLE public."Clientes WhatsApp_backup" TO service_role;


--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;


--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE client_secrets_decrypted; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_secrets_decrypted TO anon;
GRANT ALL ON TABLE public.client_secrets_decrypted TO authenticated;
GRANT ALL ON TABLE public.client_secrets_decrypted TO service_role;


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 385
-- Name: SEQUENCE documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.documents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.documents_id_seq TO service_role;


--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE execution_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.execution_logs TO anon;
GRANT ALL ON TABLE public.execution_logs TO authenticated;
GRANT ALL ON TABLE public.execution_logs TO service_role;


--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 392
-- Name: SEQUENCE execution_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.execution_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.execution_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.execution_logs_id_seq TO service_role;


--
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 395
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- TOC entry 4435 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE n8n_chat_histories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.n8n_chat_histories TO anon;
GRANT ALL ON TABLE public.n8n_chat_histories TO authenticated;
GRANT ALL ON TABLE public.n8n_chat_histories TO service_role;


--
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 387
-- Name: SEQUENCE n8n_chat_histories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.n8n_chat_histories_id_seq TO anon;
GRANT ALL ON SEQUENCE public.n8n_chat_histories_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.n8n_chat_histories_id_seq TO service_role;


--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 404
-- Name: TABLE usage_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usage_logs TO anon;
GRANT ALL ON TABLE public.usage_logs TO authenticated;
GRANT ALL ON TABLE public.usage_logs TO service_role;


--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE user_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_invites TO anon;
GRANT ALL ON TABLE public.user_invites TO authenticated;
GRANT ALL ON TABLE public.user_invites TO service_role;


--
-- TOC entry 4452 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- TOC entry 2803 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2804 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2802 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2806 (class 826 OID 16493)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2801 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2805 (class 826 OID 16492)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2025-10-30 17:52:19

--
-- PostgreSQL database dump complete
--

\unrestrict RcVpj46A8eexg1SyR8wSBqPafdtcaHL3tH9bEhRXV2gpjXTatz7s1rauJWvjfwN

