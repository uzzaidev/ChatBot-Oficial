--
-- PostgreSQL database dump
--

\restrict 0HIbrwxkdwcfdEpb289kKFZK1DPNVSrWd5GUcfZU8hgukEpzPl0uGbTE99ohCna

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

-- Started on 2025-10-30 17:54:14

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
-- TOC entry 35 (class 2615 OID 16494)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- TOC entry 1363 (class 1247 OID 16784)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- TOC entry 1388 (class 1247 OID 16925)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- TOC entry 1360 (class 1247 OID 16778)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1357 (class 1247 OID 16773)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1406 (class 1247 OID 17028)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1418 (class 1247 OID 17101)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1400 (class 1247 OID 17006)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1409 (class 1247 OID 17038)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1394 (class 1247 OID 16967)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- TOC entry 517 (class 1255 OID 16540)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 517
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 536 (class 1255 OID 16755)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- TOC entry 425 (class 1255 OID 16539)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 425
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 465 (class 1255 OID 16538)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 335 (class 1259 OID 16525)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 352 (class 1259 OID 16929)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- TOC entry 343 (class 1259 OID 16727)
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 343
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 334 (class 1259 OID 16518)
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 347 (class 1259 OID 16816)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 346 (class 1259 OID 16804)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 345 (class 1259 OID 16791)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 355 (class 1259 OID 17041)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- TOC entry 354 (class 1259 OID 17011)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- TOC entry 356 (class 1259 OID 17074)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- TOC entry 353 (class 1259 OID 16979)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 333 (class 1259 OID 16507)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 332 (class 1259 OID 16506)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 332
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 350 (class 1259 OID 16858)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 351 (class 1259 OID 16876)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 336 (class 1259 OID 16533)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 344 (class 1259 OID 16757)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- TOC entry 4435 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 4436 (class 0 OID 0)
-- Dependencies: 344
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 349 (class 1259 OID 16843)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 348 (class 1259 OID 16834)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 348
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 331 (class 1259 OID 16495)
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 331
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 4047 (class 2604 OID 16510)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4377 (class 0 OID 16525)
-- Dependencies: 335
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	89e6813a-175a-4134-ad33-85e0b0b5aef8	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"flboff@gmail.com","user_id":"e948658d-d838-4191-9a87-5227fadb66c4","user_phone":""}}	2025-10-23 18:40:27.54791+00	
00000000-0000-0000-0000-000000000000	74ecd5e6-7cd1-4d5e-b657-152a0d4800ab	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 18:40:47.273359+00	
00000000-0000-0000-0000-000000000000	38b2f8cb-c157-4e80-a0bf-958148a6209b	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 18:42:01.281235+00	
00000000-0000-0000-0000-000000000000	55206189-500e-4ac0-a4fd-1417f81f2838	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 18:42:14.952929+00	
00000000-0000-0000-0000-000000000000	7d8413dd-3878-48a0-a8e9-c04d6626defc	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 18:42:42.93964+00	
00000000-0000-0000-0000-000000000000	a19255a1-0acc-435d-a677-f78d8b172ea1	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 18:43:22.834526+00	
00000000-0000-0000-0000-000000000000	a1ebe119-49f2-4409-81bd-dbc3c4fba644	{"action":"token_refreshed","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 20:11:40.868367+00	
00000000-0000-0000-0000-000000000000	334d7c00-18ba-4b53-85c5-6e242ea63ff3	{"action":"token_revoked","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 20:11:40.873262+00	
00000000-0000-0000-0000-000000000000	5c0a308b-cbb4-4559-b654-cf025b9d1dda	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:11:54.709798+00	
00000000-0000-0000-0000-000000000000	fa83339f-5be7-4a9c-9759-f7aff89232c4	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:12:07.977536+00	
00000000-0000-0000-0000-000000000000	7096cc06-cacf-45ee-b271-cd7f838eb5c8	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:13:13.318613+00	
00000000-0000-0000-0000-000000000000	5ef72374-d9fd-4fb3-9b58-9a95339efea9	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"luis.boff@evcomx.com.br","user_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","user_phone":""}}	2025-10-23 20:18:16.553743+00	
00000000-0000-0000-0000-000000000000	57e81187-f9db-48c3-b122-9a28ed4eb7a8	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:18:38.244105+00	
00000000-0000-0000-0000-000000000000	fcade2bf-1075-4ae4-b574-2465cac89a8e	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:19:01.378021+00	
00000000-0000-0000-0000-000000000000	8181e3b3-cfcc-4b7d-90f9-8dde7d73b5fb	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:19:24.66489+00	
00000000-0000-0000-0000-000000000000	0f1622ba-27bc-4459-b34f-d095f672ecb4	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:01.397583+00	
00000000-0000-0000-0000-000000000000	d41b99a7-d865-411a-b18b-88ad1f48c20b	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:15.452527+00	
00000000-0000-0000-0000-000000000000	27dd255a-0c71-41fc-a529-5650cfca2d8e	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:23.873515+00	
00000000-0000-0000-0000-000000000000	574136d9-6f64-463b-9a86-92d745971619	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:43.090508+00	
00000000-0000-0000-0000-000000000000	df782a3d-b769-4b47-b99c-dbe2112b7b65	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:44.436899+00	
00000000-0000-0000-0000-000000000000	29bcc51a-c117-4b10-a176-824caab5ec1a	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:47:45.702544+00	
00000000-0000-0000-0000-000000000000	2ee3b4ca-fb98-4e18-9bcc-95c14718242c	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 20:48:49.456628+00	
00000000-0000-0000-0000-000000000000	d38c9c34-3291-4b13-a3e7-bde9019ae35e	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:26:34.486125+00	
00000000-0000-0000-0000-000000000000	eeb1326b-c0a1-4ca4-b029-3b2844158438	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:27:10.225893+00	
00000000-0000-0000-0000-000000000000	7e0e0e3f-7d8e-432d-8194-0273b333576b	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:27:17.346903+00	
00000000-0000-0000-0000-000000000000	ea9a1e63-10dd-41ba-b517-3604f8d80eb4	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:27:23.852529+00	
00000000-0000-0000-0000-000000000000	cbbd3442-eeca-4507-9202-1c9baf7a1269	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:27:33.620074+00	
00000000-0000-0000-0000-000000000000	a0338806-187a-4bff-be90-f9f6d231c296	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 21:28:25.468886+00	
00000000-0000-0000-0000-000000000000	8b718970-c0c4-4ea7-8af9-afb02f223d84	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:16:42.665041+00	
00000000-0000-0000-0000-000000000000	714f04eb-0e07-4f8a-8434-91945d7257cc	{"action":"token_refreshed","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 22:17:43.361142+00	
00000000-0000-0000-0000-000000000000	36bef3a2-5aa4-4523-b282-a1a3b8284d0f	{"action":"token_revoked","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-23 22:17:43.362719+00	
00000000-0000-0000-0000-000000000000	c7ae6eb0-c909-456c-9a1d-7820447a91d5	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:17:50.749796+00	
00000000-0000-0000-0000-000000000000	5f4f57db-7cef-49b7-8407-992038b00096	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:18:04.503092+00	
00000000-0000-0000-0000-000000000000	eb6fda3f-a08b-4480-975d-bc4fc3f43f87	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:18:08.751561+00	
00000000-0000-0000-0000-000000000000	93112834-6633-4c0e-8a1e-35d5020069c8	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:18:26.314287+00	
00000000-0000-0000-0000-000000000000	5a8f15ba-ee5e-4384-8013-7ee3dbec228d	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:32:19.595482+00	
00000000-0000-0000-0000-000000000000	3682a6bc-3f71-4d11-b3ec-2164f3b55a49	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:32:23.45287+00	
00000000-0000-0000-0000-000000000000	4e887b50-cb07-4041-a30f-1909235ae9b6	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:32:25.091858+00	
00000000-0000-0000-0000-000000000000	84db266d-2eba-4fc3-808b-3fbe9b2b28d3	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:32:26.242193+00	
00000000-0000-0000-0000-000000000000	07932eae-b1dc-4b22-9e1d-71ae13266c2c	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 22:32:29.668543+00	
00000000-0000-0000-0000-000000000000	669aae9a-3210-4acc-86d0-3deb7b39723f	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:20:55.114795+00	
00000000-0000-0000-0000-000000000000	d23f0121-75e6-431c-a3f7-5f7acc1024ce	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-23 23:22:02.434993+00	
00000000-0000-0000-0000-000000000000	05f96ecf-f429-4b26-b48a-ab6551ff1e72	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-23 23:22:02.437506+00	
00000000-0000-0000-0000-000000000000	6442e26d-ece7-4a4e-bf1f-3e16acbcbcf4	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:24:52.639811+00	
00000000-0000-0000-0000-000000000000	84ba9b32-db81-4995-b30f-fccd175c9e84	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:25:17.533484+00	
00000000-0000-0000-0000-000000000000	89fc705b-a61f-46c9-88ef-e1bc20a07c13	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:25:20.160561+00	
00000000-0000-0000-0000-000000000000	dae04991-2d8e-4766-875f-b9f41b52aeb8	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:25:28.081771+00	
00000000-0000-0000-0000-000000000000	5d635883-e0bb-4cb0-8564-6d1c7855ef50	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:25:38.170035+00	
00000000-0000-0000-0000-000000000000	9d11e1d5-a230-4fbc-9f7c-4b47312564b9	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:26:17.771025+00	
00000000-0000-0000-0000-000000000000	3ede51a4-1c39-4ba9-b37f-37591b5935a6	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:26:55.438371+00	
00000000-0000-0000-0000-000000000000	c2bed9ed-5783-4849-9d88-f3162d7df283	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:28:03.431827+00	
00000000-0000-0000-0000-000000000000	3c4c1fed-2993-4e92-a098-08089f74146f	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:28:16.910457+00	
00000000-0000-0000-0000-000000000000	b2474120-262e-485b-8b04-6f5cb655591f	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:28:44.171102+00	
00000000-0000-0000-0000-000000000000	da60c9d5-8584-49af-bee3-f06c27439a62	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:30:18.410507+00	
00000000-0000-0000-0000-000000000000	adafca17-7fdf-4f12-8b50-af84be495ee8	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:31:11.799153+00	
00000000-0000-0000-0000-000000000000	dbd17d34-49d2-4737-b40f-6c4b8de12552	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:32:31.768569+00	
00000000-0000-0000-0000-000000000000	3f817a4c-ecf4-41db-973f-7bdc91294e32	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:37:11.726101+00	
00000000-0000-0000-0000-000000000000	1c6b72e8-b151-45e9-a5fd-4b6bae6d0114	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:40:31.654187+00	
00000000-0000-0000-0000-000000000000	3a60d933-c548-479c-8de0-da5c8e68f87a	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:42:06.193817+00	
00000000-0000-0000-0000-000000000000	f8bd489f-b3af-4796-93b7-1db8cfd5cc8e	{"action":"logout","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account"}	2025-10-23 23:46:22.211736+00	
00000000-0000-0000-0000-000000000000	4dfdfb61-e23f-4e71-af75-8886bbaa9aa4	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:46:38.628798+00	
00000000-0000-0000-0000-000000000000	2d69b0f9-1b83-4788-8f09-072d31800738	{"action":"logout","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account"}	2025-10-23 23:51:26.377989+00	
00000000-0000-0000-0000-000000000000	b434d378-ac06-427e-ac1a-f7a138fde90c	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-23 23:51:34.704992+00	
00000000-0000-0000-0000-000000000000	1c918196-18c2-4fe0-9f3b-b1a147462d53	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-24 00:12:07.476219+00	
00000000-0000-0000-0000-000000000000	ff9db978-4fde-4d38-989c-520b4978a5a7	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-24 12:09:24.929671+00	
00000000-0000-0000-0000-000000000000	4cec4ddc-e394-4eb6-a013-dc92c425d68d	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-25 20:55:28.791822+00	
00000000-0000-0000-0000-000000000000	b71d63b7-06b4-42e8-a883-7574fa0d0ad0	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 13:20:31.868824+00	
00000000-0000-0000-0000-000000000000	9294f002-2cda-42bf-8e69-0d03360da4da	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 13:20:31.88412+00	
00000000-0000-0000-0000-000000000000	4ded2e55-a80e-479c-960c-7a4f15fa26ef	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 20:24:50.039696+00	
00000000-0000-0000-0000-000000000000	01c566c0-7653-4c0b-8147-c7450599013b	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 20:24:50.059007+00	
00000000-0000-0000-0000-000000000000	602ab185-50e8-49a4-aeb8-05987df06b4d	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 21:26:03.46351+00	
00000000-0000-0000-0000-000000000000	5588c4ba-2f12-42ee-ba42-5e772e664570	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 21:26:03.47878+00	
00000000-0000-0000-0000-000000000000	8f17da3b-fd69-46a4-b2a5-886f0b205a52	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 22:31:35.539229+00	
00000000-0000-0000-0000-000000000000	c3844fa6-9ad8-4a85-930d-e228f51f1212	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-26 22:31:35.546817+00	
00000000-0000-0000-0000-000000000000	e8ebe499-18ba-49f5-a66e-7e394759ce94	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-27 13:28:05.754634+00	
00000000-0000-0000-0000-000000000000	fc79d113-8128-4abb-8bbf-fe5d994f705e	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-27 13:28:05.767927+00	
00000000-0000-0000-0000-000000000000	26cd9f7e-2935-4983-9de5-c7b64c76e26a	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-27 21:41:31.435017+00	
00000000-0000-0000-0000-000000000000	e83b791f-b774-4e0a-b0b7-00b27363bb46	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-27 21:41:31.446387+00	
00000000-0000-0000-0000-000000000000	071d18ff-b300-4829-b840-15ede64c8dd6	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-28 23:49:05.100363+00	
00000000-0000-0000-0000-000000000000	8cf4c0f5-4f06-4246-8c14-a5d38c442edc	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-28 23:58:31.05622+00	
00000000-0000-0000-0000-000000000000	03ca11fa-2202-4a54-ac3d-b3977f523ed5	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-28 23:58:40.611748+00	
00000000-0000-0000-0000-000000000000	794f12a4-9fc4-45cb-89c7-0ac3f1f94052	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:00:14.8494+00	
00000000-0000-0000-0000-000000000000	3d073605-82ae-4f95-aacf-b0db6132a60e	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:00:22.496824+00	
00000000-0000-0000-0000-000000000000	be6fcd98-1370-4736-9335-00fd0b897686	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:00:34.625514+00	
00000000-0000-0000-0000-000000000000	345db25e-5c05-4ea9-a87e-7ec6a1432d3a	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:02:06.803759+00	
00000000-0000-0000-0000-000000000000	05085014-9a0c-445c-8c72-7c774d3974ad	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:21:04.568279+00	
00000000-0000-0000-0000-000000000000	b9440dbf-35c2-48fd-ba2d-929818f47557	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:21:07.244505+00	
00000000-0000-0000-0000-000000000000	7aed34e8-e7e1-4bf1-93d0-bdbcd20fde90	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:30:50.04257+00	
00000000-0000-0000-0000-000000000000	c02851c7-ca07-4d87-ab50-a4c19f214fb8	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:30:57.060401+00	
00000000-0000-0000-0000-000000000000	6e98168c-e17f-47a6-abda-f805b9d5fbd6	{"action":"logout","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:31:15.038565+00	
00000000-0000-0000-0000-000000000000	0b842c96-6ec1-4038-b2c5-4163a24826c4	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:34:39.806383+00	
00000000-0000-0000-0000-000000000000	2246c4c1-d45c-4fbf-a545-8ece3d9d53ca	{"action":"logout","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:47:15.082597+00	
00000000-0000-0000-0000-000000000000	5beb0291-b906-4e09-bd35-e94acb15b3d1	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:47:17.077338+00	
00000000-0000-0000-0000-000000000000	b94e70f6-aee3-4748-a391-a012741ee109	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:48:06.734514+00	
00000000-0000-0000-0000-000000000000	3b099e60-d2cc-44ea-a711-ee4374b4973c	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:49:06.768205+00	
00000000-0000-0000-0000-000000000000	7d83741e-a0bb-47e9-97a8-cf645003100c	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:53:57.414217+00	
00000000-0000-0000-0000-000000000000	74498e56-4421-447a-a5b0-b6f5d0820d45	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:56:33.339434+00	
00000000-0000-0000-0000-000000000000	eb46a023-1e77-4f42-bb99-f5b21aef5c47	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:56:38.967619+00	
00000000-0000-0000-0000-000000000000	60dd1d7e-813c-45ec-bf2b-57dc2a6741c8	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:56:45.560422+00	
00000000-0000-0000-0000-000000000000	b12635cb-1928-4208-b0f8-003266f3e3ca	{"action":"logout","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 00:59:29.082042+00	
00000000-0000-0000-0000-000000000000	9319b267-26d2-4e1c-bb6b-e64c7161677f	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 00:59:35.200657+00	
00000000-0000-0000-0000-000000000000	a0889c6f-99ed-42c0-9e50-408c8a7cfc0e	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 02:34:04.902958+00	
00000000-0000-0000-0000-000000000000	01189026-0694-4efc-9330-571ae45e2a04	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 02:34:21.427771+00	
00000000-0000-0000-0000-000000000000	044ada36-bd9a-4f05-b320-37f557503503	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 11:57:21.930434+00	
00000000-0000-0000-0000-000000000000	3c478548-170d-4afa-85b9-8819b1919e83	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 11:57:21.954444+00	
00000000-0000-0000-0000-000000000000	87505265-e869-4d42-a1b1-e815288e5931	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 11:57:24.308236+00	
00000000-0000-0000-0000-000000000000	96c22d73-f635-4092-b7d8-064697ee6d97	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 11:57:24.397965+00	
00000000-0000-0000-0000-000000000000	ae5e36dd-48d1-4b97-b5cb-1199e5348a1d	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 11:57:24.46827+00	
00000000-0000-0000-0000-000000000000	4971a50d-30cf-45e8-9362-6f534595b7fe	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:27.314683+00	
00000000-0000-0000-0000-000000000000	387bd8da-e566-429a-b21b-0455c9fb1ccd	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:27.342531+00	
00000000-0000-0000-0000-000000000000	b0ed60d7-6384-4e61-9b92-23ea1cad061f	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:27.49413+00	
00000000-0000-0000-0000-000000000000	1cc2d265-39b3-4a83-a959-f8d580c49322	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:32.873803+00	
00000000-0000-0000-0000-000000000000	b593d4bb-b97f-4965-a6b9-b7f68db1114c	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:33.105413+00	
00000000-0000-0000-0000-000000000000	426a96e1-6456-498f-b9b5-f1cbe054e03f	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:33.219096+00	
00000000-0000-0000-0000-000000000000	a63df5d9-d38f-4f70-b16b-d102b1a66cbe	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:33.326287+00	
00000000-0000-0000-0000-000000000000	f85c2d1a-f118-430a-9d90-e92a0da510ee	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:00:39.549797+00	
00000000-0000-0000-0000-000000000000	e3bd1da6-5fef-48cc-aaac-da603c78a9a0	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:00:39.557627+00	
00000000-0000-0000-0000-000000000000	709b8d33-0ce3-4d83-a600-f72c0a44dc0f	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:23.131861+00	
00000000-0000-0000-0000-000000000000	f50278bf-c29b-41a8-9f5e-751e3e008f7f	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:23.132844+00	
00000000-0000-0000-0000-000000000000	b54a0796-2f9c-4ac0-9007-c16fc92c2b08	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:23.14302+00	
00000000-0000-0000-0000-000000000000	c4ff61bf-f273-421a-accc-801b17231515	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:23.513572+00	
00000000-0000-0000-0000-000000000000	e0b96f97-fc00-4aa4-bf60-3cf31312b0f9	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:25.275109+00	
00000000-0000-0000-0000-000000000000	2490147e-dc8a-4ba8-99c6-f861905b30b3	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:01:26.534638+00	
00000000-0000-0000-0000-000000000000	b940b495-d586-429c-a53d-625bf37ae7ba	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:01:39.584503+00	
00000000-0000-0000-0000-000000000000	b87d8498-8398-404a-80f8-d95c52e1e582	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:02:47.042571+00	
00000000-0000-0000-0000-000000000000	60444005-7f14-4667-b0ce-d7c31b33562b	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:08:07.563754+00	
00000000-0000-0000-0000-000000000000	30d6f8a3-0e2f-4a96-b87a-3e9d503d7a68	{"action":"token_revoked","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:08:07.569484+00	
00000000-0000-0000-0000-000000000000	0eed5aeb-8a0e-49ed-82c7-3afe7a335e9a	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:08:10.298437+00	
00000000-0000-0000-0000-000000000000	3c5646f4-bf1b-4d28-a355-a45142e243d2	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:08:10.388992+00	
00000000-0000-0000-0000-000000000000	e2e542d2-e565-451f-b133-d5f4cf772393	{"action":"token_refreshed","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"token"}	2025-10-29 12:08:10.484361+00	
00000000-0000-0000-0000-000000000000	6a1d1b11-fa00-45b3-99f1-1d07010e0554	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:10:59.37892+00	
00000000-0000-0000-0000-000000000000	b06608c1-e111-495a-9092-59955046570a	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:11:06.085623+00	
00000000-0000-0000-0000-000000000000	f316d93a-b166-40b7-85dd-641a558c5292	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:11:26.239009+00	
00000000-0000-0000-0000-000000000000	cd515aa1-47ff-4430-af50-50d08bb32973	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:11:58.20455+00	
00000000-0000-0000-0000-000000000000	fee31cf5-7ecc-457d-8f2d-ec0eae6e4e45	{"action":"login","actor_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","actor_username":"luis.boff@evcomx.com.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:13:46.027587+00	
00000000-0000-0000-0000-000000000000	26fcf052-eaa5-4e56-8112-f1ed37937eef	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"luis.boff@evcomx.com.br","user_id":"1753e30c-a53a-4cb2-b876-6e8c6ee885d9","user_phone":""}}	2025-10-29 12:21:40.274671+00	
00000000-0000-0000-0000-000000000000	b0112da9-7d60-4468-9e08-f0e380e067ff	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:30:36.60005+00	
00000000-0000-0000-0000-000000000000	3762c02f-aded-4f2f-b8d7-9313b6a9bba5	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:30:51.270339+00	
00000000-0000-0000-0000-000000000000	24fb5dad-57e3-47ae-b3c3-0088e770124d	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:30:56.179659+00	
00000000-0000-0000-0000-000000000000	baacbf68-8522-460e-a431-f89e8fe1f457	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:31:06.463553+00	
00000000-0000-0000-0000-000000000000	7784a324-d447-46b2-af02-88d63ab42e75	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:38:37.300487+00	
00000000-0000-0000-0000-000000000000	224f1ef7-d9ac-44a3-a4e5-b26dc8e8a54b	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:39:19.940907+00	
00000000-0000-0000-0000-000000000000	43464e8b-7291-41cb-b8bb-2bcbf116dd6f	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 12:41:15.770782+00	
00000000-0000-0000-0000-000000000000	0e1d22d7-c95b-4d14-a889-970dd6a26d34	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 12:55:56.213484+00	
00000000-0000-0000-0000-000000000000	fd3d1900-96a1-4e4f-886a-2778d2a4fae6	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"000264770@ufrgs.br","user_id":"278ba721-ce36-4b97-9635-f249495fab53","user_phone":""}}	2025-10-29 13:06:23.57327+00	
00000000-0000-0000-0000-000000000000	81bb8c54-c41a-4472-a97d-1cafad9e40a0	{"action":"login","actor_id":"278ba721-ce36-4b97-9635-f249495fab53","actor_name":"luis fernando boff","actor_username":"000264770@ufrgs.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 13:06:24.050065+00	
00000000-0000-0000-0000-000000000000	ce795851-86a8-4a11-911c-bd51e622ce7c	{"action":"login","actor_id":"278ba721-ce36-4b97-9635-f249495fab53","actor_name":"luis fernando boff","actor_username":"000264770@ufrgs.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 13:06:44.611134+00	
00000000-0000-0000-0000-000000000000	63aca302-df6a-4e2b-9b8b-033f246334c1	{"action":"logout","actor_id":"278ba721-ce36-4b97-9635-f249495fab53","actor_name":"luis fernando boff","actor_username":"000264770@ufrgs.br","actor_via_sso":false,"log_type":"account"}	2025-10-29 13:07:20.541728+00	
00000000-0000-0000-0000-000000000000	02d826d8-9a1b-4007-8878-36edbfd8ebfc	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 13:07:25.21021+00	
00000000-0000-0000-0000-000000000000	05720944-0564-43f3-b4f0-833ed729fec3	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 17:05:07.181108+00	
00000000-0000-0000-0000-000000000000	1b66287b-de2b-4029-93fe-9e280cabe78b	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 17:05:07.211265+00	
00000000-0000-0000-0000-000000000000	3c4cda1b-482c-41a0-b19b-bf136282cfde	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 17:05:10.510491+00	
00000000-0000-0000-0000-000000000000	39ca1a79-1159-41da-8ead-fb384e3d8790	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 17:05:10.525034+00	
00000000-0000-0000-0000-000000000000	18543cda-900a-49cf-b5d5-72ef0633d832	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 17:07:56.839534+00	
00000000-0000-0000-0000-000000000000	35c56419-eaaa-4a2f-819f-2eacab7a1d40	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 17:09:19.029953+00	
00000000-0000-0000-0000-000000000000	bc79b715-66eb-474f-973c-d9c0a8f8de88	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 17:10:17.335208+00	
00000000-0000-0000-0000-000000000000	39ef3551-4494-4c9e-8e6e-292cff080ecd	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 17:18:20.165418+00	
00000000-0000-0000-0000-000000000000	57279df1-5f10-45ad-9437-8c12397b3a6f	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:41.486594+00	
00000000-0000-0000-0000-000000000000	e5151f29-eb1b-4aec-93a6-d341a9b58734	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:41.513494+00	
00000000-0000-0000-0000-000000000000	6aa6c29f-034b-439a-98e3-2572d2a60752	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:41.585987+00	
00000000-0000-0000-0000-000000000000	fd2119cb-538c-47a2-9050-4d30d31f1757	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:42.21331+00	
00000000-0000-0000-0000-000000000000	bab22010-0fb1-4f02-9ed0-f3de1f7e9a1f	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:44.095984+00	
00000000-0000-0000-0000-000000000000	3dd409ee-9fb8-4cdd-a71e-4cb8031dae23	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 18:39:44.781337+00	
00000000-0000-0000-0000-000000000000	ecc03aa2-1e4e-4f3a-8d9f-f62ec621d643	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 18:40:01.676482+00	
00000000-0000-0000-0000-000000000000	c06ef200-2d6e-4677-a9a6-3038eabdca6e	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:40:17.069263+00	
00000000-0000-0000-0000-000000000000	fb938aed-34d9-402e-addd-dc347d2d8598	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 18:40:25.205739+00	
00000000-0000-0000-0000-000000000000	28a0f531-5778-45ab-9046-fabc6644e700	{"action":"login","actor_id":"278ba721-ce36-4b97-9635-f249495fab53","actor_name":"luis fernando boff","actor_username":"000264770@ufrgs.br","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:40:29.226674+00	
00000000-0000-0000-0000-000000000000	30281dc6-28cc-4400-b493-a1ba35a9fe54	{"action":"login","actor_id":"e948658d-d838-4191-9a87-5227fadb66c4","actor_username":"flboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:40:33.885211+00	
00000000-0000-0000-0000-000000000000	7d01717a-fca0-48c4-be04-76826d58a682	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:40:51.180084+00	
00000000-0000-0000-0000-000000000000	bfc07e4d-50b5-4337-97c2-3e2df8499ed9	{"action":"logout","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 18:41:04.692177+00	
00000000-0000-0000-0000-000000000000	5cd42fa3-96a9-4316-833c-47998bacd42f	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:41:09.125612+00	
00000000-0000-0000-0000-000000000000	62f1b7b2-8686-481d-9f45-1f6cac17f5a2	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:41:57.485091+00	
00000000-0000-0000-0000-000000000000	f1dc36d1-f46d-4afd-9bc9-687b5915bf45	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 18:43:47.915248+00	
00000000-0000-0000-0000-000000000000	d298613b-9586-4563-b6c4-10896bf83495	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-29 18:44:51.523079+00	
00000000-0000-0000-0000-000000000000	17018e1e-0ba2-41d5-aee0-5b69b6c0e729	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 20:04:13.815507+00	
00000000-0000-0000-0000-000000000000	bdd571ea-e68d-49bd-a976-91b4259b8044	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 21:02:59.389311+00	
00000000-0000-0000-0000-000000000000	f636e14c-2e13-4586-9b29-b50e27f622ba	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 21:02:59.422151+00	
00000000-0000-0000-0000-000000000000	fdbd68d0-2c8c-4899-ab3c-2b1aa55db7d5	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 21:02:59.486482+00	
00000000-0000-0000-0000-000000000000	396741d7-7dfc-4ab5-80b3-b449c64f97d2	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 22:32:31.919936+00	
00000000-0000-0000-0000-000000000000	6b572928-a89c-491d-8519-1e363a877f2e	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 22:32:31.933557+00	
00000000-0000-0000-0000-000000000000	84056088-cf36-4f47-b44e-deb98ec7d9a6	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-29 22:32:35.213822+00	
00000000-0000-0000-0000-000000000000	3cc512f0-9bc9-4359-a7d5-4b4f1fe263b0	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 22:32:35.296288+00	
00000000-0000-0000-0000-000000000000	f50e17a4-149f-4996-b4b9-2e667ada1f61	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 23:58:04.729127+00	
00000000-0000-0000-0000-000000000000	d35a8ed0-d3df-49b8-96b5-1cf228b77ed7	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 23:58:04.740398+00	
00000000-0000-0000-0000-000000000000	6a68e10f-0ed8-40b0-8b94-7b439658cbd2	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-29 23:58:06.070488+00	
00000000-0000-0000-0000-000000000000	8e8e3d16-1e16-423d-90ea-fdc9ec8894b9	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-30 00:09:55.77724+00	
00000000-0000-0000-0000-000000000000	c58f98d5-68d9-4966-bbd3-3056fea13e51	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 00:09:59.339716+00	
00000000-0000-0000-0000-000000000000	70448f2b-ca98-4ad7-8b8c-d10e8f216f2f	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 00:21:06.577952+00	
00000000-0000-0000-0000-000000000000	99946656-1549-4c49-b173-002d2a229a4a	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 00:33:10.565738+00	
00000000-0000-0000-0000-000000000000	ed5d4b09-4578-4531-a807-65e259cf6b35	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 11:36:13.64031+00	
00000000-0000-0000-0000-000000000000	ea249201-9eca-480a-85f0-fc618a38a098	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 13:50:16.310167+00	
00000000-0000-0000-0000-000000000000	2884d4b6-8b9b-4485-a224-0a4046d65c90	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 13:56:49.996568+00	
00000000-0000-0000-0000-000000000000	6497da64-d1f6-4b31-a6e7-4199b68e95d7	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:03:48.911581+00	
00000000-0000-0000-0000-000000000000	fac20b93-f695-4050-a6cd-dc400b6c3891	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:07:19.425477+00	
00000000-0000-0000-0000-000000000000	d85a5ef8-2353-4e93-829d-66a70694e1c3	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:12:31.695936+00	
00000000-0000-0000-0000-000000000000	f10057ed-9d64-4979-b80c-5ed452e246ba	{"action":"logout","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-30 14:18:08.386572+00	
00000000-0000-0000-0000-000000000000	cdba2cfb-9adb-4758-95da-048ecd8ce409	{"action":"login","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:18:15.02266+00	
00000000-0000-0000-0000-000000000000	02859fe0-6aa6-46cc-a995-b86422f859de	{"action":"logout","actor_id":"0d4f5c2b-ec80-4b9f-9416-a4385542065b","actor_name":"Client de Teste","actor_username":"luisfboff@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-30 14:18:37.953304+00	
00000000-0000-0000-0000-000000000000	6de13cf4-a14d-49a9-a05e-22943ae46421	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:19:59.05477+00	
00000000-0000-0000-0000-000000000000	203e6f31-ee5d-41e8-9a14-dc16aeae29be	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 14:28:27.728341+00	
00000000-0000-0000-0000-000000000000	e4426107-a42f-4a3a-ac0b-64b597f3ecf2	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 17:42:53.345226+00	
00000000-0000-0000-0000-000000000000	8ff7c5cd-6bf1-4252-a4ca-a2464cf70ef6	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 17:42:53.368835+00	
00000000-0000-0000-0000-000000000000	b4b62b48-1466-4e24-8eac-1654d25b148f	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 17:50:11.748822+00	
00000000-0000-0000-0000-000000000000	61f3920f-8824-48e7-9b9f-69119e5e6797	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 17:50:11.759375+00	
00000000-0000-0000-0000-000000000000	773bcb29-9ccb-40fe-a2a5-71905d0e6d26	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 17:50:11.903492+00	
00000000-0000-0000-0000-000000000000	2c8f5bcd-8713-4641-a2fd-5a57a80c089e	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 17:50:44.215511+00	
00000000-0000-0000-0000-000000000000	ee164825-e0cc-4d03-a999-91bbb98caa62	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 18:08:25.158853+00	
00000000-0000-0000-0000-000000000000	aa601e2d-6f50-4680-9d88-15af5660669a	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 18:27:42.415488+00	
00000000-0000-0000-0000-000000000000	badbecf9-0af0-4bce-91d9-cf4841f9a121	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 18:27:55.467706+00	
00000000-0000-0000-0000-000000000000	48f6a7bf-3eb6-4e54-9d5b-08da29470b31	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 18:28:55.617378+00	
00000000-0000-0000-0000-000000000000	b2e1d4ba-2d93-40bd-bf8c-a3a0f739d53d	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:23:44.087766+00	
00000000-0000-0000-0000-000000000000	1722b725-025c-404b-83c9-874e8ad198ff	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:23:55.643859+00	
00000000-0000-0000-0000-000000000000	d2d0f75e-4b30-4453-963c-914fce70d7b6	{"action":"token_refreshed","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 19:24:06.936369+00	
00000000-0000-0000-0000-000000000000	bc7d1fbc-60ec-47e4-8164-1a1ae092af89	{"action":"token_revoked","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-30 19:24:06.936968+00	
00000000-0000-0000-0000-000000000000	1afe449c-2d81-4ec4-966c-133bf43a06c5	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:24:08.862014+00	
00000000-0000-0000-0000-000000000000	ff7c6740-abb6-4d4f-8a62-0af62802f30e	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:25:55.747878+00	
00000000-0000-0000-0000-000000000000	7e9f993f-ad07-439c-b5d0-6a74beec556e	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:27:15.613933+00	
00000000-0000-0000-0000-000000000000	9a678155-7365-4edf-9b28-6529aa2e214d	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:28:18.473638+00	
00000000-0000-0000-0000-000000000000	9b65925f-3267-472c-a3d3-c265349ef061	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:28:20.968109+00	
00000000-0000-0000-0000-000000000000	72caa4b7-442f-4655-8096-77510d234c30	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:56:54.860641+00	
00000000-0000-0000-0000-000000000000	a19f8ce8-228a-492f-963f-6891b15f3a81	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 19:59:36.660742+00	
00000000-0000-0000-0000-000000000000	2731c2fd-ed8e-4aaa-a2d2-7c33d3f51856	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:00:59.287204+00	
00000000-0000-0000-0000-000000000000	c0e1d5cc-8ee6-4541-93d4-9ade50b0c38d	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:01:03.925057+00	
00000000-0000-0000-0000-000000000000	46489346-c1c4-400f-8bab-7cfa7ae8dc83	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:02:16.600196+00	
00000000-0000-0000-0000-000000000000	dbd172de-0e2a-4e59-85ec-bdb496f4b457	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:03:55.448775+00	
00000000-0000-0000-0000-000000000000	e1037fcc-c66b-4296-b2bb-afe06b022846	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:09:11.000936+00	
00000000-0000-0000-0000-000000000000	0a992de8-a1b3-4ea3-8f8a-fa194b92e6d0	{"action":"login","actor_id":"0b5a981d-cb31-431e-9a3b-d99ed89ec01d","actor_name":"Luis Fernando Boff","actor_username":"luisfboff@hotmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-30 20:09:30.588826+00	
\.


--
-- TOC entry 4388 (class 0 OID 16929)
-- Dependencies: 352
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- TOC entry 4379 (class 0 OID 16727)
-- Dependencies: 343
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
e948658d-d838-4191-9a87-5227fadb66c4	e948658d-d838-4191-9a87-5227fadb66c4	{"sub": "e948658d-d838-4191-9a87-5227fadb66c4", "email": "flboff@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-10-23 18:40:27.535729+00	2025-10-23 18:40:27.535797+00	2025-10-23 18:40:27.535797+00	d96cb214-f3c0-4438-8712-5fca5025f51f
278ba721-ce36-4b97-9635-f249495fab53	278ba721-ce36-4b97-9635-f249495fab53	{"sub": "278ba721-ce36-4b97-9635-f249495fab53", "email": "000264770@ufrgs.br", "email_verified": false, "phone_verified": false}	email	2025-10-29 13:06:23.565133+00	2025-10-29 13:06:23.565813+00	2025-10-29 13:06:23.565813+00	a7539c09-7726-4a7d-9cea-a63131fb4768
\.


--
-- TOC entry 4376 (class 0 OID 16518)
-- Dependencies: 334
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4383 (class 0 OID 16816)
-- Dependencies: 347
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
5111621b-1d54-481c-b7ac-08ead0e6c970	2025-10-23 18:40:47.320932+00	2025-10-23 18:40:47.320932+00	password	6cdc49d5-3159-484d-8d72-05834eb2b038
40433a1c-30db-47ee-8564-e76055e373de	2025-10-23 18:42:01.287256+00	2025-10-23 18:42:01.287256+00	password	4eb6cf8d-c1d7-4d6b-8a1e-925c0871f891
632c632b-51d8-4314-95f3-1928a0014e32	2025-10-23 18:42:14.957092+00	2025-10-23 18:42:14.957092+00	password	8e9a5c1f-9a8a-4c1c-8bc5-2a54daec005e
75ffab57-894f-4cf6-820b-9ed74c0e1d51	2025-10-23 18:42:42.943031+00	2025-10-23 18:42:42.943031+00	password	31523755-6188-4864-956f-f70056984a69
c63a1663-e291-4198-9e14-73c8190fc44c	2025-10-23 18:43:22.872381+00	2025-10-23 18:43:22.872381+00	password	5461ccf3-1139-4b63-9b5f-f6548d6fd96b
3d4e6b5e-9144-47bb-a0df-4df34425363b	2025-10-23 20:11:54.716019+00	2025-10-23 20:11:54.716019+00	password	0d7b1165-493f-427e-9703-2874b41ed4e2
f5cb17d3-30eb-4eb1-b4d5-3aa15abd6fe0	2025-10-23 20:12:07.981553+00	2025-10-23 20:12:07.981553+00	password	41dca47e-2e56-4d04-af7f-1a12004031cb
ac2a8ee3-ed06-4e16-9c31-6a20a7a87424	2025-10-23 20:13:13.32267+00	2025-10-23 20:13:13.32267+00	password	79c38347-8111-44bf-b72b-230529a24803
266c5d71-7798-4473-a789-6292dd6cffd8	2025-10-23 22:17:50.754985+00	2025-10-23 22:17:50.754985+00	password	b8523bc7-4c76-4d59-8942-7cc60529ae87
e9017caf-5c16-41e3-af5c-7ac1c23bb23f	2025-10-29 18:40:29.229691+00	2025-10-29 18:40:29.229691+00	password	31673f75-cffe-4bfb-a413-1ab7ae5afbe3
bbe65758-7724-4034-b134-1e95c65c9a00	2025-10-29 18:40:33.889902+00	2025-10-29 18:40:33.889902+00	password	3287a6b9-9d68-44a4-8f98-466d4b2e1163
5dae6fbf-c0d2-40a4-b34c-6e26de2c7bc5	2025-10-23 23:24:52.685895+00	2025-10-23 23:24:52.685895+00	password	3df89672-c562-4aa4-8928-ab917f0930ee
12e26a0a-0cd6-4cdc-b44d-8d26fc168e8f	2025-10-30 14:19:59.062809+00	2025-10-30 14:19:59.062809+00	password	d83765c0-1fb2-4a0c-b902-cea2bc2840bf
ad7e745c-8cc8-4700-af69-8ea87cacf7e8	2025-10-30 14:28:27.798636+00	2025-10-30 14:28:27.798636+00	password	9f1ccd56-97d4-451d-b40a-658b2bfe7883
9d6dc48f-aa39-4dcf-a004-7518023df439	2025-10-30 17:50:44.228696+00	2025-10-30 17:50:44.228696+00	password	1658620c-e3b5-493f-a8ed-000769477269
6d2f6ff6-2307-49c4-8905-45de42eb4f49	2025-10-30 18:08:25.237564+00	2025-10-30 18:08:25.237564+00	password	9f21d862-29d3-40af-adaa-2882fdce7da3
5e1f1aa6-ac1b-48ff-8283-12d8d693006c	2025-10-30 18:27:42.461805+00	2025-10-30 18:27:42.461805+00	password	0c5b57d5-fd6d-412a-8172-3ae3eca1494c
15c92b9d-3892-4c7e-adfd-c623284843f1	2025-10-30 18:27:55.47137+00	2025-10-30 18:27:55.47137+00	password	8350b373-5527-46dd-95e9-63ff8b040f8a
0accf25a-dee3-4e1c-b40c-d1b31f464cf7	2025-10-30 18:28:55.622781+00	2025-10-30 18:28:55.622781+00	password	9e403e17-73b8-481e-9889-564bcf2ec204
4ab7df88-e436-4990-8189-cbf383612e2e	2025-10-30 19:23:44.142469+00	2025-10-30 19:23:44.142469+00	password	fb1592da-e7dc-4cf7-9e89-63ad0be75c9d
cbd43f03-1b50-4294-9349-4770aeda92a9	2025-10-30 19:23:55.648668+00	2025-10-30 19:23:55.648668+00	password	b947d0f2-416c-40c1-89b7-9480d003fb6c
8e1f43cd-1ab9-4dee-882a-382456a13768	2025-10-30 19:24:08.865871+00	2025-10-30 19:24:08.865871+00	password	619bb3de-14ee-4947-802d-e91a9a0f7fdd
c082ef85-5212-45ba-ac33-e20af96ff8e7	2025-10-30 19:25:55.751377+00	2025-10-30 19:25:55.751377+00	password	795f4081-aea9-4d61-b5f4-dc7d7e2d558e
a638648d-e5dd-403a-aa28-b902021e29a4	2025-10-30 19:27:15.619232+00	2025-10-30 19:27:15.619232+00	password	67e4f798-eeb5-495c-9313-f28d61ae2dc4
981042af-b8cc-4f7b-9195-85f8881cdd4f	2025-10-30 19:28:18.481968+00	2025-10-30 19:28:18.481968+00	password	cc185094-c08d-4542-8409-462cae0e6206
b6ae0835-b3b2-48fc-bfee-10ee35e2155c	2025-10-30 19:28:20.974369+00	2025-10-30 19:28:20.974369+00	password	5a58e823-c659-4886-a3ed-a869acd2e328
eabb57f7-14e6-40dc-9dfb-db6b99bd8fe4	2025-10-30 19:56:54.959228+00	2025-10-30 19:56:54.959228+00	password	8ed8d192-eacc-47b5-949e-e6cc28180997
5fde78d6-be74-48e2-82f8-ccb51814718c	2025-10-30 19:59:36.670096+00	2025-10-30 19:59:36.670096+00	password	036cf5d9-4004-4e91-a87c-4fd3a28fb49c
06668ed7-0942-444e-baed-d0fdff6aecf0	2025-10-30 20:00:59.292477+00	2025-10-30 20:00:59.292477+00	password	03810830-69e4-4438-a036-f030538c3464
c5d3b39c-73bf-4b39-be5e-9f586de2649c	2025-10-30 20:01:03.929087+00	2025-10-30 20:01:03.929087+00	password	ebf6a586-0624-4848-852e-7e67de3cf1f2
c21c1cee-a49b-41fe-b534-502a5cfe524a	2025-10-30 20:02:16.604582+00	2025-10-30 20:02:16.604582+00	password	81bf300e-2a90-4926-90e0-8f92353700de
f6ae4124-2afd-4e87-a74d-33e901a6f904	2025-10-30 20:03:55.489055+00	2025-10-30 20:03:55.489055+00	password	43b7cee3-4832-4d36-a5ec-4d38fa295398
61103490-2935-4872-81e7-a2b440723c3b	2025-10-30 20:09:11.012263+00	2025-10-30 20:09:11.012263+00	password	4d349617-b5f2-4b97-914c-46b6c97ece83
ea35277b-7a0c-42d3-9a97-04770a3ef1f7	2025-10-30 20:09:30.592482+00	2025-10-30 20:09:30.592482+00	password	964151eb-30d5-4acf-b353-76cb0923bfb0
\.


--
-- TOC entry 4382 (class 0 OID 16804)
-- Dependencies: 346
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- TOC entry 4381 (class 0 OID 16791)
-- Dependencies: 345
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- TOC entry 4391 (class 0 OID 17041)
-- Dependencies: 355
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at) FROM stdin;
\.


--
-- TOC entry 4390 (class 0 OID 17011)
-- Dependencies: 354
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type) FROM stdin;
\.


--
-- TOC entry 4392 (class 0 OID 17074)
-- Dependencies: 356
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- TOC entry 4389 (class 0 OID 16979)
-- Dependencies: 353
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4375 (class 0 OID 16507)
-- Dependencies: 333
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	2	ucecc7drvojp	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 18:42:01.284536+00	2025-10-23 18:42:01.284536+00	\N	40433a1c-30db-47ee-8564-e76055e373de
00000000-0000-0000-0000-000000000000	3	53uetkhpx4p5	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 18:42:14.955836+00	2025-10-23 18:42:14.955836+00	\N	632c632b-51d8-4314-95f3-1928a0014e32
00000000-0000-0000-0000-000000000000	4	yhlnkerykfxu	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 18:42:42.941217+00	2025-10-23 18:42:42.941217+00	\N	75ffab57-894f-4cf6-820b-9ed74c0e1d51
00000000-0000-0000-0000-000000000000	5	tpecejonystv	e948658d-d838-4191-9a87-5227fadb66c4	t	2025-10-23 18:43:22.858164+00	2025-10-23 20:11:40.873963+00	\N	c63a1663-e291-4198-9e14-73c8190fc44c
00000000-0000-0000-0000-000000000000	6	njp4q6774scq	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 20:11:40.879145+00	2025-10-23 20:11:40.879145+00	tpecejonystv	c63a1663-e291-4198-9e14-73c8190fc44c
00000000-0000-0000-0000-000000000000	7	3ezojqv2z3wh	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 20:11:54.714758+00	2025-10-23 20:11:54.714758+00	\N	3d4e6b5e-9144-47bb-a0df-4df34425363b
00000000-0000-0000-0000-000000000000	8	nm5mwh7okr26	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 20:12:07.980234+00	2025-10-23 20:12:07.980234+00	\N	f5cb17d3-30eb-4eb1-b4d5-3aa15abd6fe0
00000000-0000-0000-0000-000000000000	9	zfeexqjqn542	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 20:13:13.321393+00	2025-10-23 20:13:13.321393+00	\N	ac2a8ee3-ed06-4e16-9c31-6a20a7a87424
00000000-0000-0000-0000-000000000000	131	dlkjopzpo4it	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	t	2025-10-30 14:28:27.780447+00	2025-10-30 17:42:53.370409+00	\N	ad7e745c-8cc8-4700-af69-8ea87cacf7e8
00000000-0000-0000-0000-000000000000	133	ttgegjiediqe	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 17:50:11.772966+00	2025-10-30 17:50:11.772966+00	n3lje2gy7x7u	12e26a0a-0cd6-4cdc-b44d-8d26fc168e8f
00000000-0000-0000-0000-000000000000	134	lil7w4ywa5gu	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 17:50:44.226807+00	2025-10-30 17:50:44.226807+00	\N	9d6dc48f-aa39-4dcf-a004-7518023df439
00000000-0000-0000-0000-000000000000	136	wy6o5gosg56z	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 18:27:42.447881+00	2025-10-30 18:27:42.447881+00	\N	5e1f1aa6-ac1b-48ff-8283-12d8d693006c
00000000-0000-0000-0000-000000000000	137	g3s7hs5mg5sc	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 18:27:55.469561+00	2025-10-30 18:27:55.469561+00	\N	15c92b9d-3892-4c7e-adfd-c623284843f1
00000000-0000-0000-0000-000000000000	138	mgoekhzdrdzf	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 18:28:55.620287+00	2025-10-30 18:28:55.620287+00	\N	0accf25a-dee3-4e1c-b40c-d1b31f464cf7
00000000-0000-0000-0000-000000000000	144	l4uxaa6u3v2d	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:27:15.61737+00	2025-10-30 19:27:15.61737+00	\N	a638648d-e5dd-403a-aa28-b902021e29a4
00000000-0000-0000-0000-000000000000	145	kpwuq3hucd7t	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:28:18.477828+00	2025-10-30 19:28:18.477828+00	\N	981042af-b8cc-4f7b-9195-85f8881cdd4f
00000000-0000-0000-0000-000000000000	1	upvkb3o4joig	e948658d-d838-4191-9a87-5227fadb66c4	t	2025-10-23 18:40:47.297773+00	2025-10-23 22:17:43.369765+00	\N	5111621b-1d54-481c-b7ac-08ead0e6c970
00000000-0000-0000-0000-000000000000	27	f2yjfa2ii3rn	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 22:17:43.371283+00	2025-10-23 22:17:43.371283+00	upvkb3o4joig	5111621b-1d54-481c-b7ac-08ead0e6c970
00000000-0000-0000-0000-000000000000	28	tz57xdnqzg7o	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 22:17:50.753109+00	2025-10-23 22:17:50.753109+00	\N	266c5d71-7798-4473-a789-6292dd6cffd8
00000000-0000-0000-0000-000000000000	146	uu437zk2wip5	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:28:20.971887+00	2025-10-30 19:28:20.971887+00	\N	b6ae0835-b3b2-48fc-bfee-10ee35e2155c
00000000-0000-0000-0000-000000000000	148	bedkrxqypg75	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:59:36.66584+00	2025-10-30 19:59:36.66584+00	\N	5fde78d6-be74-48e2-82f8-ccb51814718c
00000000-0000-0000-0000-000000000000	151	epfqjwdop6s5	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:02:16.602469+00	2025-10-30 20:02:16.602469+00	\N	c21c1cee-a49b-41fe-b534-502a5cfe524a
00000000-0000-0000-0000-000000000000	152	s5hia7y4nngi	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:03:55.475534+00	2025-10-30 20:03:55.475534+00	\N	f6ae4124-2afd-4e87-a74d-33e901a6f904
00000000-0000-0000-0000-000000000000	39	fgououbiyqpp	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-23 23:24:52.674378+00	2025-10-23 23:24:52.674378+00	\N	5dae6fbf-c0d2-40a4-b34c-6e26de2c7bc5
00000000-0000-0000-0000-000000000000	132	doznlrcjidaj	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 17:42:53.400918+00	2025-10-30 17:42:53.400918+00	dlkjopzpo4it	ad7e745c-8cc8-4700-af69-8ea87cacf7e8
00000000-0000-0000-0000-000000000000	130	n3lje2gy7x7u	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	t	2025-10-30 14:19:59.057647+00	2025-10-30 17:50:11.761679+00	\N	12e26a0a-0cd6-4cdc-b44d-8d26fc168e8f
00000000-0000-0000-0000-000000000000	139	k7y7ff6nurwi	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:23:44.114451+00	2025-10-30 19:23:44.114451+00	\N	4ab7df88-e436-4990-8189-cbf383612e2e
00000000-0000-0000-0000-000000000000	140	j4hpdqmiqqxx	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:23:55.646831+00	2025-10-30 19:23:55.646831+00	\N	cbd43f03-1b50-4294-9349-4770aeda92a9
00000000-0000-0000-0000-000000000000	135	6myog2whkh5p	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	t	2025-10-30 18:08:25.203134+00	2025-10-30 19:24:06.93751+00	\N	6d2f6ff6-2307-49c4-8905-45de42eb4f49
00000000-0000-0000-0000-000000000000	141	en64kivhpbkc	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:24:06.938137+00	2025-10-30 19:24:06.938137+00	6myog2whkh5p	6d2f6ff6-2307-49c4-8905-45de42eb4f49
00000000-0000-0000-0000-000000000000	142	ncaamk4hyahm	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:24:08.864718+00	2025-10-30 19:24:08.864718+00	\N	8e1f43cd-1ab9-4dee-882a-382456a13768
00000000-0000-0000-0000-000000000000	143	7qwwf23d3sqm	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:25:55.750095+00	2025-10-30 19:25:55.750095+00	\N	c082ef85-5212-45ba-ac33-e20af96ff8e7
00000000-0000-0000-0000-000000000000	147	pqnvytdhx26k	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 19:56:54.921992+00	2025-10-30 19:56:54.921992+00	\N	eabb57f7-14e6-40dc-9dfb-db6b99bd8fe4
00000000-0000-0000-0000-000000000000	149	oavef76efwp2	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:00:59.289905+00	2025-10-30 20:00:59.289905+00	\N	06668ed7-0942-444e-baed-d0fdff6aecf0
00000000-0000-0000-0000-000000000000	150	an7lnay4stsb	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:01:03.927266+00	2025-10-30 20:01:03.927266+00	\N	c5d3b39c-73bf-4b39-be5e-9f586de2649c
00000000-0000-0000-0000-000000000000	153	ugltfpq2cpva	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:09:11.007308+00	2025-10-30 20:09:11.007308+00	\N	61103490-2935-4872-81e7-a2b440723c3b
00000000-0000-0000-0000-000000000000	154	s5jryyok33os	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	f	2025-10-30 20:09:30.591319+00	2025-10-30 20:09:30.591319+00	\N	ea35277b-7a0c-42d3-9a97-04770a3ef1f7
00000000-0000-0000-0000-000000000000	109	axkboadlmy77	278ba721-ce36-4b97-9635-f249495fab53	f	2025-10-29 18:40:29.228479+00	2025-10-29 18:40:29.228479+00	\N	e9017caf-5c16-41e3-af5c-7ac1c23bb23f
00000000-0000-0000-0000-000000000000	110	7hpazvszx7u4	e948658d-d838-4191-9a87-5227fadb66c4	f	2025-10-29 18:40:33.888131+00	2025-10-29 18:40:33.888131+00	\N	bbe65758-7724-4034-b134-1e95c65c9a00
\.


--
-- TOC entry 4386 (class 0 OID 16858)
-- Dependencies: 350
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- TOC entry 4387 (class 0 OID 16876)
-- Dependencies: 351
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- TOC entry 4378 (class 0 OID 16533)
-- Dependencies: 336
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
\.


--
-- TOC entry 4380 (class 0 OID 16757)
-- Dependencies: 344
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id) FROM stdin;
40433a1c-30db-47ee-8564-e76055e373de	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 18:42:01.282482+00	2025-10-23 18:42:01.282482+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
632c632b-51d8-4314-95f3-1928a0014e32	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 18:42:14.953783+00	2025-10-23 18:42:14.953783+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
75ffab57-894f-4cf6-820b-9ed74c0e1d51	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 18:42:42.940459+00	2025-10-23 18:42:42.940459+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
c63a1663-e291-4198-9e14-73c8190fc44c	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 18:43:22.849155+00	2025-10-23 20:11:40.888441+00	\N	aal1	\N	2025-10-23 20:11:40.88705	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
3d4e6b5e-9144-47bb-a0df-4df34425363b	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 20:11:54.713693+00	2025-10-23 20:11:54.713693+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
f5cb17d3-30eb-4eb1-b4d5-3aa15abd6fe0	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 20:12:07.978621+00	2025-10-23 20:12:07.978621+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
ac2a8ee3-ed06-4e16-9c31-6a20a7a87424	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 20:13:13.319381+00	2025-10-23 20:13:13.319381+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
b6ae0835-b3b2-48fc-bfee-10ee35e2155c	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:28:20.970566+00	2025-10-30 19:28:20.970566+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
5fde78d6-be74-48e2-82f8-ccb51814718c	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:59:36.66311+00	2025-10-30 19:59:36.66311+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
c21c1cee-a49b-41fe-b534-502a5cfe524a	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:02:16.601357+00	2025-10-30 20:02:16.601357+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
f6ae4124-2afd-4e87-a74d-33e901a6f904	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:03:55.46575+00	2025-10-30 20:03:55.46575+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
ad7e745c-8cc8-4700-af69-8ea87cacf7e8	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 14:28:27.761177+00	2025-10-30 17:42:53.427616+00	\N	aal1	\N	2025-10-30 17:42:53.427518	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
5111621b-1d54-481c-b7ac-08ead0e6c970	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 18:40:47.278152+00	2025-10-23 22:17:43.373796+00	\N	aal1	\N	2025-10-23 22:17:43.373718	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
266c5d71-7798-4473-a789-6292dd6cffd8	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 22:17:50.752221+00	2025-10-23 22:17:50.752221+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
e9017caf-5c16-41e3-af5c-7ac1c23bb23f	278ba721-ce36-4b97-9635-f249495fab53	2025-10-29 18:40:29.227728+00	2025-10-29 18:40:29.227728+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
bbe65758-7724-4034-b134-1e95c65c9a00	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-29 18:40:33.886308+00	2025-10-29 18:40:33.886308+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
4ab7df88-e436-4990-8189-cbf383612e2e	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:23:44.103837+00	2025-10-30 19:23:44.103837+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
cbd43f03-1b50-4294-9349-4770aeda92a9	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:23:55.644708+00	2025-10-30 19:23:55.644708+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
6d2f6ff6-2307-49c4-8905-45de42eb4f49	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 18:08:25.18306+00	2025-10-30 19:24:06.941883+00	\N	aal1	\N	2025-10-30 19:24:06.941812	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
8e1f43cd-1ab9-4dee-882a-382456a13768	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:24:08.863942+00	2025-10-30 19:24:08.863942+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
a638648d-e5dd-403a-aa28-b902021e29a4	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:27:15.616354+00	2025-10-30 19:27:15.616354+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
981042af-b8cc-4f7b-9195-85f8881cdd4f	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:28:18.475213+00	2025-10-30 19:28:18.475213+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
5dae6fbf-c0d2-40a4-b34c-6e26de2c7bc5	e948658d-d838-4191-9a87-5227fadb66c4	2025-10-23 23:24:52.656235+00	2025-10-23 23:24:52.656235+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
12e26a0a-0cd6-4cdc-b44d-8d26fc168e8f	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 14:19:59.056906+00	2025-10-30 17:50:11.912363+00	\N	aal1	\N	2025-10-30 17:50:11.912269	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
9d6dc48f-aa39-4dcf-a004-7518023df439	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 17:50:44.21705+00	2025-10-30 17:50:44.21705+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
5e1f1aa6-ac1b-48ff-8283-12d8d693006c	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 18:27:42.439657+00	2025-10-30 18:27:42.439657+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
15c92b9d-3892-4c7e-adfd-c623284843f1	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 18:27:55.468774+00	2025-10-30 18:27:55.468774+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
0accf25a-dee3-4e1c-b40c-d1b31f464cf7	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 18:28:55.618203+00	2025-10-30 18:28:55.618203+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
c082ef85-5212-45ba-ac33-e20af96ff8e7	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:25:55.748643+00	2025-10-30 19:25:55.748643+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
eabb57f7-14e6-40dc-9dfb-db6b99bd8fe4	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 19:56:54.886393+00	2025-10-30 19:56:54.886393+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
06668ed7-0942-444e-baed-d0fdff6aecf0	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:00:59.288268+00	2025-10-30 20:00:59.288268+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
c5d3b39c-73bf-4b39-be5e-9f586de2649c	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:01:03.926465+00	2025-10-30 20:01:03.926465+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
61103490-2935-4872-81e7-a2b440723c3b	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:09:11.004436+00	2025-10-30 20:09:11.004436+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
ea35277b-7a0c-42d3-9a97-04770a3ef1f7	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	2025-10-30 20:09:30.589912+00	2025-10-30 20:09:30.589912+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	179.105.255.135	\N	\N
\.


--
-- TOC entry 4385 (class 0 OID 16843)
-- Dependencies: 349
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4384 (class 0 OID 16834)
-- Dependencies: 348
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- TOC entry 4373 (class 0 OID 16495)
-- Dependencies: 331
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	e948658d-d838-4191-9a87-5227fadb66c4	authenticated	authenticated	flboff@gmail.com	$2a$10$UnDcI/sQm4Shya4wHkOz9O2nHt0R.sj0IRhbfzL04nLEo6M.IF4rW	2025-10-23 18:40:27.562858+00	\N		\N		\N			\N	2025-10-29 18:40:33.886017+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-10-23 18:40:27.509682+00	2025-10-29 18:40:33.889618+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0d4f5c2b-ec80-4b9f-9416-a4385542065b	authenticated	authenticated	luisfboff@gmail.com	$2a$06$DNHdLfT3zndtqsTxRDCN/O2OavunYodAs6HWmXoSDOJDt14rwGRlO	2025-10-29 00:30:44.731182+00	\N		\N		\N			\N	2025-10-30 14:18:15.029309+00	{"provider": "email", "providers": ["email"]}	{"client_id": "6feacdc8-1046-49c5-b975-c557512be16a", "full_name": "Client de Teste"}	\N	2025-10-29 00:30:44.731182+00	2025-10-30 14:18:15.039279+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	278ba721-ce36-4b97-9635-f249495fab53	authenticated	authenticated	000264770@ufrgs.br	$2a$10$4FkTJZoLay9hTPHnEMdZlu4xoXXwwe.hMoxr0ZpT6nTviyPJGrgV2	2025-10-29 13:06:23.581559+00	\N		\N		\N			\N	2025-10-29 18:40:29.227639+00	{"provider": "email", "providers": ["email"]}	{"client_id": "d6ab03a7-0578-4302-bb81-6fb6c6ae7b21", "full_name": "luis fernando boff", "email_verified": true}	\N	2025-10-29 13:06:23.551153+00	2025-10-29 18:40:29.229389+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0b5a981d-cb31-431e-9a3b-d99ed89ec01d	authenticated	authenticated	luisfboff@hotmail.com	$2a$06$kk0COw5jZxss6ji.7esm7OlSfBJLKIhT/xP9N9evwv5jJqjCzQ8je	2025-10-28 23:32:38.774134+00	\N		\N		\N			\N	2025-10-30 20:09:30.589837+00	{"provider": "email", "providers": ["email"]}	{"client_id": "b21b314f-c49a-467d-94b3-a21ed4412227", "full_name": "Luis Fernando Boff"}	\N	2025-10-28 23:32:38.774134+00	2025-10-30 20:09:30.592199+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- TOC entry 4446 (class 0 OID 0)
-- Dependencies: 332
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 154, true);


--
-- TOC entry 4135 (class 2606 OID 16829)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 4107 (class 2606 OID 16531)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 16935)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4113 (class 2606 OID 16953)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 4115 (class 2606 OID 16963)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 4105 (class 2606 OID 16524)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 4137 (class 2606 OID 16822)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 4133 (class 2606 OID 16810)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4125 (class 2606 OID 17003)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 4127 (class 2606 OID 16797)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 4171 (class 2606 OID 17062)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 4173 (class 2606 OID 17060)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 4175 (class 2606 OID 17058)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4168 (class 2606 OID 17022)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4179 (class 2606 OID 17084)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4181 (class 2606 OID 17086)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 4162 (class 2606 OID 16988)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4099 (class 2606 OID 16514)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4102 (class 2606 OID 16740)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4147 (class 2606 OID 16869)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 4149 (class 2606 OID 16867)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4154 (class 2606 OID 16883)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4110 (class 2606 OID 16537)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4120 (class 2606 OID 16761)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4144 (class 2606 OID 16850)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 4139 (class 2606 OID 16841)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4092 (class 2606 OID 16923)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4094 (class 2606 OID 16501)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4108 (class 1259 OID 16532)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 4082 (class 1259 OID 16750)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4083 (class 1259 OID 16752)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4084 (class 1259 OID 16753)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4123 (class 1259 OID 16831)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 4156 (class 1259 OID 16939)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 4111 (class 1259 OID 16919)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 4447 (class 0 OID 0)
-- Dependencies: 4111
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 4116 (class 1259 OID 16747)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 4159 (class 1259 OID 16936)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4160 (class 1259 OID 16937)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 4131 (class 1259 OID 16942)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 4128 (class 1259 OID 16803)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 4129 (class 1259 OID 16948)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 4169 (class 1259 OID 17073)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 4166 (class 1259 OID 17026)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4176 (class 1259 OID 17099)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4177 (class 1259 OID 17097)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4182 (class 1259 OID 17098)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 4163 (class 1259 OID 16995)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 4164 (class 1259 OID 16994)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 4165 (class 1259 OID 16996)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 4085 (class 1259 OID 16754)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4086 (class 1259 OID 16751)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4095 (class 1259 OID 16515)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 4096 (class 1259 OID 16516)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 4097 (class 1259 OID 16746)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 4100 (class 1259 OID 16833)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 4103 (class 1259 OID 16938)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 4150 (class 1259 OID 16875)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 4151 (class 1259 OID 16940)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 4152 (class 1259 OID 16890)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 4155 (class 1259 OID 16889)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 4117 (class 1259 OID 16941)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 4118 (class 1259 OID 17111)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 4121 (class 1259 OID 16832)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 4142 (class 1259 OID 16857)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 4145 (class 1259 OID 16856)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 4140 (class 1259 OID 16842)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 4141 (class 1259 OID 17004)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 4130 (class 1259 OID 17001)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 4122 (class 1259 OID 16830)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 4087 (class 1259 OID 16910)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 4448 (class 0 OID 0)
-- Dependencies: 4087
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 4088 (class 1259 OID 16748)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 4089 (class 1259 OID 16505)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 4090 (class 1259 OID 16965)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4184 (class 2606 OID 16734)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4189 (class 2606 OID 16823)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4188 (class 2606 OID 16811)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4187 (class 2606 OID 16798)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4195 (class 2606 OID 17063)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4196 (class 2606 OID 17068)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 17092)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4198 (class 2606 OID 17087)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4194 (class 2606 OID 16989)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4183 (class 2606 OID 16767)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4191 (class 2606 OID 16870)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4192 (class 2606 OID 16943)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4193 (class 2606 OID 16884)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4185 (class 2606 OID 17106)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4186 (class 2606 OID 16762)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4190 (class 2606 OID 16851)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4354 (class 0 OID 16525)
-- Dependencies: 335
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4365 (class 0 OID 16929)
-- Dependencies: 352
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4356 (class 0 OID 16727)
-- Dependencies: 343
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4353 (class 0 OID 16518)
-- Dependencies: 334
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4360 (class 0 OID 16816)
-- Dependencies: 347
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4359 (class 0 OID 16804)
-- Dependencies: 346
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4358 (class 0 OID 16791)
-- Dependencies: 345
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4366 (class 0 OID 16979)
-- Dependencies: 353
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4352 (class 0 OID 16507)
-- Dependencies: 333
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4363 (class 0 OID 16858)
-- Dependencies: 350
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4364 (class 0 OID 16876)
-- Dependencies: 351
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4355 (class 0 OID 16533)
-- Dependencies: 336
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4357 (class 0 OID 16757)
-- Dependencies: 344
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4362 (class 0 OID 16843)
-- Dependencies: 349
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4361 (class 0 OID 16834)
-- Dependencies: 348
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4351 (class 0 OID 16495)
-- Dependencies: 331
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 35
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 517
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 536
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 425
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 332
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- TOC entry 2825 (class 826 OID 16603)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- TOC entry 2826 (class 826 OID 16604)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- TOC entry 2824 (class 826 OID 16602)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


-- Completed on 2025-10-30 17:54:19

--
-- PostgreSQL database dump complete
--

\unrestrict 0HIbrwxkdwcfdEpb289kKFZK1DPNVSrWd5GUcfZU8hgukEpzPl0uGbTE99ohCna

